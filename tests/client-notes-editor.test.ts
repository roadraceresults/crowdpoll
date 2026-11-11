import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";
import { renderNotesHtml } from "../src/polls/notes.js";

interface Editor {
  commit(): boolean;
  close(): void;
  element: HTMLElement;
}

interface NotesEditorApi {
  NOTES_MAX: number;
  open(host: HTMLElement, options: Record<string, unknown>): Editor;
  serialize(root: HTMLElement): string;
}

interface Page {
  window: JSDOM["window"];
  document: Document;
  api: NotesEditorApi;
  commands: { name: string; value: unknown }[];
  pressed: Set<string>;
  host: HTMLElement;
}

let dom: JSDOM | null = null;

afterEach(() => {
  dom?.window.close();
  dom = null;
});

function openPage(): Page {
  dom = new JSDOM("<!doctype html><body><div id=outer><div id=host></div></div></body>", {
    url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole: new VirtualConsole()
  });
  const { window } = dom;
  const commands: { name: string; value: unknown }[] = [];
  const pressed = new Set<string>();
  const doc = window.document as unknown as Record<string, unknown>;
  doc.execCommand = (name: string, _ui: boolean, value: unknown) => {
    commands.push({ name, value });
    return true;
  };
  doc.queryCommandState = (name: string) => pressed.has(name);
  window.eval(readFileSync(path.resolve("src/public/notesEditor.js"), "utf8"));
  const api = (window as unknown as { NotesEditor: NotesEditorApi }).NotesEditor;
  return { window, document: window.document, api, commands, pressed, host: window.document.getElementById("host")! };
}

function textBox(page: Page) {
  return page.host.querySelector<HTMLElement>(".notes-editor-text")!;
}

function typeInto(page: Page, html: string) {
  textBox(page).innerHTML = html;
  textBox(page).dispatchEvent(new page.window.Event("input", { bubbles: true }));
}

function selectInside(page: Page) {
  const range = page.document.createRange();
  range.selectNodeContents(textBox(page));
  page.document.getSelection()!.removeAllRanges();
  page.document.getSelection()!.addRange(range);
  page.document.dispatchEvent(new page.window.Event("selectionchange"));
}

const cases: { stored: string; html: string }[] = JSON.parse(readFileSync("tests/fixtures/notes-cases.json", "utf8"));

describe("notes editor", () => {
  it("builds the bar, the three-button toolbar and the text box, and moves the focus in", () => {
    const page = openPage();
    page.api.open(page.host, { html: "<strong>Hi</strong>", onDone: () => {}, confirmDiscard: async () => true });
    expect(page.host.querySelector(".notes-editor-heading")!.textContent).toBe("Notes");
    expect([...page.host.querySelectorAll(".notes-editor-actions button")].map((b) => b.textContent)).toEqual(["Cancel", "Done"]);
    const marks = [...page.host.querySelectorAll<HTMLElement>(".notes-editor-toolbar button")];
    expect(marks.map((b) => b.getAttribute("aria-label"))).toEqual(["Bold", "Italic", "Underline"]);
    expect(marks.every((b) => b.title.includes("Ctrl+") && b.getAttribute("aria-pressed") === "false")).toBe(true);
    const text = textBox(page);
    expect(text.getAttribute("contenteditable")).toBe("true");
    expect(text.getAttribute("role")).toBe("textbox");
    expect(text.getAttribute("aria-multiline")).toBe("true");
    expect(text.innerHTML).toBe("<strong>Hi</strong>");
    expect(page.document.activeElement).toBe(text);
    expect(page.host.querySelector(".notes-editor-counter")!.textContent).toBe("6 / 6000");
  });

  it("applies a mark from its button and shows the marks at the cursor", () => {
    const page = openPage();
    page.api.open(page.host, { html: "word", onDone: () => {}, confirmDiscard: async () => true });
    page.pressed.add("bold");
    selectInside(page);
    page.host.querySelector<HTMLElement>(".notes-editor-italic")!.click();
    expect(page.commands).toContainEqual({ name: "italic", value: null });
    expect(page.commands).toContainEqual({ name: "styleWithCSS", value: false });
    expect(page.host.querySelector(".notes-editor-bold")!.getAttribute("aria-pressed")).toBe("true");
    expect(page.host.querySelector(".notes-editor-italic")!.getAttribute("aria-pressed")).toBe("false");
  });

  it("inserts only the plain text of a paste or a drop", () => {
    const page = openPage();
    page.api.open(page.host, { html: "", onDone: () => {}, confirmDiscard: async () => true });
    const paste = new page.window.Event("paste", { bubbles: true, cancelable: true });
    Object.assign(paste, { clipboardData: { getData: (type: string) => (type === "text/plain" ? "plain\r\ntext" : "<h1>x</h1>") } });
    textBox(page).dispatchEvent(paste);
    expect(paste.defaultPrevented).toBe(true);
    const drop = new page.window.Event("drop", { bubbles: true, cancelable: true });
    Object.assign(drop, { dataTransfer: { getData: () => "dropped" } });
    textBox(page).dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    expect(page.commands.filter((c) => c.name === "insertText")).toEqual([
      { name: "insertText", value: "plain\ntext" },
      { name: "insertText", value: "dropped" }
    ]);
  });

  it("cancels formatting other than the three marks, and turns Enter into a line break", () => {
    const page = openPage();
    page.api.open(page.host, { html: "", onDone: () => {}, confirmDiscard: async () => true });
    const fire = (inputType: string) => {
      const event = new page.window.InputEvent("beforeinput", { inputType, bubbles: true, cancelable: true });
      textBox(page).dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(fire("formatFontName")).toBe(true);
    expect(fire("formatBold")).toBe(false);
    expect(fire("insertParagraph")).toBe(true);
    expect(page.commands.map((c) => c.name)).toContain("insertLineBreak");
    expect(fire("insertText")).toBe(false);
  });

  it("counts the stored length and disables Done above 6000", () => {
    const page = openPage();
    const done: string[] = [];
    page.api.open(page.host, { html: "", onDone: (notes: string) => done.push(notes), confirmDiscard: async () => true });
    typeInto(page, "<b>" + "x".repeat(5997) + "</b>");
    expect(page.host.querySelector(".notes-editor-counter")!.textContent).toBe("6001 / 6000");
    const doneButton = page.host.querySelector<HTMLElement>(".notes-editor-done")!;
    expect(doneButton.getAttribute("aria-disabled")).toBe("true");
    doneButton.click();
    expect(done).toEqual([]);
    typeInto(page, "<b>" + "x".repeat(5996) + "</b>");
    expect(doneButton.getAttribute("aria-disabled")).toBe("false");
  });

  it("takes its label and limit from the options", () => {
    const page = openPage();
    const done: string[] = [];
    page.api.open(page.host, {
      html: "", max: 1000, label: "Custom Email Message", onDone: (text: string) => done.push(text), confirmDiscard: async () => true
    });
    expect(page.host.querySelector(".notes-editor-heading")!.textContent).toBe("Custom Email Message");
    expect(page.host.querySelector(".notes-editor")!.getAttribute("aria-label")).toBe("Custom Email Message editor");
    expect(textBox(page).getAttribute("aria-label")).toBe("Custom Email Message");
    expect(page.host.querySelector(".notes-editor-counter")!.textContent).toBe("0 / 1000");
    typeInto(page, "<b>" + "x".repeat(997) + "</b>");
    expect(page.host.querySelector(".notes-editor-counter")!.textContent).toBe("1001 / 1000");
    const doneButton = page.host.querySelector<HTMLElement>(".notes-editor-done")!;
    expect(doneButton.getAttribute("aria-disabled")).toBe("true");
    doneButton.click();
    expect(done).toEqual([]);
    typeInto(page, "x".repeat(1000));
    expect(doneButton.getAttribute("aria-disabled")).toBe("false");
  });

  it("keeps Notes and 6000 without those options", () => {
    const page = openPage();
    page.api.open(page.host, { html: "", onDone: () => {}, confirmDiscard: async () => true });
    expect(page.host.querySelector(".notes-editor")!.getAttribute("aria-label")).toBe("Notes editor");
    expect(textBox(page).getAttribute("aria-label")).toBe("Notes");
    expect(page.host.querySelector(".notes-editor-counter")!.textContent).toBe("0 / 6000");
  });

  it("gives Done the stored notes and their HTML", () => {
    const page = openPage();
    const done: [string, string][] = [];
    let closed = 0;
    page.api.open(page.host, {
      html: "", onDone: (notes: string, html: string) => done.push([notes, html]), onClose: () => closed++, confirmDiscard: async () => true
    });
    typeInto(page, "<b>2*3</b><div>line <a href='https://x.test'>link</a> <img src=x></div>");
    page.host.querySelector<HTMLElement>(".notes-editor-done")!.click();
    expect(done).toEqual([["**2\\*3**\nline link ", "<strong>2*3</strong><br>line link "]]);
    expect(closed).toBe(1);
  });

  it("asks before Cancel or Escape drop a change, and keeps Escape from the card", async () => {
    const page = openPage();
    const asked: number[] = [];
    let cancelled = 0;
    let outerEscapes = 0;
    page.document.getElementById("outer")!.addEventListener("keydown", () => outerEscapes++);
    const options = { html: "same", onDone: () => {}, onCancel: () => cancelled++, confirmDiscard: async () => { asked.push(1); return false; } };

    page.api.open(page.host, options);
    page.host.querySelector<HTMLElement>(".notes-editor-cancel")!.click();
    await Promise.resolve();
    expect(asked).toEqual([]);
    expect(cancelled).toBe(1);

    page.api.open(page.host, options);
    typeInto(page, "changed");
    textBox(page).dispatchEvent(new page.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(asked).toEqual([1]);
    expect(cancelled).toBe(1);
    expect(outerEscapes).toBe(0);
  });

  it("commits on request, and refuses while over the limit", () => {
    const page = openPage();
    const done: string[] = [];
    const editor = page.api.open(page.host, { html: "", onDone: (notes: string) => done.push(notes), confirmDiscard: async () => true });
    typeInto(page, "x".repeat(6001));
    expect(editor.commit()).toBe(false);
    typeInto(page, "*kept*");
    expect(editor.commit()).toBe(true);
    expect(done).toEqual(["\\*kept\\*"]);
    expect(editor.commit()).toBe(true);
    expect(done.length).toBe(1);
  });

  describe("serialize", () => {
    const serialize = (html: string) => {
      const page = openPage();
      const root = page.document.createElement("div");
      root.innerHTML = html;
      return page.api.serialize(root);
    };

    it.each([
      ["<b>b</b> <i>i</i> <u>u</u>", "**b** *i* ++u++"],
      ["<span style='font-weight: 700'>b</span><span style='font-style: italic'>i</span>", "**b***i*"],
      ["<span style='text-decoration: underline'>u</span>", "++u++"],
      ["one<div>two</div><div><br></div><div>four</div>", "one\ntwo\n\nfour"],
      ["<p>para</p><p>graph</p>", "para\ngraph"],
      ["text<br><br>", "text"],
      ["<h1>Head</h1><ul><li>item</li></ul>", "Head\nitem"],
      ["<b>bold <i>both</i></b><i> italic</i>", "**bold *both**** italic*"],
      ["<u><b>x</b></u>", "**++x++**"],
      ["a+b \\ c", "a\\+b \\\\ c"]
    ])("writes %j as %j", (html, stored) => {
      expect(serialize(html)).toBe(stored);
    });

    it("writes adjacent marks the server reads back the same way", () => {
      const html = "<strong>bold <em>both</em></strong><em> italic</em>";
      expect(renderNotesHtml(serialize(html))).toBe(html);
    });

    it.each(cases)("reads the server's rendering of %j back to the same text", ({ stored }) => {
      expect(serialize(renderNotesHtml(stored))).toBe(stored);
    });
  });
});
