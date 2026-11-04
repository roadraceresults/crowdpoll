// FCaptcha binds each PoW puzzle to the visitor's /24 network and reads that address from X-Real-IP, else from
// X-Forwarded-For, when the peer is a trusted proxy (ENV_FCAPTCHA_TRUSTED_PROXIES). Behind App Platform neither names
// the visitor reliably: the puzzle and its answer arrived from different networks. The edge's do-connecting-ip
// (also read by the web service, src/auth/humanCheck.ts) replaces X-Real-IP; without it X-Real-IP is dropped, so a
// visitor cannot supply one, and FCaptcha walks X-Forwarded-For as before.
const EDGE_HEADER = "do-connecting-ip";

let reported = false;

function useEdgeAddress(req, log = console.log) {
  const edge = req.headers[EDGE_HEADER];
  const address = typeof edge === "string" ? edge.trim() : "";
  if (address) req.headers["x-real-ip"] = address;
  else delete req.headers["x-real-ip"];
  // Once per start, without the address: whether the edge header is arriving.
  if (!reported) {
    reported = true;
    log(`[client-ip] ${address ? `${EDGE_HEADER} present; it is the visitor's address` : `${EDGE_HEADER} absent; X-Forwarded-For is used`}`);
  }
}

module.exports = { useEdgeAddress, EDGE_HEADER };
