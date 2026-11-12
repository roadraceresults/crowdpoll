/**
 * Renders src/public/favicon.svg at 16, 32 and 48 px with a headless Chromium-based
 * browser and writes them, as PNG images, into src/public/favicon.ico; also writes a 96 px
 * src/public/email-logo.png for the email layout (48 px at 2x: a 96 px window renders blank), and the
 * 1200 × 630 src/public/og-image.png the link previews carry, rendered from src/public/og-logo.svg (the brand
 * logo with its speech bubble, centred on white).
 * Rerun whenever favicon.svg or og-logo.svg changes; not part of `npm run build`.
 * Usage: npx tsx devScripts/favicon-ico.ts   (FAVICON_BROWSER overrides the Edge path)
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SIZES = [16, 32, 48];
const SVG_PATH = path.resolve("src/public/favicon.svg");
const ICO_PATH = "src/public/favicon.ico";
const EMAIL_LOGO_SIZE = 48;
const EMAIL_LOGO_SCALE = 2;
const EMAIL_LOGO_PATH = "src/public/email-logo.png";
const OG_LOGO_PATH = path.resolve("src/public/og-logo.svg");
const OG_IMAGE_PATH = "src/public/og-image.png";
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;
const OG_IMAGE_FIGURE_HEIGHT = 480;
const OG_IMAGE_MAX_BYTES = 300_000;
const DEFAULT_BROWSER = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ICO_HEADER_BYTES = 6;
const ICO_ENTRY_BYTES = 16;

class FaviconError extends Error {}

function renderPng(browser: string, workDir: string, size: number, scale = 1): Buffer {
  const pngPath = path.join(workDir, `${size}x${scale}.png`);
  try {
    execFileSync(
      browser,
      [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        `--force-device-scale-factor=${scale}`,
        "--default-background-color=00000000",
        `--user-data-dir=${path.join(workDir, "profile")}`,
        `--window-size=${size},${size}`,
        `--screenshot=${pngPath}`,
        pathToFileURL(SVG_PATH).href,
      ],
      { stdio: "ignore", timeout: 30000 }
    );
  } catch (err) {
    throw new FaviconError(`Browser failed rendering ${size} px: ${(err as Error).message}`);
  }
  if (!existsSync(pngPath)) throw new FaviconError(`No screenshot for ${size} px`);
  const png = readFileSync(pngPath);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== size * scale || height !== size * scale) {
    throw new FaviconError(`Rendered ${width}x${height} for size ${size} at ${scale}x`);
  }
  return png;
}

/** The preview image: the brand logo (og-logo.svg) centred on a white 1200 × 630 page, screenshotted at 1x. */
function renderOgImage(browser: string, workDir: string): Buffer {
  const pagePath = path.join(workDir, "og-image.html");
  const pngPath = path.join(workDir, "og-image.png");
  writeFileSync(
    pagePath,
    `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${OG_IMAGE_WIDTH}px;height:${OG_IMAGE_HEIGHT}px;background:#fff;overflow:hidden}
body{display:flex;align-items:center;justify-content:center}
img{height:${OG_IMAGE_FIGURE_HEIGHT}px;width:auto}
</style></head><body><img src="${pathToFileURL(OG_LOGO_PATH).href}" alt=""></body></html>`
  );
  try {
    execFileSync(
      browser,
      [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        `--user-data-dir=${path.join(workDir, "profile")}`,
        `--window-size=${OG_IMAGE_WIDTH},${OG_IMAGE_HEIGHT}`,
        `--screenshot=${pngPath}`,
        pathToFileURL(pagePath).href,
      ],
      { stdio: "ignore", timeout: 30000 }
    );
  } catch (err) {
    throw new FaviconError(`Browser failed rendering the preview image: ${(err as Error).message}`);
  }
  if (!existsSync(pngPath)) throw new FaviconError("No screenshot for the preview image");
  const png = readFileSync(pngPath);
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== OG_IMAGE_WIDTH || height !== OG_IMAGE_HEIGHT) {
    throw new FaviconError(`Rendered ${width}x${height} for the preview image`);
  }
  if (png.length > OG_IMAGE_MAX_BYTES) {
    throw new FaviconError(`The preview image is ${png.length} bytes; messaging apps want it under ${OG_IMAGE_MAX_BYTES}`);
  }
  return png;
}

function buildIco(pngs: Buffer[]): Buffer {
  const header = Buffer.alloc(ICO_HEADER_BYTES + ICO_ENTRY_BYTES * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach((png, i) => {
    const entry = ICO_HEADER_BYTES + i * ICO_ENTRY_BYTES;
    header.writeUInt8(SIZES[i], entry);
    header.writeUInt8(SIZES[i], entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...pngs]);
}

function main(): void {
  const browser = process.env.FAVICON_BROWSER || DEFAULT_BROWSER;
  if (!existsSync(browser)) {
    console.error(`[favicon] Browser not found: ${browser}. Set FAVICON_BROWSER to a Chromium-based browser.`);
    process.exitCode = 1;
    return;
  }
  const workDir = mkdtempSync(path.join(tmpdir(), "favicon-"));
  try {
    const ico = buildIco(SIZES.map((size) => renderPng(browser, workDir, size)));
    writeFileSync(ICO_PATH, ico);
    console.log(`[favicon] wrote ${ICO_PATH} (${SIZES.join(", ")} px, ${ico.length} bytes)`);
    const logo = renderPng(browser, workDir, EMAIL_LOGO_SIZE, EMAIL_LOGO_SCALE);
    writeFileSync(EMAIL_LOGO_PATH, logo);
    console.log(`[favicon] wrote ${EMAIL_LOGO_PATH} (${EMAIL_LOGO_SIZE * EMAIL_LOGO_SCALE} px, ${logo.length} bytes)`);
    const ogImage = renderOgImage(browser, workDir);
    writeFileSync(OG_IMAGE_PATH, ogImage);
    console.log(`[favicon] wrote ${OG_IMAGE_PATH} (${OG_IMAGE_WIDTH} × ${OG_IMAGE_HEIGHT} px, ${ogImage.length} bytes)`);
  } catch (err) {
    if (!(err instanceof FaviconError)) throw err;
    console.error(`[favicon] ${err.message}`);
    process.exitCode = 1;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
