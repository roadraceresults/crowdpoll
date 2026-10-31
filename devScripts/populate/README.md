# Seeding a load-test database

`seed-polls.ts` fills a PostgreSQL database with public polls and votes at the
load target's scale so the search, TRENDING and load tests run against realistic
data. It writes votes through the same batch insert the vote consumer uses, then
reconciles every poll's counters from its vote rows.

```
npx tsx devScripts/populate/seed-polls.ts --polls 250000 --skew
```

| Option | Default | Meaning |
|---|---|---|
| `--polls N` | 250000 | polls to create (public; mostly OPEN, some CLOSED and WAITING TO OPEN) |
| `--votes N` | min(2,000,000, 8 × polls) | votes to cast |
| `--users N` | 50000 | distinct voter addresses (`seedN@example.com`) |
| `--skew` | off | Zipf-skew the votes so a few hundred polls receive most of them |

The script needs the server's `ENV_*` variables (`ENV_DATABASE_URL` and
`ENV_BETTER_AUTH_SECRET` at least) and runs the migrations first, so it works
against an empty database. Seeding 250,000 polls with two million votes takes a few
minutes on a laptop. Restart the server afterwards so its trending sweep publishes
the seeded listing, and run `npm run reconcile` if counters are ever changed by hand.

# Populating one poll from a data file

`populate-poll.ts` creates one public poll from a JSON file, or refreshes it, and
fills it with simulated votes that replay the file's time series. The dates are
moved so that the latest data point falls on today.

```
npx tsx devScripts/populate/populate-poll.ts polldata/trump_approval_rating_over_time.json
npx tsx devScripts/populate/populate-poll.ts polldata/spain-national-parliament-voting-intention.json
```

| Key | Meaning |
|---|---|
| `poll_creator_email` | an existing account's email; the poll is created in its name |
| `title` | the poll title, at most 50 characters |
| `subtitle` | the poll's subtitle, shown under the title and on the maximized view's line graph, at most 30 characters; `""` for none |
| `choice_a`, `choice_b`, … | the choice labels, ordered by key (`choice_a` … `choice_z`, `choice_aa`, …) |
| `vote_count` | the average number of votes per data point, a whole number of at least 1 |
| `data_points` | `[{ "date": "MM/DD/YY", "choice_a": 41.2, "choice_b": 55.0 }, …]`; a missing choice counts as 0 |

On each data point, about `vote_count` votes (±15%) are cast on that day by voters
`test_1@crowdpolltest.test` upward, numbered from 1 for every data point, split by
the data point's percentages scaled to their sum. A voter who votes again on a later
date changes their vote, so the poll's total stays at about one data point's votes
and the final bars match the latest data point.

A rerun finds the creator's newest poll with the same title and keeps its id. It
deletes that poll's earlier simulated votes, history rows and relations, but no one
else's. It keeps the ids of choices whose labels are unchanged, deletes votes for
dropped choices, applies the file's settings and reopens the poll.

The script uses the server's `ENV_*` variables and writes to whatever database
`ENV_DATABASE_URL` names: check the `Target:` line it prints first. The database must
already be migrated. Without `ENV_VALKEY_URL`, a running server keeps its counters in
memory, so restart it to see the new counts. Every input error prints one
`[populate] Error:` line and exits 1 before anything is written.
