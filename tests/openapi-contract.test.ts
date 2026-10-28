/**
 * `postman/openapi.json` generates the docs and client SDKs, so it has to track
 * the routes rather than drift from them. This compares the two directly.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const spec = JSON.parse(readFileSync("postman/openapi.json", "utf8")) as {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
};
const source = readFileSync("src/routes/pollsApi.ts", "utf8");

/** Every poll route the server actually registers, as `METHOD /path`. */
function registeredRoutes(): string[] {
  const out: string[] = [];
  const re = /router\.(get|post|put|patch|delete)\(\s*"([^"]+)"/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    out.push(`${m[1]!.toUpperCase()} ${m[2]!.replace(/:(\w+)/g, "{$1}")}`);
  }
  return out;
}

function documentedRoutes(): string[] {
  return Object.entries(spec.paths).flatMap(([p, ops]) =>
    Object.keys(ops)
      .filter((k) => ["get", "post", "put", "patch", "delete"].includes(k))
      .map((m) => `${m.toUpperCase()} ${p}`)
  );
}

/** Properties of a schema, merged across an `allOf` if it has one. */
function schemaProperties(schema: unknown): Record<string, unknown> {
  const node = schema as { properties?: Record<string, unknown>; allOf?: unknown[] };
  const merged: Record<string, unknown> = { ...(node.properties ?? {}) };
  for (const part of node.allOf ?? []) Object.assign(merged, schemaProperties(part));
  return merged;
}

describe("openapi.json tracks the poll routes", () => {
  it("documents every registered poll route", () => {
    const documented = new Set(documentedRoutes());
    const missing = registeredRoutes().filter((r) => !documented.has(r));
    expect(missing, `undocumented routes: ${missing.join(", ")}`).toEqual([]);
  });

  it("documents the six operations 011 added", () => {
    const documented = new Set(documentedRoutes());
    for (const r of [
      "POST /api/admin/polls/{pid}/edit-session",
      "DELETE /api/admin/polls/{pid}/edit-session",
      "POST /api/admin/polls/{pid}/edit-session/heartbeat",
      "POST /api/admin/polls/{pid}/publish",
      "POST /api/admin/polls/{pid}/rescreen",
      "DELETE /api/admin/polls/{pid}"
    ]) {
      expect(documented.has(r), r).toBe(true);
    }
  });

  it("describes the eight-state model, not the retired one", () => {
    const json = JSON.stringify(spec);
    for (const retired of [
      "ACTIVE-POLL-STATE",
      "PENDING-POLL-STATE",
      "CLOSED-POLL-STATE",
      "ARCHIVED-POLL-STATE"
    ]) {
      expect(json, retired).not.toContain(retired);
    }
    const states = (spec.components.schemas.AdminPollSummary as {
      properties: { pollState: { enum: string[] } };
    }).properties.pollState.enum;
    expect(states).toEqual([
      "INITIALIZED",
      "EDITING",
      "AWAITING APPROVAL",
      "REJECTED",
      "WAITING TO OPEN",
      "OPEN",
      "CLOSED",
      "ARCHIVED"
    ]);
  });

  it("documents no removed-choice or removed-vote marker (SC-014)", () => {
    const json = JSON.stringify(spec);
    expect(json).not.toContain("(removed)");
    const choice = spec.components.schemas.Choice as { properties: Record<string, unknown> };
    expect(Object.keys(choice.properties)).not.toContain("removed");
  });

  it("carries the action booleans the admin list renders from", () => {
    const summary = spec.components.schemas.AdminPollSummary as {
      properties: Record<string, unknown>;
    };
    for (const k of ["canEdit", "canUpdate", "canDelete", "canArchive", "canRescreen", "hasEverBeenVotedOn"]) {
      expect(Object.keys(summary.properties), k).toContain(k);
    }
  });

  it("names only ENV_ settings in its descriptions (SC-013)", () => {
    expect(JSON.stringify(spec)).not.toMatch(/APP_[A-Z]/);
  });
});

/**
 * 012 T085 (FR-054): this feature's guards, following the per-feature pattern 011
 * established. The generic route-coverage test above cannot catch a *schema* that
 * drifts — a removed field lingering in the published contract, or a new one never
 * documented — and openapi.json generates the docs and client SDKs, so drift there
 * ships to consumers.
 */
describe("openapi.json describes the 012 model, not the retired one", () => {
  const json = JSON.stringify(spec);

  it("carries no trace of the two fields 012 collapsed", () => {
    // Their absence is the whole point of the collapse: one setting, no code-to-label
    // map, nothing left to keep in step.
    expect(json).not.toContain("accessMode");
    expect(json).not.toContain("resultsVisibility");
  });

  it("documents the deleted choices route nowhere", () => {
    expect(Object.keys(spec.paths)).not.toContain("/api/admin/polls/{pid}/choices");
  });

  it("enumerates exactly the two poll-visibility values, verbatim", () => {
    const expected = ["Public Poll", "Private Poll"];
    const enums: string[][] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      if (node === null || typeof node !== "object") return;
      const obj = node as Record<string, unknown>;
      if (Array.isArray(obj.enum) && (obj.enum as string[]).includes("Public Poll")) {
        enums.push(obj.enum as string[]);
      }
      Object.values(obj).forEach(walk);
    };
    walk(spec);
    expect(enums.length, "no pollVisibility enum documented").toBeGreaterThan(0);
    // Values are stored and displayed identically, so a drifting enum is a drifting
    // label as well as a drifting contract.
    for (const e of enums) expect(e).toEqual(expected);
  });

  it("documents both new row capabilities alongside the existing five", () => {
    const props = Object.keys(
      (spec.components.schemas.AdminPollSummary as { properties: Record<string, unknown> }).properties
    );
    for (const cap of [
      "canEdit", "canUpdate", "canOpen", "canClose", "canArchive", "canDelete", "canRescreen"
    ]) {
      expect(props, cap).toContain(cap);
    }
  });

  it("documents pollSharingMode and voteAnonymity on the admin schemas only", () => {
    const enumOf = (schema: unknown, name: string): unknown => {
      const props = schemaProperties(schema);
      return (props[name] as { enum?: unknown } | undefined)?.enum;
    };
    for (const schemaName of ["AdminPollDetail", "AdminPollSummary"]) {
      const schema = spec.components.schemas[schemaName];
      expect(enumOf(schema, "pollSharingMode"), schemaName).toEqual(["Anyone With The Link", "Invitation Only"]);
      expect(enumOf(schema, "voteAnonymity"), schemaName).toEqual(["Yes", "No"]);
    }
    const publish = spec.paths["/api/admin/polls/{pid}/publish"] as Record<
      string,
      { requestBody: { content: Record<string, { schema: unknown }> } }
    >;
    const body = publish.post!.requestBody.content["application/json"]!.schema;
    expect(enumOf(body, "pollSharingMode")).toEqual(["Anyone With The Link", "Invitation Only"]);
    expect(enumOf(body, "voteAnonymity")).toEqual(["Yes", "No"]);

    // The card every listing shares says how a private poll is shared (the Live
    // Results button needs it) but never who may see who voted.
    const voterFacing = Object.keys(schemaProperties(spec.components.schemas.Card));
    expect(voterFacing).toContain("pollSharingMode");
    expect(voterFacing).not.toContain("voteAnonymity");
  });

  it("documents isAdmin on the profile, and says it is only a hint", () => {
    const profile = spec.components.schemas.Profile as {
      properties: Record<string, { description?: string }>;
    };
    expect(Object.keys(profile.properties)).toContain("isAdmin");
    // The security posture is part of the contract: a consumer must not read this as
    // an authorization signal.
    expect(profile.properties.isAdmin!.description ?? "").toMatch(/hint/i);
  });

  it("documents permissions on the profile as a string array, and says it is only a hint", () => {
    const profile = spec.components.schemas.Profile as {
      properties: Record<string, { type?: string; items?: { type?: string }; description?: string }>;
    };
    const permissions = profile.properties.permissions!;
    expect(permissions.type).toBe("array");
    expect(permissions.items?.type).toBe("string");
    expect(permissions.description ?? "").toMatch(/hint/i);
  });

  it("documents the grant refusals on the vote, bookmark and Live Results routes", () => {
    const vote = spec.paths["/api/polls/{pid}/vote"] as Record<string, { responses: Record<string, unknown> }>;
    expect(JSON.stringify(vote.post!.responses["403"])).toContain("no-vote-permission");
    const bookmark = spec.paths["/api/polls/{pid}/bookmark"] as Record<string, { responses: Record<string, unknown> }>;
    expect(JSON.stringify(bookmark.post!.responses["403"])).toContain("no-view-permission");
    const live = spec.paths["/api/live/{pid}"] as Record<string, { responses: Record<string, unknown> }>;
    expect(JSON.stringify(live.post!.responses["403"])).toContain("no-view-permission");
  });

  it("documents the POLL_EDITING discriminator on the vote refusal", () => {
    const vote = spec.paths["/api/polls/{pid}/vote"] as Record<string, { responses: Record<string, unknown> }>;
    expect(JSON.stringify(vote.post!.responses["409"])).toContain("POLL_EDITING");
  });
});

/**
 * 017: the tabbed home page, the vote path and the operator surfaces. The generic
 * route check above reads pollsApi.ts only; these name the routes and fields the
 * other routers add so a drifting contract is caught the same way.
 */
describe("openapi.json tracks the 017 surfaces", () => {
  it("documents every tab, search, overlay, trending, live, bookmark, admin-search and health route", () => {
    const documented = new Set(documentedRoutes());
    for (const r of [
      "POST /api/tabs/your-polls/refresh",
      "POST /api/tabs/shared-with-you/refresh",
      "POST /api/tabs/your-votes/refresh",
      "POST /api/tabs/watching/refresh",
      "POST /api/search",
      "POST /api/search/refresh",
      "GET /api/me/polls",
      "GET /api/trending/counts",
      "GET /api/trending/cards",
      "GET /api/trending/newest-counts",
      "GET /api/trending/newest-cards",
      "POST /api/live/refresh",
      "POST /api/live/{pid}",
      "DELETE /api/live/{pid}",
      "POST /api/polls/{pid}/vote",
      "POST /api/polls/{pid}/bookmark",
      "DELETE /api/polls/{pid}/bookmark",
      "GET /api/admin/polls/search",
      "GET /healthz"
    ]) {
      expect(documented.has(r), r).toBe(true);
    }
  });

  it("documents the sign-in confirmation routes and the hidden anti-bot field (production email A1–A6)", () => {
    const documented = new Set(documentedRoutes());
    expect(documented.has("GET /api/auth/link-info")).toBe(true);
    expect(documented.has("POST /api/auth/confirm-signin")).toBe(true);
    for (const route of ["/api/auth/request-login-link", "/api/auth/create-account", "/api/me/email-change"]) {
      const post = spec.paths[route]!.post as {
        requestBody: { content: { "application/json": { schema: { properties: Record<string, unknown> } } } };
      };
      expect(post.requestBody.content["application/json"].schema.properties, route).toHaveProperty("homepage");
    }
    const verify = spec.paths["/api/auth/verify"]!.get as { parameters: Array<{ name: string }> };
    expect(verify.parameters.map((p) => p.name)).toContain("bind");
  });

  it("documents the Newest interval in the config response", () => {
    const config = spec.paths["/api/config"]!.get as {
      responses: { "200": { content: { "application/json": { schema: unknown } } } };
    };
    const props = schemaProperties(config.responses["200"].content["application/json"].schema);
    expect(Object.keys(props)).toContain("newestRecomputeIntervalMs");
  });

  it("no longer documents the retired listing and single-poll fetch", () => {
    expect(spec.paths["/api/polls"]).toBeUndefined();
    expect(spec.paths["/api/polls/{pid}"]).toBeUndefined();
    expect(JSON.stringify(spec)).not.toContain("pollingIntervalMs");
  });

  it("carries the dynamic-request fields and envelopes", () => {
    const json = JSON.stringify(spec);
    for (const field of ["nextRefreshMs", "retryAfterMs", "\"truncated\"", "\"status\""]) expect(json).toContain(field);
    const envelope = schemaProperties(spec.components.schemas.RetryEnvelope);
    expect(Object.keys(envelope)).toEqual(["error", "retryAfterMs", "nextRefreshMs"]);
    const vote = spec.paths["/api/polls/{pid}/vote"] as Record<string, { responses: Record<string, unknown> }>;
    expect(JSON.stringify(vote.post!.responses["200"])).toContain("VoteOutcome");
    expect(Object.keys(vote.post!.responses)).toEqual(expect.arrayContaining(["429", "503"]));
    const outcome = schemaProperties(spec.components.schemas.VoteOutcome);
    expect((outcome.status as { enum: string[] }).enum).toEqual(["recorded", "queued"]);
  });
});
