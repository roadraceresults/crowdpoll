# Research results — SEPARATE SERVERS

Research into whether the CrowdPoll web application should be split into a small number of
independent services, with a vote-receiving service in mind, under the stated priority that a
cast vote is never lost. Based only on `research-requirements-SEPARATE-SERVERS.md` and the
current implementation (`src/`, `.do/app.yaml`, the test suite).

Sections: §1 what runs today and where a vote can be lost; §2 the candidate splits; §3 what
"never lose a vote" actually needs (mostly not a split); §4 performance, reliability and cost
compared; §5 recommendations; §6 assumptions to confirm.

---

## 1. Today: one component doing four jobs

### 1.1 The deployment

`.do/app.yaml` declares one App Platform component, `web` (dedicated 1 vCPU / 2 GiB, CPU
autoscaled 4–12 instances), plus three managed services: PostgreSQL, Valkey, OpenSearch, and
Spaces + CDN for TRENDING and assets. Every instance of `web` runs the same process
(`src/server.ts`), which does four different kinds of work:

| Job | What it is | Where in the code | Scales with |
|---|---|---|---|
| **A. Request serving** | pages, tabs, search, Live Results, bookmarks, admin, auth | the Express app | users |
| **B. Vote ingest** | validate from the cache → count (`HINCRBY`) → enqueue (`XADD`) → respond | `src/votes/votePath.ts`, mounted on every instance | votes/s |
| **C. Vote persistence** | the consumer-group reader that turns queued votes into `votes`, `vote_history`, `user_polls` rows in batches of 500 | `src/votes/consumer.ts`, **started on every instance** | votes/s, PostgreSQL write capacity |
| **D. Background sweeps** | approval screening (external API, up to 10 s per call), schedule checks, counter flush (2 s), TRENDING recompute (60 s), search outbox drain (15 s), stale-edit, daily bookmark removal, daily reconcile, the budget controller (1 s) | `src/polls/sweeps.ts`, **scheduled on every instance**, one instance wins each tick through a PostgreSQL advisory lock | polls, not users |

Jobs C and D are already written as separable units: `server.ts` starts them with two calls
(`context.consumer.start()`, `startSweeps(...)`) after the HTTP app is built, and nothing in the
request path depends on the same process running them. That is the main finding of §1: the code
is already shaped for a split; only the deployment isn't.

### 1.2 Where a cast vote can be lost today

The durability chain of a vote:

```
browser ──POST──▶ web instance ──HINCRBY cnt:<pid>──▶ Valkey ──XADD votes──▶ Valkey stream
                                                                                  │
                    (response "recorded"/"queued" is sent here) ◀─────────────────┘
                                                                                  │
                          consumer (any instance) ──XREADGROUP──▶ batch INSERT ──▶ PostgreSQL ──XACK
```

The vote is acknowledged to the user after `XADD`. Between that acknowledgement and the
PostgreSQL row, the only copy is the Valkey stream entry. Walking the chain:

| # | Failure | What happens now | Vote lost? |
|---|---|---|---|
| L1 | Instance sheds (overloaded, or **Valkey unreachable** — `shedding.ts` sheds every dynamic kind including `vote` while the cache is disconnected; confirmed by `tests/cache-disconnected.test.ts`) | `503 busy`; `voteClient.js` retries **once** after `retryAfterMs`; a second refusal is shown to the user as "try again" | **Yes, if the user does not try again** — the vote never left the browser |
| L2 | Instance dies between `HINCRBY` and `XADD` | counter incremented, no entry; no response reaches the browser | No — the browser sees a network error; the tally is off by one until the daily reconcile |
| L3 | Valkey node fails with unconsumed entries | Managed Valkey is in-memory; the loss window is the entries not yet written by the consumer (≈ the consumer lag, normally under 1 s) | **Yes — the acknowledged votes in that window**; the prior research accepted this window |
| L4 | Valkey **evicts** the stream under memory pressure | depends on the cluster's eviction policy; a stream is an ordinary key to the evictor | **Yes, silently**, if the policy is not `noeviction` — worth ruling out (§3) |
| L5 | PostgreSQL unavailable or the batch insert keeps failing | consumer logs and retries every 500 ms; entries stay pending and are reclaimed by `XAUTOCLAIM`; the backlog grows in Valkey memory (≈ 300 bytes/vote: 1M votes ≈ 300 MB of the 2 GiB) | No, until L3/L4 applies to the backlog |
| L6 | Deploy / autoscale-down / SIGTERM | `consumer.stop()` finishes and acknowledges the batch in hand (`termination_grace_period_seconds: 30`) | No |
| L7 | All 4–12 instances restart at once (a deploy replaces them in rolling fashion; a crash-loop would not) | no consumer runs until one instance is up; the stream holds the backlog | No, subject to L3/L4 |

Conclusion: the losses that exist (L1, L3, L4) are in **the browser** and **in Valkey**, not in
the process boundary. A separate vote server changes none of them by itself. That shapes the
recommendation: split where it buys isolation and independent scaling (§2), and close L1/L3/L4
directly (§3).

---

## 2. Candidate splits

App Platform offers three component types that matter here: **services** (public HTTP, path
routed — one app can expose several services under one domain by path prefix), **workers**
(the same runtime and pricing, no public HTTP, no health-check endpoint required) and **jobs**
(run at deploy events; there is no scheduler, so periodic work stays in a long-running
component). Components of one app share the same managed databases and the same environment
variable bindings; the same repository and build can back several components, each with its own
`run_command`. (The exact internal-networking and routing mechanics should be verified against
the current App Platform documentation before the spec is written — §6.)

### S1 — A **vote-ingest service** (the one asked about)

A second HTTP service receiving votes: `POST /api/vote/:pid` (a prefix of its own, because App
Platform routes by path prefix and `/api/polls/:pid/vote` shares `/api/polls` with bookmarks and
the admin routes), running the existing `castVote()` and nothing else — no pages, no search, no
tabs, no sweeps.

*What it needs to do its job:* the session (cookie → session cache → PostgreSQL on a miss), the
poll projection, the rosters, the counters, the per-session floor and the per-address cap — all
already cache-backed, all already independent of the rest of the app. The route would move
unchanged; `voteClient.js` would post to the new path. The cookie is host-only and
`SameSite=Lax`, so the vote service must live under the **same host by path routing**, not on a
separate hostname (a cross-origin POST would not carry the session cookie).

*What it buys:*
- **Isolation.** A vote is never queued behind a page load, a search or an admin list on the
  same event loop, and never shed because of *their* load. Today shedding sheds votes last
  (`SHED_ORDER`), but an instance whose loop is blocked (as in FIX009, a 250k-row admin list)
  delays everything on it, votes included.
- **Independent scaling and a stable footprint.** Vote instances scale on vote rate, page
  instances on page rate; a surge of viewers (TRENDING is CDN-served, so viewers are cheap
  anyway) does not resize the vote tier. Two small instances comfortably ingest thousands of
  votes per second — the path is ≈ 6–8 Valkey round trips and no PostgreSQL on the hot path.
- **A smaller blast radius for deploys**: a change to pages cannot break voting.

*What it does not buy:* any of L1/L3/L4. The vote is still acknowledged at `XADD` into the same
Valkey.

*Costs:* two more dedicated instances (≈ $50–60/month at the `web` size; the smallest dedicated
size would do), one more health check, a route change in the API contract, and the rate-limit
mirror in the browser unchanged (floors are keyed in Valkey, not per instance). Complexity: low —
`createApp` would take a role flag and mount only the vote router.

**Verdict: worthwhile, but second in line.** It is the split that makes the *ingest* path
predictable; it should follow, not precede, the two that remove work from the request path.

### S2 — A **vote-writer worker** (the consumer)

Move job C to a worker component: it reads the stream and writes PostgreSQL, nothing else. Two
instances (the consumer group already tolerates several readers; `XAUTOCLAIM` covers a dead
one). `web` instances stop starting the consumer.

*What it buys:*
- The drain rate stops depending on how many `web` instances the CPU autoscaler happens to
  keep: today the consumer count is 4–12 and every one of them competes for the same batches
  and holds a PostgreSQL connection pool for it.
- A `web` deploy or scale-down never interrupts the drain; a writer deploy never interrupts
  page serving.
- PostgreSQL write pressure (the only expensive part of a vote) is generated by a fixed, small
  set of known processes — easier to size the pool, easier to read in the database metrics.
- One place to watch for L5: consumer lag and stream length are the writer's own health.

*Costs:* ≈ $50–60/month for two instances (one is enough for the load; two for failover).
Complexity: trivial — `run_command` with a role flag; the code path already exists.

**Verdict: recommended.**

### S3 — A **background worker** (the sweeps)

Move job D to the same worker component as S2 (or its own). The sweeps are already serialised
by advisory locks, so running them on two worker instances instead of twelve `web` instances
changes nothing about correctness and removes eleven lock attempts per tick.

*What it buys:*
- The heavy periodic work — TRENDING recompute over the whole store, the daily reconcile, the
  daily bookmark removal, approval screening with a 10 s external call — leaves the request
  path entirely. Every one of these can stall an event loop for long enough to trip the
  shedding threshold (100 ms p50 lag), which is exactly the failure FIX009 reproduced by other
  means. Votes (S1) and pages stop paying for it.
- The budget controller and counter flush run on a process that is not itself under HTTP load,
  so their timing is steadier.

*Costs:* none beyond S2's instances if co-located. One rule to add: the worker must **not**
register itself in the `instance:*` registry the budget controller counts (effective budget =
1,250 × live instances), or the budget will be overstated by the number of workers — a one-line
condition on the heartbeat.

**Verdict: recommended, together with S2 as one worker component.**

### S4 — An **admin service**

Pages and API under `/admin` and `/api/admin` on their own service. Admin traffic is a handful
of people; the value would only be isolating heavy admin queries from voters. S3 removes the
sweeps and FIX009 capped the list; what remains of admin load is small. A separate admin
service would also duplicate the session and page machinery for little.

**Verdict: not now.** Revisit only if admin gains bulk operations or exports at scale.

### S5 — Further decomposition (search service, Live Results service, TRENDING publisher)

Search is already delegated to OpenSearch with a PostgreSQL fallback; Live Results is a
cache-only delta served at high rate and benefits from being on the same instances as the
cache clients; the TRENDING publisher is a sweep (S3). Splitting these adds hops, health checks
and deploy coordination without removing a bottleneck.

**Verdict: no.**

---

## 3. What "never lose a vote" actually needs

These changes close L1, L3 and L4 from §1.2. None depends on a split; all are cheaper than one.

| # | Change | Closes | Cost |
|---|---|---|---|
| D1 | **Browser: a cast vote is held until acknowledged.** `voteClient.js` retries once; make it retry with backoff (2 s, 4 s, 8 s… capped) until a `200`, a definitive refusal (`4xx` other than `429`), or the page is left — and keep the card in its "sending" state meanwhile. A vote the user pressed Submit on then survives an instance shed, a rolling deploy and a short Valkey outage without the user doing anything. | L1 | small; browser only |
| D2 | **A direct-to-PostgreSQL path while Valkey is unreachable.** Today the instance sheds votes when the cache is down (spec FR at "MUST NOT fall back to the data store for floors"). For votes specifically, the durable store *is* the fallback: validate against PostgreSQL, insert the row synchronously, respond `recorded`; counters and the `voted:` sets rebuild when Valkey returns (the reconcile path already exists). Rate: bounded by the per-address cap and `ENV_MIN_VOTE_INTERVAL`, both of which also need a cache — so the fallback keeps only the vote floor, enforced per instance in memory for the duration. | L1 (the Valkey-outage case) | moderate; a second, rarely-run branch of `castVote` and a spec change |
| D3 | **Valkey settings and alerts.** Set the cluster's eviction policy to `noeviction` (the stream must never be a cache victim); confirm what persistence the managed offering provides (RDB snapshots, replication, failover) and record the residual loss window; alert on stream length (`XLEN votes`) and consumer lag (`queue:lag`) so L5 is seen before the backlog matters. | L4; bounds L3 | none / operator time |
| D4 | **Write-through on `XADD` failure.** If `XADD` itself throws after the counters were incremented, write the row directly (D2's branch) rather than fail the request. | the sliver of L2 where the instance survives but the stream write fails | small |
| D5 | **Two consumers at all times** — S2's two worker instances, or, without S2, a minimum `web` count of 2 (already 4). | L7 | none |
| D6 | **Zero-loss queue** — DO Managed Kafka (replicated log, ≈ $150+/month) instead of Valkey Streams. | L3 entirely | ≈ $150+/month plus a client and operations; only if the accepted loss window must be zero |

With D1–D5 the remaining exposure is L3: acknowledged votes in the consumer's lag window (≈ 1 s
at steady state) on a Valkey node failure — corrected to at most a missing row, never a wrong
tally, by the daily reconcile; and reduced further by keeping the lag low, which S2 does.
Whether that window must be zero (D6) is the one question this research cannot settle from the
requirements — §6.

---

## 4. Performance, reliability and cost compared

Load target from the current design: 100k concurrent users, 1M polls; the fleet's request
budget is 1,250 dynamic requests/s per live instance. Instance cost taken as ≈ $25–29/month for
the current dedicated size (verify).

| | Monolith (today) | + S2/S3 worker (2 instances) | + S1 vote service (2 instances) | + D6 Kafka |
|---|---|---|---|---|
| **Vote ingest latency** | ≈ 1–2 ms when the instance is idle; unbounded behind a blocked event loop; shed last but shed | unchanged ingest, but the loop is no longer blocked by sweeps | ≈ 1–2 ms, and only votes on that loop | unchanged |
| **Drain rate / lag** | depends on how many `web` instances exist and how busy they are | fixed, watched, independent of `web` scaling | as S2 | as S2 |
| **Loss window** | L1 + L3 + L4 | L3 + L4 (L1 with D1/D2 closed) | same as S2 | none on a single broker failure |
| **Deploy impact on votes** | every deploy restarts ingest and consumer on every instance | `web` deploys leave the drain alone | vote ingest and pages deploy separately | — |
| **Autoscaling** | one metric (CPU) sizes pages, votes and sweeps together | pages scale alone; workers fixed | pages, votes, workers each sized to their own load | — |
| **Operational clarity** | one log stream with four jobs interleaved | worker logs = votes written, sweeps; web logs = requests | + vote logs alone | + a Kafka cluster to run |
| **Extra monthly cost** | $0 | ≈ +$50–60 | ≈ +$50–60 more | ≈ +$150+ more |
| **Code change** | — | role flag in `server.ts`; heartbeat rule | role flag; route `/api/vote/:pid`; `voteClient.js`; OpenAPI | client library; consumer rewrite |
| **Development / tests** | one process | `ENV_ROLE=all` (default) keeps one process locally and in tests | same | a Kafka in tests |

Cost savings are possible too, not only additions: with sweeps and the consumer off `web`, the
`web` autoscaler sees only request load; at quiet times it can sit at its minimum with less CPU
per instance, and the minimum itself could be revisited (4 is set for the request budget, not
for the sweeps). Whether that offsets the worker's ≈ $50–60 depends on the traffic profile;
at the load target it roughly does, at low traffic it does not.

---

## 5. Recommendations

1. **Yes, split — into two components, not many.** Add a **`workers`** component to the app
   (2 dedicated instances, no HTTP) running the vote consumer and every sweep (S2 + S3). `web`
   instances serve requests and ingest votes only. Mechanism: one process, one image, a role
   variable `ENV_ROLE` = `web` | `workers` | `all` (default `all`, so development and the test
   suite keep one process); `server.ts` starts the HTTP listener for `web`/`all` and the
   consumer + sweeps for `workers`/`all`; the budget heartbeat registers `web` instances only.
   This is the split with the best ratio of benefit (request-path isolation, a fixed and
   observable drain, deploy independence) to cost (≈ $50–60/month, a few dozen lines).

2. **Make the vote durable end to end before making it a service** — D1 (browser holds the
   vote until acknowledged), D2 (direct PostgreSQL path while Valkey is unreachable), D3
   (`noeviction`, persistence confirmed, stream-length and lag alerts), D4 (write-through on a
   failed `XADD`). These, not a process boundary, are what turn "a vote is never lost to load"
   into "a cast vote is never lost".

3. **Then, if measured, a vote-ingest service (S1)** under `/api/vote/:pid` on the same host,
   two instances. Trigger: any observed shedding of votes on `web` (`/healthz` reports shed
   counts per kind), or vote p99 latency above ≈ 50 ms while pages are busy. Until then the
   ingest path is cheap enough that its own service is insurance rather than relief.

4. **Keep admin, search, Live Results and TRENDING where they are** (S4, S5 rejected).

5. **Kafka only if the accepted loss window must be zero** (D6) — a requirements decision, not
   an engineering one; see §6.

What the spec that follows should contain, in order: the `ENV_ROLE` contract and the `workers`
component in `.do/app.yaml`; the heartbeat rule; D1–D4 with their spec-level statements (the
one about not falling back to the data store gains a vote-shaped exception); alerts on stream
length and lag; and, gated on the trigger in (3), the vote route and service.

---

## 6. Assumptions to confirm (clarifications)

The research is complete under these assumptions; a different answer changes the emphasis, not
the structure.

1. **Accepted loss window.** "Never lose a vote" is read as: a vote the user submitted is never
   lost to load, outage of one component, or a deploy, and the residual exposure on a Valkey
   node failure is at most the consumer's lag window (≈ 1 s), corrected by reconcile to a
   missing row rather than a wrong tally. If the requirement is *zero* loss on any single
   failure, D6 (Managed Kafka, ≈ $150+/month) moves from "only if" to required.
2. **Budget.** An extra ≈ $50–60/month for the worker component (and the same again for a vote
   service later) is acceptable.
3. **App Platform mechanics to verify at spec time**: path-prefix routing of several services
   under one domain; workers sharing the app's database bindings; whether the managed Valkey
   plan allows `noeviction` and what persistence it guarantees. None of these is a blocker for
   the recommendation; each is a detail the spec must pin down.
4. **Scope of "service".** Components of one App Platform app (shared build, shared bindings,
   internal routing) — not separately deployed applications. If truly independent applications
   were meant (separate repos, separate deploy pipelines), S1's cookie/same-host constraint and
   the shared-secret bindings need their own treatment.
