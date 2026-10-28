// Shared helpers for the k6 scripts. k6 docs: https://grafana.com/docs/k6/latest/
export const BASE_URL = __ENV.BASE_URL || "http://localhost:8080";

const cookies = (__ENV.COOKIES || "").split(",").map((c) => c.trim()).filter(Boolean);

/** The cookie a virtual user carries, if any; guests share the address-keyed floors. */
export function cookieFor(vu) {
  if (cookies.length === 0) return null;
  return cookies[vu % cookies.length];
}

export function headersFor(vu, extra) {
  const headers = Object.assign({ "Content-Type": "application/json" }, extra || {});
  const cookie = cookieFor(vu);
  if (cookie) headers.Cookie = cookie;
  return { headers };
}

export function pids() {
  return (__ENV.PIDS || "").split(",").map((p) => p.trim()).filter(Boolean);
}

export function jsonOf(res) {
  try {
    return res.json();
  } catch (e) {
    return {};
  }
}
