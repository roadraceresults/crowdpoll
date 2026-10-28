import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";
import { BASE_URL, headersFor } from "./common.js";

const tooManyLoads = new Counter("too_many_loads");
const instanceRequestsPerReload = new Counter("instance_requests_per_reload");

export const options = {
  scenarios: {
    storm: { executor: "per-vu-iterations", vus: 50, iterations: 130 }
  }
};

export default function () {
  const page = http.get(`${BASE_URL}/`, headersFor(__VU));
  const config = http.get(`${BASE_URL}/api/config`, headersFor(__VU));
  const me = http.get(`${BASE_URL}/api/me`, headersFor(__VU));
  const counts = http.get(`${BASE_URL}/api/trending/trending-counts.json`, headersFor(__VU));
  instanceRequestsPerReload.add(1);
  if (me.status === 429 || counts.status === 429) tooManyLoads.add(1);
  check(page, { "page served": (r) => r.status === 200 });
  check(config, { "configuration is cacheable": (r) => (r.headers["Cache-Control"] || "").includes("max-age") });
}
