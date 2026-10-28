import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend } from "k6/metrics";
import { BASE_URL, headersFor, jsonOf, pids } from "./common.js";

const firstRefreshInterval = new Trend("first_live_next_refresh_ms");
const busyAtStart = new Counter("busy_at_surge_start");

export const options = {
  scenarios: {
    surge: { executor: "ramping-vus", startVUs: 0, stages: [{ duration: "60s", target: 20000 }, { duration: "2m", target: 20000 }] }
  },
  thresholds: { busy_at_surge_start: ["count==0"] }
};

export default function () {
  const list = pids();
  const pid = list[__VU % list.length];
  const added = http.post(`${BASE_URL}/api/live/${pid}`, null, headersFor(__VU));
  check(added, { "added to Live Results": (r) => r.status === 200 });
  const first = http.post(`${BASE_URL}/api/live/refresh`, JSON.stringify({}), headersFor(__VU));
  const body = jsonOf(first);
  if (first.status === 503 && __ITER === 0) busyAtStart.add(1);
  if (body.nextRefreshMs) firstRefreshInterval.add(body.nextRefreshMs);
  let wait = (body.nextRefreshMs || 2000) / 1000;
  for (let i = 0; i < 30; i++) {
    sleep(wait);
    const res = http.post(`${BASE_URL}/api/live/refresh`, JSON.stringify({}), headersFor(__VU));
    const next = jsonOf(res);
    wait = (next.nextRefreshMs || next.retryAfterMs || 2000) / 1000;
  }
}
