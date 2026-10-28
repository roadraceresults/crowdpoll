/**
 * Serves the prototypes so a phone on the same network can open them, and prints the address of each.
 * Usage:  npm run prototypes [port]   (default 8081; nothing is deployed)
 * Only prototypes/ and src/public/ are served: a prototype links to the app's own files.
 */
import { createServer, type Server } from "node:http";
import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DEFAULT_PORT = 8081;
export const SERVED_FOLDERS = ["prototypes", "src/public"];

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".md": "text/plain; charset=utf-8"
};

export function repositoryRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

/** The file a URL path names, or null when it is outside the served folders. */
export function resolveServedPath(root: string, urlPath: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]!.split("#")[0]!);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const target = path.resolve(root, "." + decoded);
  for (const folder of SERVED_FOLDERS) {
    const allowed = path.resolve(root, folder);
    if (target === allowed || target.startsWith(allowed + path.sep)) return target;
  }
  return null;
}

export function listPrototypes(root: string): string[] {
  const dir = path.join(root, "prototypes");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => existsSync(path.join(dir, name, "index.html")))
    .sort();
}

export function networkAddresses(): string[] {
  const found: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const entry of list ?? []) {
      if (entry.family === "IPv4" && !entry.internal) found.push(entry.address);
    }
  }
  return found;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function indexPage(root: string): string {
  const links = listPrototypes(root)
    .map((name) => `<li><a href="/prototypes/${encodeURIComponent(name)}/">${escapeHtml(name)}</a></li>`)
    .join("");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prototypes</title><h1>Prototypes</h1><ul>${links}</ul>`;
}

/** One line per request: time, the address it came from, method, path, status. */
export function requestLine(now: Date, remote: string | undefined, method: string, url: string, status: number): string {
  const time = now.toTimeString().slice(0, 8);
  return `[prototypes] ${time} ${(remote ?? "?").replace(/^::ffff:/, "")} ${method} ${url} ${status}`;
}

export function createPrototypeServer(root: string, log: (line: string) => void = () => {}): Server {
  return createServer((req, res) => {
    res.on("finish", () => log(requestLine(new Date(), req.socket.remoteAddress, req.method ?? "?", req.url ?? "/", res.statusCode)));
    const headers = { "Cache-Control": "no-store" };
    const send = (status: number, type: string, body: string | Buffer) => {
      res.writeHead(status, { ...headers, "Content-Type": type });
      res.end(body);
    };
    void (async () => {
      if (req.method !== "GET" && req.method !== "HEAD") return send(405, "text/plain", "Method not allowed");
      const url = req.url ?? "/";
      if (url === "/" || url.startsWith("/?")) return send(200, MIME[".html"]!, indexPage(root));
      let file = resolveServedPath(root, url);
      if (file && existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
      if (!file || !existsSync(file) || !statSync(file).isFile()) return send(404, "text/plain", "Not found");
      send(200, MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream", req.method === "HEAD" ? "" : await readFile(file));
    })().catch(() => send(500, "text/plain", "Server error"));
  });
}

export function main(): void {
  const requested = process.argv[2];
  const port = requested ? Number(requested) : DEFAULT_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`ERROR: "${requested}" is not a port number. Usage: npm run prototypes [port]`);
    process.exit(1);
  }
  const root = repositoryRoot();
  const server = createPrototypeServer(root, console.log);
  server.on("error", (error) => {
    console.error(`ERROR: ${error.message}`);
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () => {
    const addresses = networkAddresses();
    console.log(`[prototypes] serving on port ${port}; the phone must be on the same network as this computer.`);
    if (addresses.length === 0) console.log("[prototypes] no network address found; try http://localhost:" + port + "/ on this computer.");
    for (const address of addresses) {
      console.log(`  http://${address}:${port}/`);
      for (const name of listPrototypes(root)) console.log(`    ${name}: http://${address}:${port}/prototypes/${name}/`);
    }
    console.log("[prototypes] Each request prints a line below; a phone request that prints no line never reached this program.");
    console.log("[prototypes] Ctrl+C stops it. Windows may ask once to allow node.exe on private networks.");
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
