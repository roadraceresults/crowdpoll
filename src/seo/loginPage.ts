import { notesPlainText } from "../polls/notes.js";
import type { PollProjection } from "../polls/versions.js";
import { joinHeadTags, previewHeadTags } from "./pollPage.js";

/** The longest preview description the login page carries, the closing ellipsis included. */
export const LINK_PREVIEW_DESCRIPTION_MAX = 300;

/**
 * What a messaging app shows under a published poll's link: the subtitle, a blank line, then the approved Custom
 * Email Message as plain text; whichever of the two exists; or the site's line when neither does.
 */
export function linkPreviewDescription(poll: Pick<PollProjection, "title" | "subtitle">, message: string): string {
  const text = [poll.subtitle.trim(), notesPlainText(message).trim()].filter(Boolean).join("\n\n") || `Vote and see live results: ${poll.title}`;
  return text.length <= LINK_PREVIEW_DESCRIPTION_MAX ? text : `${text.slice(0, LINK_PREVIEW_DESCRIPTION_MAX - 1).trimEnd()}…`;
}

/**
 * The login page as a link-preview fetcher should read it for a published poll: its title, description and Open
 * Graph tags in place of "Login", with the shared link as the page's own address. Nothing else of the page changes,
 * so a person who taps the link sees the login page as before.
 */
export function renderLoginPage(
  loginHtml: string,
  poll: Pick<PollProjection, "pid" | "title" | "subtitle">,
  message: string,
  origin: string
): string {
  const tags = previewHeadTags({
    title: `${poll.title} · CrowdPoll`,
    headline: poll.title,
    description: linkPreviewDescription(poll, message),
    url: `${origin}/?PID=${poll.pid}`
  });
  return loginHtml.replace(/<title>[^<]*<\/title>/, () => joinHeadTags(tags));
}
