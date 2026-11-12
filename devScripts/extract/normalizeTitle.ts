export function normalizeTitle(text: string): string {
  return text
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, "\"")
    .replace(/[‒–—―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}
