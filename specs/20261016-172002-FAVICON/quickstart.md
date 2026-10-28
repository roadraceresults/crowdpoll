# Quickstart: Site Favicon

## Prerequisites

- Node ≥ 22, `npm install` done.
- Microsoft Edge installed, or `FAVICON_BROWSER` set to another Chromium-based browser.

## 1. Regenerate the ICO (FR-008, C5)

```powershell
npx tsx devScripts/favicon-ico.ts
```

Expect `[favicon] wrote src/public/favicon.ico (16, 32, 48 px, … bytes)`. Open `src/public/favicon.ico` in an image viewer to see the three sizes.

## 2. Automated checks (FR-010)

```powershell
npx vitest run tests/pages.test.ts tests/m3-assets.test.ts
```

Expect the new "The site favicon" tests to pass, along with every existing test in both files. Then run the full `npm test` once (SC-006).

## 3. Look at it (SC-001, SC-004)

1. `npm run dev` (via `devScripts/launch-dev.ps1`) and open `http://localhost:8080/`.
2. The tab shows the green figure in front of the red one, with no bubble; repeat for `/login`, `/create-account`, `/profile`, `/admin`, `/admin/poll/results?PID=<pid>` and, as a guest, `/admin` (the not-authorized card).
3. Switch the browser (or the OS) to dark mode: both figures remain distinguishable on the dark tab strip.
4. Zoom the browser to 200% or use a high-density screen: the tab icon stays sharp.
5. Bookmark the page: the bookmark shows the same mark.

## 4. Root address (FR-004, C4)

```powershell
curl.exe -sI http://localhost:8080/favicon.ico
```

Expect `HTTP/1.1 200` and an `image/…icon` content type. Open an address that answers plain-text `Not found` and check the tab shows the icon.

## 5. Built output (R1)

```powershell
npm run build
```

`dist/public/asset-manifest.json` has `/favicon.svg` and `/favicon.ico`; `dist/public/favicon.ico` exists for the root address. Served pages reference `/assets/<hash>/favicon.svg` and `/assets/<hash>/favicon.ico`.
