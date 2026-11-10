import { escapeHtml } from "../html.js";
import type { LiveCounts } from "../polls/counters.js";
import type { PollProjection } from "../polls/versions.js";

const DESCRIPTION_MAX = 160;

function describe(poll: PollProjection): string {
  const text = poll.subtitle.trim() || `Vote and see live results: ${poll.title}`;
  return text.length <= DESCRIPTION_MAX ? text : `${text.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…`;
}

/** JSON for an inline script: no "<" survives, so no value can close the script element. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function percentages(poll: PollProjection, counts: LiveCounts): Map<string, number> {
  const total = poll.choices.reduce((sum, choice) => sum + (counts.choiceCounts[choice.id] ?? 0), 0);
  return new Map(
    poll.choices.map((choice) => [choice.id, total === 0 ? 0 : Math.round(((counts.choiceCounts[choice.id] ?? 0) / total) * 100)])
  );
}

function headTags(poll: PollProjection, counts: LiveCounts, url: string): string {
  const title = escapeHtml(`${poll.title} · CrowdPoll`);
  const description = escapeHtml(describe(poll));
  // https://schema.org/Question
  const question = {
    "@context": "https://schema.org",
    "@type": "Question",
    name: poll.title,
    text: poll.subtitle.trim() || poll.title,
    url,
    answerCount: poll.choices.length,
    suggestedAnswer: poll.choices.map((choice) => ({ "@type": "Answer", text: choice.label }))
  };
  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="CrowdPoll">`,
    `<meta property="og:title" content="${escapeHtml(poll.title)}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<script type="application/ld+json">${scriptJson(question)}</script>`
  ]
    .map((tag) => `  ${tag}`)
    .join("\n")
    .trimStart();
}

function summary(poll: PollProjection, counts: LiveCounts, notesHtml: string): string {
  const shares = percentages(poll, counts);
  const choices = poll.choices
    .map((choice) => `<li><span class="poll-summary-choice">${escapeHtml(choice.label)}</span> <span class="poll-summary-share">${shares.get(choice.id)}%</span></li>`)
    .join("");
  const votes = `${counts.voteCount} ${counts.voteCount === 1 ? "vote" : "votes"}`;
  const description = poll.subtitle.trim() ? `<p>${escapeHtml(poll.subtitle)}</p>` : "";
  const notes = notesHtml ? `<div class="poll-notes">${notesHtml}</div>` : "";
  return `<article id="poll-summary"><h1>${escapeHtml(poll.title)}</h1>${description}${notes}<ul>${choices}</ul><p>${votes}</p></article>`;
}

/**
 * The home page as a crawler should read one public poll: its own title, description, canonical address and
 * structured data in the head, and a plain summary of the poll at the start of the main region, which the
 * browser replaces with the live card.
 */
export function renderPollPage(indexHtml: string, poll: PollProjection, counts: LiveCounts, origin: string, notesHtml: string): string {
  const url = `${origin}/poll/${poll.pid}`;
  return indexHtml
    .replace(/<meta name="description"[^>]*>\s*/, "")
    .replace(/<title>[^<]*<\/title>/, () => headTags(poll, counts, url))
    .replace(/<body([^>]*)>/, (_m, attrs: string) => `<body${attrs} data-poll-page="${escapeHtml(poll.pid)}">`)
    .replace(/<main class="all-markets">/, (m) => `${m}\n${summary(poll, counts, notesHtml)}`);
}
