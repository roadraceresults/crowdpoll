import { notesPlainText } from "../polls/notes.js";
import type { PollRow } from "../db/schema.js";
import type { PollProjection } from "../polls/versions.js";
import { joinHeadTags, previewHeadTags } from "./pollPage.js";

/** The longest preview description the login page carries, the closing ellipsis included. */
export const LINK_PREVIEW_DESCRIPTION_MAX = 300;

/** Every run of white space, line breaks included, becomes one space: messaging apps show the first line only. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * The message a poll's link preview shows: the one that belongs to its current sharing mode, read from the approved
 * column. A public poll has no message of its own.
 */
export function previewMessageOf(
  row: Pick<PollRow, "poll_visibility" | "poll_sharing_mode" | "invitation_message" | "link_preview_message">
): string {
  if (row.poll_visibility === "Public Poll") return "";
  return row.poll_sharing_mode === "Invitation Only" ? row.invitation_message : row.link_preview_message;
}

/**
 * What a messaging app shows under a published poll's link, on one line: the subtitle, a dash (" - "), then the
 * approved message of the poll's sharing mode as plain text; whichever of the two exists; or the site's default
 * sentence (ENV_DEFAULT_LINK_PREVIEW_MESSAGE) when neither does.
 */
export function linkPreviewDescription(poll: Pick<PollProjection, "subtitle">, message: string, fallback: string): string {
  const text = [oneLine(poll.subtitle), oneLine(notesPlainText(message))].filter(Boolean).join(" - ") || fallback;
  return text.length <= LINK_PREVIEW_DESCRIPTION_MAX ? text : `${text.slice(0, LINK_PREVIEW_DESCRIPTION_MAX - 1).trimEnd()}…`;
}

/**
 * The login page as a link-preview fetcher should read it for a published poll: its title, description, Open Graph
 * tags and the brand image in place of "Login", with the shared link as the page's own address. Nothing else of the
 * page changes, so a person who taps the link sees the login page as before.
 */
export function renderLoginPage(
  loginHtml: string,
  poll: Pick<PollProjection, "pid" | "title" | "subtitle">,
  message: string,
  origin: string,
  fallback: string
): string {
  const tags = previewHeadTags({
    title: `${poll.title} · CrowdPoll`,
    headline: poll.title,
    description: linkPreviewDescription(poll, message, fallback),
    url: `${origin}/?PID=${poll.pid}`,
    origin
  });
  return loginHtml.replace(/<title>[^<]*<\/title>/, () => joinHeadTags(tags));
}
