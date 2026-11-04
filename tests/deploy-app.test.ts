import { describe, expect, it } from "vitest";
import { run } from "../devScripts/deploy-app.js";

const TOKEN = "dop_v1_secret-token-value";
const APP_ID = "app-123";
const DEPLOYMENT_ID = "dep-456";

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

/** A stubbed API: the app list, the created deployment, then one deployment state per poll. */
function harness(options: {
  apps?: { id: string; spec: { name: string } }[];
  phases?: { phase: string; progress?: unknown }[];
  failOn?: { method: string; status: number; message: string };
}) {
  const calls: Call[] = [];
  const lines: string[] = [];
  const phases = [...(options.phases ?? [])];
  let clock = 0;
  const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  const fetchStub = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ method, url, headers: init?.headers as Record<string, string>, body: init?.body as string | undefined });
    if (options.failOn?.method === method) return respond(options.failOn.status, { message: options.failOn.message });
    if (url.endsWith("/apps?per_page=200")) {
      return respond(200, { apps: options.apps ?? [{ id: APP_ID, spec: { name: "crowdpoll" } }] });
    }
    if (method === "POST") return respond(200, { deployment: { id: DEPLOYMENT_ID, phase: "PENDING_BUILD" } });
    const next = phases.length > 1 ? phases.shift()! : phases[0];
    return respond(200, { deployment: { id: DEPLOYMENT_ID, ...next } });
  }) as typeof fetch;
  const deps = {
    fetch: fetchStub,
    log: (line: string) => lines.push(line),
    sleep: async (ms: number) => {
      clock += ms;
    },
    now: () => clock
  };
  return { calls, lines, deps, elapsed: () => clock };
}

describe("deploy command", () => {
  it("stops with exit 2 and names DIGITALOCEAN_TOKEN when it is missing, before any request", async () => {
    const { calls, lines, deps } = harness({});
    expect(await run([], {}, deps)).toBe(2);
    expect(lines.join("\n")).toContain("DIGITALOCEAN_TOKEN");
    expect(calls).toHaveLength(0);
  });

  it("stops with exit 2 on an unknown argument", async () => {
    const { calls, deps } = harness({});
    expect(await run(["--force"], { DIGITALOCEAN_TOKEN: TOKEN }, deps)).toBe(2);
    expect(await run(["--app"], { DIGITALOCEAN_TOKEN: TOKEN }, deps)).toBe(2);
    expect(calls).toHaveLength(0);
  });

  it("starts a deployment of crowdpoll and follows it to ACTIVE, printing each phase once", async () => {
    const { calls, lines, deps } = harness({
      phases: [
        { phase: "PENDING_BUILD" },
        { phase: "BUILDING" },
        { phase: "BUILDING" },
        { phase: "DEPLOYING" },
        { phase: "ACTIVE" }
      ]
    });
    expect(await run([], { DIGITALOCEAN_TOKEN: TOKEN }, deps)).toBe(0);
    expect(lines).toEqual([
      `Deploying app crowdpoll (${APP_ID})`,
      `Deployment ${DEPLOYMENT_ID} started`,
      "Phase: PENDING_BUILD",
      "Phase: BUILDING",
      "Phase: DEPLOYING",
      `Deployment ${DEPLOYMENT_ID} is ACTIVE`
    ]);
    const post = calls.find((call) => call.method === "POST")!;
    expect(post.url).toBe(`https://api.digitalocean.com/v2/apps/${APP_ID}/deployments`);
    expect(JSON.parse(post.body!)).toEqual({ force_build: false });
    for (const call of calls) expect(call.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(calls.at(-1)!.url).toBe(`https://api.digitalocean.com/v2/apps/${APP_ID}/deployments/${DEPLOYMENT_ID}`);
  });

  it("finds the app named by --app, and exits 1 when there is none", async () => {
    const apps = [
      { id: "other", spec: { name: "crowdpoll" } },
      { id: "staging-id", spec: { name: "staging" } }
    ];
    const found = harness({ apps, phases: [{ phase: "ACTIVE" }] });
    expect(await run(["--app", "staging"], { DIGITALOCEAN_TOKEN: TOKEN }, found.deps)).toBe(0);
    expect(found.lines[0]).toBe("Deploying app staging (staging-id)");

    const missing = harness({ apps });
    expect(await run(["--app", "nope"], { DIGITALOCEAN_TOKEN: TOKEN }, missing.deps)).toBe(1);
    expect(missing.lines.at(-1)).toBe("No app named nope");
    expect(missing.calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("exits 1 naming the failed step when the deployment ends in ERROR", async () => {
    const progress = {
      steps: [
        { name: "build", status: "ERROR", steps: [{ name: "build web", status: "ERROR" }] },
        { name: "deploy", status: "PENDING" }
      ]
    };
    const { lines, deps } = harness({ phases: [{ phase: "BUILDING" }, { phase: "ERROR", progress }] });
    expect(await run([], { DIGITALOCEAN_TOKEN: TOKEN }, deps)).toBe(1);
    expect(lines.at(-1)).toBe(`Deployment ${DEPLOYMENT_ID} ended in ERROR at step build web`);
  });

  it.each(["CANCELED", "SUPERSEDED"])("exits 1 when the deployment ends %s", async (phase) => {
    const { lines, deps } = harness({ phases: [{ phase }] });
    expect(await run([], { DIGITALOCEAN_TOKEN: TOKEN }, deps)).toBe(1);
    expect(lines.at(-1)).toBe(`Deployment ${DEPLOYMENT_ID} ended in ${phase}`);
  });

  it("exits 1 with the status and the API's message on an HTTP error", async () => {
    const { lines, deps } = harness({ failOn: { method: "POST", status: 403, message: "You are not authorized" } });
    expect(await run([], { DIGITALOCEAN_TOKEN: TOKEN }, deps)).toBe(1);
    expect(lines.at(-1)).toMatch(/^HTTP 403 .*: You are not authorized$/);
  });

  it("gives up after 30 minutes, polling every 10 s, and says the deployment carries on", async () => {
    const { calls, lines, deps, elapsed } = harness({ phases: [{ phase: "BUILDING" }] });
    expect(await run([], { DIGITALOCEAN_TOKEN: TOKEN }, deps)).toBe(1);
    expect(lines.at(-1)).toBe(`Deployment ${DEPLOYMENT_ID} still BUILDING after 30 minutes; it carries on in App Platform`);
    expect(elapsed()).toBeLessThanOrEqual(30 * 60_000);
    expect(elapsed()).toBeGreaterThan(29 * 60_000);
    expect(calls.filter((call) => call.url.endsWith(DEPLOYMENT_ID))).toHaveLength(elapsed() / 10_000 + 1);
  });

  it("never prints the token", async () => {
    const runs = [
      harness({ phases: [{ phase: "ACTIVE" }] }),
      harness({ failOn: { method: "GET", status: 401, message: "Unable to authenticate you" } }),
      harness({ phases: [{ phase: "ERROR" }] })
    ];
    for (const { deps, lines } of runs) {
      await run([], { DIGITALOCEAN_TOKEN: TOKEN }, deps);
      expect(lines.join("\n")).not.toContain(TOKEN);
    }
  });
});
