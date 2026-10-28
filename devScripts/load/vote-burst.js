import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";
import { BASE_URL, headersFor, jsonOf, pids } from "./common.js";

const queued = new Counter("votes_queued");
const recorded = new Counter("votes_recorded");
const refusedForLoad = new Counter("votes_refused_for_load");

export const options = {
  scenarios: {
    burst: { executor: "constant-arrival-rate", rate: 25000, timeUnit: "1s", duration: "60s", preAllocatedVUs: 2000, maxVUs: 20000 }
  },
  thresholds: { votes_refused_for_load: ["count==0"] }
};

export default function () {
  const pid = pids()[0];
  const res = http.post(`${BASE_URL}/api/polls/${pid}/vote`, JSON.stringify({ choiceIds: [__ENV.CHOICE_ID || "c1"] }), headersFor(__VU));
  const body = jsonOf(res);
  if (res.status === 503) refusedForLoad.add(1);
  if (body.status === "queued") queued.add(1);
  if (body.status === "recorded") recorded.add(1);
  check(res, { "accepted, floored or capped": (r) => [200, 409, 429].includes(r.status) });
}
