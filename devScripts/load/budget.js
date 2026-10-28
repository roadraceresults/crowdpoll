import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";
import { BASE_URL, headersFor, jsonOf } from "./common.js";

const nextRefreshSearch = new Trend("next_refresh_ms_search");
const nextRefreshRefresh = new Trend("next_refresh_ms_refresh");
const nextRefreshLive = new Trend("next_refresh_ms_live");
const nextRefreshVote = new Trend("next_refresh_ms_vote");
const searchLatency = new Trend("search_latency_ms", true);
const served = new Rate("served");

const terms = (__ENV.SEARCH_TERMS || "distinctive,poll,distinctve").split(",");

export const options = {
  scenarios: {
    refreshes: { executor: "constant-arrival-rate", rate: 3000, timeUnit: "1s", duration: "3m", preAllocatedVUs: 500, maxVUs: 3000, exec: "refreshes" },
    searches: { executor: "constant-arrival-rate", rate: 400, timeUnit: "1s", duration: "3m", preAllocatedVUs: 100, maxVUs: 800, exec: "searches" },
    votes: { executor: "constant-arrival-rate", rate: 200, timeUnit: "1s", duration: "3m", preAllocatedVUs: 50, maxVUs: 400, exec: "votes" }
  },
  thresholds: {
    search_latency_ms: ["p(95)<1000"],
    served: ["rate>0.5"]
  }
};

export function refreshes() {
  const res = http.post(`${BASE_URL}/api/tabs/favourites/refresh`, JSON.stringify({}), headersFor(__VU));
  served.add(res.status === 200 || res.status === 304);
  const body = jsonOf(res);
  if (body.nextRefreshMs) nextRefreshRefresh.add(body.nextRefreshMs);
  check(res, { "refresh is served, slowed or 304": (r) => [200, 304, 429, 503].includes(r.status) });
  sleep(0.1);
}

export function searches() {
  const q = terms[__ITER % terms.length];
  const res = http.post(`${BASE_URL}/api/search`, JSON.stringify({ q }), headersFor(__VU));
  if (res.status === 200) searchLatency.add(res.timings.duration);
  served.add(res.status === 200);
  const body = jsonOf(res);
  if (body.nextRefreshMs) nextRefreshSearch.add(body.nextRefreshMs);
  check(res, { "search is served or slowed": (r) => [200, 429, 503].includes(r.status) });
}

export function votes() {
  const pid = (__ENV.PIDS || "").split(",")[0];
  if (!pid) return;
  const res = http.post(`${BASE_URL}/api/polls/${pid}/vote`, JSON.stringify({ choiceIds: [__ENV.CHOICE_ID || "c1"] }), headersFor(__VU));
  const body = jsonOf(res);
  if (body.nextRefreshMs) nextRefreshVote.add(body.nextRefreshMs);
  check(res, {
    "a vote is never refused for load": (r) => r.status !== 503,
    "a vote keeps the plain floor": () => !body.nextRefreshMs || body.nextRefreshMs === Number(__ENV.VOTE_FLOOR_MS || 2000)
  });
  const live = http.post(`${BASE_URL}/api/live/refresh`, JSON.stringify({}), headersFor(__VU));
  const liveBody = jsonOf(live);
  if (liveBody.nextRefreshMs) nextRefreshLive.add(liveBody.nextRefreshMs);
}
