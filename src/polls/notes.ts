import { escapeHtml } from "../html.js";

export const NOTES_MAX = 6000;
export const INVITATION_MESSAGE_MAX = 1000;
export const NOTES_PREVIEW_CHARS = 300;

type Mark = "bold" | "italic" | "underline";

type Item =
  | { kind: "text"; text: string }
  | { kind: "br" }
  | { kind: "open"; mark: Mark; raw: string; matched: boolean }
  | { kind: "close"; mark: Mark };

const TAG: Record<Mark, string> = { bold: "strong", italic: "em", underline: "u" };

export function parseNotes(notes: string): Item[] {
  const items: Item[] = [];
  const stack: Extract<Item, { kind: "open" }>[] = [];
  let text = "";

  const flushText = () => {
    if (text) items.push({ kind: "text", text });
    text = "";
  };
  const open = (mark: Mark, raw: string) => {
    const item = { kind: "open" as const, mark, raw, matched: false };
    items.push(item);
    stack.push(item);
  };
  const closeAt = (depth: number) => {
    const opener = stack[depth]!;
    stack.length = depth;
    opener.matched = true;
    items.push({ kind: "close", mark: opener.mark });
  };
  const nearest = (marks: Mark[]) => {
    for (let i = stack.length - 1; i >= 0; i--) if (marks.includes(stack[i]!.mark)) return i;
    return -1;
  };

  for (let i = 0; i < notes.length; i++) {
    const ch = notes[i];
    if (ch === "\\" && i + 1 < notes.length) {
      i++;
      if (notes[i] === "\n") {
        flushText();
        items.push({ kind: "br" });
      } else {
        text += notes[i];
      }
    } else if (ch === "\n") {
      flushText();
      items.push({ kind: "br" });
    } else if (ch === "*") {
      let run = 1;
      while (notes[i + run] === "*") run++;
      i += run - 1;
      flushText();
      for (;;) {
        const depth = nearest(["bold", "italic"]);
        if (depth < 0) break;
        const need = stack[depth]!.mark === "bold" ? 2 : 1;
        if (run < need) break;
        closeAt(depth);
        run -= need;
      }
      while (run >= 2) {
        open("bold", "**");
        run -= 2;
      }
      if (run === 1) open("italic", "*");
    } else if (ch === "+" && notes[i + 1] === "+") {
      i++;
      flushText();
      const depth = nearest(["underline"]);
      if (depth >= 0) closeAt(depth);
      else open("underline", "++");
    } else {
      text += ch;
    }
  }
  flushText();
  return items;
}

function itemText(item: Item): string {
  if (item.kind === "text") return item.text;
  if (item.kind === "br") return "\n";
  if (item.kind === "open" && !item.matched) return item.raw;
  return "";
}

export function notesPlainText(notes: string): string {
  return parseNotes(notes).map(itemText).join("");
}

export function normalizeNotes(notes: string): string {
  return notesPlainText(notes).trim() === "" ? "" : notes;
}

function renderItems(items: Item[], maxChars = Infinity): string {
  let html = "";
  let used = 0;
  const openTags: Mark[] = [];
  for (const item of items) {
    if (used >= maxChars) break;
    if (item.kind === "open" && item.matched) {
      html += `<${TAG[item.mark]}>`;
      openTags.push(item.mark);
    } else if (item.kind === "close") {
      html += `</${TAG[item.mark]}>`;
      openTags.pop();
    } else if (item.kind === "br") {
      html += "<br>";
      used++;
    } else {
      const text = itemText(item).slice(0, maxChars - used);
      html += escapeHtml(text);
      used += text.length;
    }
  }
  while (openTags.length) html += `</${TAG[openTags.pop()!]}>`;
  return html;
}

export function renderNotesHtml(notes: string): string {
  return renderItems(parseNotes(notes));
}

export function renderNotesPreview(notes: string): { html: string; hasMore: boolean } {
  const items = parseNotes(notes);
  const plain = items.map(itemText).join("");
  if (plain.length <= NOTES_PREVIEW_CHARS) return { html: renderItems(items), hasMore: false };
  let cut = Math.max(plain.lastIndexOf(" ", NOTES_PREVIEW_CHARS), plain.lastIndexOf("\n", NOTES_PREVIEW_CHARS));
  if (cut < NOTES_PREVIEW_CHARS / 2) cut = NOTES_PREVIEW_CHARS;
  const code = plain.charCodeAt(cut - 1);
  if (code >= 0xd800 && code <= 0xdbff) cut--;
  return { html: renderItems(items, cut) + "…", hasMore: true };
}
