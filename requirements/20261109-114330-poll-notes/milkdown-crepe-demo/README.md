# Milkdown Crepe — Vanilla JavaScript demo

A small, framework-free HTML/CSS/JavaScript project using **Milkdown Crepe's fixed TopBar** for traditional WYSIWYG editing.

## Requirements
- Node.js and npm (recent LTS recommended)

## Run
```bash
npm install
npm run dev
```
Open the local URL printed by Vite (normally http://127.0.0.1:5173/).

## Features
- Always-visible, traditional formatting toolbar **while editing** (`Crepe.Feature.TopBar`)
- Floating selection toolbar (`Crepe.Feature.Toolbar`)
- Save & close to show rendered HTML; Edit notes to reopen
- Cancel discards unsaved edits
- Saved Markdown persists in browser `localStorage`
- Collapsible developer view shows actual saved Markdown
- Markdown rendered using `markdown-it` and sanitized with DOMPurify

## Production integration
Replace the `localStorage.setItem` call with your application's API request to store the Markdown in your database. Retrieve it when the page loads. The viewer is independent of the editor. The demo doesn't implement server persistence or image uploads.

## Build
```bash
npm run build
npm run preview
```

## References
- https://milkdown.dev/docs/api/crepe
- https://milkdown.dev/docs/guide/using-crepe
