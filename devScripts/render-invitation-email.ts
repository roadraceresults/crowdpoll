/**
 * Renders the draft invitation email (requirements UA14, UA15, IN2, AM4, UA16, UA17) through the production email layout
 * into a stand-alone page that opens from disk: invitation-email.html, with switches for the
 * reminder version, anonymous votes, a poll with or without an end and the plain-text part, and the logo copied beside it.
 * The message is production's own invitationMessage(), so the page shows exactly what is sent.
 * Usage: npx tsx devScripts/render-invitation-email.ts <output folder> [--force]
 */
import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { escapeHtml, invitationMessage, type EmailMessage } from "../src/email/templates.js";

const ORIGIN = "https://crowdpoll.vote";
const SENDER = "CrowdPoll <no-reply@mail.crowdpoll.vote>";
const PAGE_FILE = "invitation-email.html";
const LOGO_FILE = "email-logo.png";

const fixture = {
  creatorName: "David Brooks",
  creatorEmail: "roadraceresults@gmail.com",
  title: "When do you want to meet?",
  pid: "3f6c2a9e-4b1d-4e8a-9c7f-1a2b3c4d5e6f",
  invitee: "maria.chen@gmail.com",
  launchedAt: new Date("2026-10-26T16:59:00Z"),
  endAt: new Date("2026-11-02T22:00:00Z"),
  timeZone: "America/New_York"
};

function variants(): Record<string, EmailMessage & { preheader: string }> {
  const out: Record<string, EmailMessage & { preheader: string }> = {};
  for (const reminder of [false, true]) {
    for (const anonymous of [false, true]) {
      for (const ends of [true, false]) {
        const message = invitationMessage({
          creatorName: fixture.creatorName,
          creatorEmail: fixture.creatorEmail,
          title: fixture.title,
          link: `${ORIGIN}/invite?PID=${fixture.pid}&token=sample`,
          origin: ORIGIN,
          anonymous,
          reminder,
          launchedAt: fixture.launchedAt,
          endAt: ends ? fixture.endAt : null,
          timeZone: fixture.timeZone,
          signInAddress: fixture.invitee
        });
        out[`${reminder ? "reminder" : "invitation"}-${anonymous ? "anonymous" : "named"}-${ends ? "ends" : "open-ended"}`] = {
          ...message,
          html: message.html.replace(`${ORIGIN}/${LOGO_FILE}`, LOGO_FILE),
          preheader: `You're invited to vote in "${fixture.title}".`
        };
      }
    }
  }
  return out;
}

function page(messages: ReturnType<typeof variants>): string {
  const data = JSON.stringify(messages).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invitation Email</title>
  <style>
    :root { --bg:#E9ECE5; --panel:#FFFFFF; --ink:#1A1C19; --muted:#5C6058; --line:#D6DACF; --accent:#2C6A46; --accent-soft:#CDE8D5; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .bar { position:sticky; top:0; z-index:1; display:flex; flex-wrap:wrap; gap:8px 16px; justify-content:center; padding:12px 16px; background:var(--panel); border-bottom:1px solid var(--line); }
    .group { display:flex; gap:4px; align-items:center; }
    .group-label { color:var(--muted); margin-right:4px; }
    .bar button { font:inherit; padding:6px 14px; border-radius:999px; border:1px solid var(--muted); background:transparent; color:var(--ink); cursor:pointer; }
    .bar button[aria-pressed="true"] { background:var(--accent-soft); border-color:var(--accent); }
    .mail { max-width:680px; margin:16px auto 32px; padding:0 16px; }
    .envelope { background:var(--panel); border:1px solid var(--line); border-radius:12px 12px 0 0; padding:12px 16px; }
    .envelope dl { display:grid; grid-template-columns:max-content 1fr; gap:4px 12px; margin:0; }
    .envelope dt { color:var(--muted); }
    .envelope dd { margin:0; overflow-wrap:anywhere; }
    .subject { font-weight:600; }
    .body { background:var(--panel); border:1px solid var(--line); border-top:0; border-radius:0 0 12px 12px; overflow:hidden; }
    iframe { display:block; width:100%; height:820px; border:0; }
    pre { margin:0; padding:16px; white-space:pre-wrap; overflow-wrap:anywhere; font:13px/1.5 ui-monospace, Consolas, monospace; }
    [hidden] { display:none !important; }
  </style>
</head>
<body>
  <div class="bar">
    <div class="group" role="group" aria-label="Message">
      <span class="group-label">Message</span>
      <button type="button" data-choice="kind" data-value="invitation" aria-pressed="true">Invitation</button>
      <button type="button" data-choice="kind" data-value="reminder" aria-pressed="false">Reminder</button>
    </div>
    <div class="group" role="group" aria-label="Votes">
      <span class="group-label">Votes</span>
      <button type="button" data-choice="votes" data-value="named" aria-pressed="true">Creator sees votes</button>
      <button type="button" data-choice="votes" data-value="anonymous" aria-pressed="false">Anonymous</button>
    </div>
    <div class="group" role="group" aria-label="End">
      <span class="group-label">End</span>
      <button type="button" data-choice="ends" data-value="ends" aria-pressed="true">Has an end</button>
      <button type="button" data-choice="ends" data-value="open-ended" aria-pressed="false">No end</button>
    </div>
    <div class="group" role="group" aria-label="Part">
      <span class="group-label">Part</span>
      <button type="button" data-choice="part" data-value="html" aria-pressed="true">HTML</button>
      <button type="button" data-choice="part" data-value="text" aria-pressed="false">Plain text</button>
    </div>
  </div>
  <div class="mail">
    <div class="envelope">
      <dl>
        <dt>From</dt><dd>${escapeHtml(SENDER)}</dd>
        <dt>To</dt><dd>${escapeHtml(fixture.invitee)}</dd>
        <dt>Subject</dt><dd class="subject" id="subject"></dd>
        <dt>Preview</dt><dd id="preheader"></dd>
      </dl>
    </div>
    <div class="body">
      <iframe id="html" title="Email body"></iframe>
      <pre id="text" hidden></pre>
    </div>
  </div>
  <script>
    (function () {
      "use strict";
      const messages = ${data};
      const state = { kind: "invitation", votes: "named", ends: "ends", part: "html" };
      const frame = document.getElementById("html");
      const text = document.getElementById("text");

      function show() {
        const message = messages[state.kind + "-" + state.votes + "-" + state.ends];
        document.getElementById("subject").textContent = message.subject;
        document.getElementById("preheader").textContent = message.preheader;
        frame.srcdoc = message.html.replace("<head>", '<head><base href="' + document.baseURI + '" target="_blank">');
        text.textContent = message.text;
        frame.hidden = state.part !== "html";
        text.hidden = state.part !== "text";
      }

      for (const button of document.querySelectorAll("[data-choice]")) {
        button.addEventListener("click", () => {
          state[button.dataset.choice] = button.dataset.value;
          for (const other of document.querySelectorAll('[data-choice="' + button.dataset.choice + '"]')) {
            other.setAttribute("aria-pressed", String(other === button));
          }
          show();
        });
      }

      show();
    })();
  </script>
</body>
</html>
`;
}

function main() {
  const [outDirArg, ...flags] = process.argv.slice(2);
  if (!outDirArg) throw new Error("Usage: npx tsx devScripts/render-invitation-email.ts <output folder> [--force]");
  const outDir = path.resolve(process.env.INIT_CWD ?? process.cwd(), outDirArg);
  if (existsSync(path.join(outDir, PAGE_FILE)) && !flags.includes("--force")) {
    throw new Error(`Not overwriting ${PAGE_FILE} in ${outDir}; pass --force to replace it.`);
  }
  writeFileSync(path.join(outDir, PAGE_FILE), page(variants()));
  copyFileSync(path.resolve("src/public", LOGO_FILE), path.join(outDir, LOGO_FILE));
  console.log(`Wrote ${PAGE_FILE} and ${LOGO_FILE} to ${outDir}`);
}

main();
