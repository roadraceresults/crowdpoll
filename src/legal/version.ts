/** The day each document last changed, as its page says under "Last updated". Stored values compare as text. */
export const TERMS_UPDATED = "2026-11-06";
export const PRIVACY_UPDATED = "2026-11-06";

/** What an account accepts: the later of the two, so a change to either asks every account again. */
export const TERMS_VERSION = TERMS_UPDATED > PRIVACY_UPDATED ? TERMS_UPDATED : PRIVACY_UPDATED;
