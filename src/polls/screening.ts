/**
 * Acceptability Screening (011-SIMPLIFY-POLL-STATES, research R1).
 *
 * Screening is defined behind one interface so the mechanics around the call —
 * the claim, the attempt budget, the timeout and the crashed-process recovery —
 * can be built and tested without committing to an external service. The default
 * implementation is local: it makes no network call, so private drafts never
 * leave the system and the test suite has no outbound dependency.
 */

/** Empty string = acceptable. Non-empty = the human-readable reason for rejection. */
export type ScreeningVerdict = string;

export interface ScreeningInput {
  title: string;
  subtitle: string;
  choiceLabels: string[];
}

export interface Screener {
  (input: ScreeningInput): Promise<ScreeningVerdict>;
}

/**
 * Terms rejected by most online communities. Deliberately small and obvious —
 * the point of the interface is that this can be replaced by a hosted or local
 * model without any caller changing.
 */
const DENY_TERMS = [
  "shit", "piss", "cunt", "fuck", "cocksucker", "motherfucker", "tits",
  "bitch", "bastard", "whore", "slut", "faggot", "nigger", "retard",
  "porn", "pornographic", "rape", "molest", "bestiality"
];

/** Word-boundary match so "classic" does not trip on "ass". */
function offendingTerms(text: string): string[] {
  const lower = text.toLowerCase();
  return DENY_TERMS.filter((t) => new RegExp(`\\b${t}\\b`).test(lower));
}

export const localScreener: Screener = async ({ title, subtitle, choiceLabels }) => {
  const found = offendingTerms([title, subtitle, ...choiceLabels].join(" \n "));
  if (found.length === 0) return "";
  const unique = [...new Set(found)].sort();
  return `Acceptability Screening rejected this poll for unacceptable language (${unique.length} term${unique.length === 1 ? "" : "s"}). Please revise the title, subtitle and choices.`;
};

/**
 * Runs a screener under a hard time bound (FR-035). A call that neither resolves
 * nor rejects in time is abandoned so the claim it holds can be released and
 * retried; timeout and throw are treated identically by the caller.
 */
export class ScreeningTimeoutError extends Error {}

export async function screenWithTimeout(
  screener: Screener,
  input: ScreeningInput,
  timeoutMs: number
): Promise<ScreeningVerdict> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      screener(input),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new ScreeningTimeoutError(`Acceptability Screening did not complete within ${timeoutMs}ms.`)),
          timeoutMs
        );
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
