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

/** The brand image every preview page offers: 1200 × 630, rendered from favicon.svg by devScripts/favicon-ico.ts. */
export const OG_IMAGE = { path: "/og-image.png", width: 1200, height: 630, type: "image/png" } as const;

export interface PreviewHead {
  /** The full `<title>` text, e.g. "Best pizza · CrowdPoll". */
  title: string;
  /** The bare headline for `og:title`. */
  headline: string;
  description: string;
  /** The address the preview card carries as the page's own. */
  url: string;
  /** The site's origin, which the image's absolute address is built on. */
  origin: string;
}

/**
 * The head tags a link-preview fetcher or crawler reads — title, description, Open Graph with the brand image, and
 * Twitter card — each value attribute-escaped. The poll page adds its canonical link and structured data; the login
 * page uses them alone. The image's width, height and type let an app lay the card out before fetching it.
 */
export function previewHeadTags({ title, headline, description, url, origin }: PreviewHead): string[] {
  const escapedDescription = escapeHtml(description);
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapedDescription}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="CrowdPoll">`,
    `<meta property="og:title" content="${escapeHtml(headline)}">`,
    `<meta property="og:description" content="${escapedDescription}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${escapeHtml(origin + OG_IMAGE.path)}">`,
    `<meta property="og:image:width" content="${OG_IMAGE.width}">`,
    `<meta property="og:image:height" content="${OG_IMAGE.height}">`,
    `<meta property="og:image:type" content="${OG_IMAGE.type}">`,
    `<meta name="twitter:card" content="summary">`
  ];
}

/** Lays head tags out as login.html and index.html indent theirs: one per line, two spaces in. */
export function joinHeadTags(tags: string[]): string {
  return tags
    .map((tag) => `  ${tag}`)
    .join("\n")
    .trimStart();
}

function headTags(poll: PollProjection, counts: LiveCounts, url: string, origin: string): string {
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
  const [title, description, ...rest] = previewHeadTags({
    title: `${poll.title} · CrowdPoll`,
    headline: poll.title,
    description: describe(poll),
    url,
    origin
  });
  return joinHeadTags([
    title!,
    description!,
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    ...rest,
    `<script type="application/ld+json">${scriptJson(question)}</script>`
  ]);
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
    .replace(/<title>[^<]*<\/title>/, () => headTags(poll, counts, url, origin))
    .replace(/<body([^>]*)>/, (_m, attrs: string) => `<body${attrs} data-poll-page="${escapeHtml(poll.pid)}">`)
    .replace(/<main class="all-markets">/, (m) => `${m}\n${summary(poll, counts, notesHtml)}`);
}
