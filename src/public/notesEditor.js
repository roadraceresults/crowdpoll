// execCommand: https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand
// beforeinput input types: https://w3c.github.io/input-events/#interface-InputEvent-Attributes
(function () {
  "use strict";

  const NOTES_MAX = 6000;
  const MARKS = [
    { name: "bold", label: "Bold", shortcut: "B", tag: "strong" },
    { name: "italic", label: "Italic", shortcut: "I", tag: "em" },
    { name: "underline", label: "Underline", shortcut: "U", tag: "u" }
  ];
  const NESTING = ["bold", "underline", "italic"];
  const OPENER = { bold: "**", underline: "++", italic: "*" };
  const ALLOWED_FORMATS = ["formatBold", "formatItalic", "formatUnderline"];
  const BLOCKS = new Set(["DIV", "P", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE"]);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function marksOf(node, inherited) {
    const marks = { ...inherited };
    const tag = node.tagName;
    const style = node.style || {};
    const weight = style.fontWeight;
    if (tag === "B" || tag === "STRONG" || weight === "bold" || weight === "bolder" || Number(weight) >= 600) marks.bold = true;
    if (tag === "I" || tag === "EM" || style.fontStyle === "italic") marks.italic = true;
    if (tag === "U" || /underline/.test(style.textDecoration || "") || /underline/.test(style.textDecorationLine || "")) marks.underline = true;
    return marks;
  }

  function runsOf(root) {
    const runs = [];
    const endsWithBreak = () => runs.length === 0 || runs[runs.length - 1].text.endsWith("\n");
    function push(text, marks) {
      if (!text) return;
      const last = runs[runs.length - 1];
      if (last && last.bold === !!marks.bold && last.italic === !!marks.italic && last.underline === !!marks.underline) {
        last.text += text;
      } else {
        runs.push({ text, bold: !!marks.bold, italic: !!marks.italic, underline: !!marks.underline });
      }
    }
    function walk(node, marks) {
      if (node.nodeType === 3) {
        push(node.nodeValue.replace(/\r\n?/g, "\n"), marks);
        return;
      }
      if (node.nodeType !== 1) return;
      if (node.tagName === "BR") {
        push("\n", marks);
        return;
      }
      const block = BLOCKS.has(node.tagName);
      if (block && !endsWithBreak()) push("\n", marks);
      const inner = marksOf(node, marks);
      node.childNodes.forEach((child) => walk(child, inner));
    }
    root.childNodes.forEach((child) => walk(child, {}));
    while (runs.length) {
      const last = runs[runs.length - 1];
      last.text = last.text.replace(/\n+$/, "");
      if (last.text) break;
      runs.pop();
    }
    return runs;
  }

  function escapeText(text) {
    return text.replace(/[\\*+]/g, "\\$&");
  }

  function serializeRuns(runs) {
    let out = "";
    let open = [];
    for (const run of runs) {
      const target = NESTING.filter((mark) => run[mark]);
      let keep = 0;
      while (keep < open.length && keep < target.length && open[keep] === target[keep]) keep++;
      for (let i = open.length - 1; i >= keep; i--) out += OPENER[open[i]];
      for (let i = keep; i < target.length; i++) out += OPENER[target[i]];
      open = target;
      out += escapeText(run.text);
    }
    for (let i = open.length - 1; i >= 0; i--) out += OPENER[open[i]];
    return out;
  }

  function serialize(root) {
    return serializeRuns(runsOf(root));
  }

  function htmlOf(runs) {
    const holder = document.createElement("div");
    for (const run of runs) {
      let parent = holder;
      for (const mark of NESTING) {
        if (!run[mark]) continue;
        const wrapper = el(MARKS.find((m) => m.name === mark).tag);
        parent.appendChild(wrapper);
        parent = wrapper;
      }
      run.text.split("\n").forEach((line, i) => {
        if (i > 0) parent.appendChild(document.createElement("br"));
        if (line) parent.appendChild(document.createTextNode(line));
      });
    }
    return holder.innerHTML;
  }

  function applyMark(name) {
    document.execCommand("styleWithCSS", false, false);
    document.execCommand(name, false, null);
  }

  function open(host, options) {
    const root = el("section", "notes-editor");
    root.setAttribute("aria-label", "Notes editor");

    const bar = el("div", "notes-editor-bar");
    const heading = el("h3", "notes-editor-heading", "Notes");
    const actions = el("div", "notes-editor-actions");
    const cancel = el("button", "notes-editor-cancel", "Cancel");
    const done = el("button", "notes-editor-done", "Done");
    cancel.type = done.type = "button";
    actions.append(cancel, done);
    bar.append(heading, actions);

    const toolbar = el("div", "notes-editor-toolbar");
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Formatting");
    const buttons = MARKS.map((mark) => {
      const button = el("button", "notes-editor-mark notes-editor-" + mark.name, mark.shortcut);
      button.type = "button";
      button.setAttribute("aria-label", mark.label);
      button.setAttribute("aria-pressed", "false");
      button.title = mark.label + " (Ctrl+" + mark.shortcut + ")";
      button.dataset.mark = mark.name;
      return button;
    });
    toolbar.append(...buttons);

    const text = el("div", "notes-editor-text");
    text.setAttribute("contenteditable", "true");
    text.tabIndex = 0;
    text.setAttribute("role", "textbox");
    text.setAttribute("aria-multiline", "true");
    text.setAttribute("aria-label", "Notes");
    text.innerHTML = options.html || "";

    const counter = el("p", "notes-editor-counter");
    counter.setAttribute("aria-live", "polite");

    root.append(bar, toolbar, text, counter);
    host.replaceChildren(root);

    const initial = serialize(text);
    let closed = false;

    function overLimit() {
      return serialize(text).length > NOTES_MAX;
    }

    function refresh() {
      const length = serialize(text).length;
      counter.textContent = length + " / " + NOTES_MAX;
      done.setAttribute("aria-disabled", String(length > NOTES_MAX));
      counter.classList.toggle("is-error", length > NOTES_MAX);
    }

    function refreshMarks() {
      if (closed) return;
      if (!text.isConnected) {
        close();
        return;
      }
      const selection = document.getSelection && document.getSelection();
      if (!selection || !selection.anchorNode || !text.contains(selection.anchorNode)) return;
      for (const button of buttons) {
        let on = false;
        try {
          on = document.queryCommandState(button.dataset.mark) === true;
        } catch {
          on = false;
        }
        button.setAttribute("aria-pressed", String(on));
      }
    }

    function insertPlainText(value) {
      if (value) document.execCommand("insertText", false, value.replace(/\r\n?/g, "\n"));
    }

    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener("selectionchange", refreshMarks);
      if (options.onClose) options.onClose();
    }

    function changed() {
      return serialize(text) !== initial;
    }

    function finish() {
      const runs = runsOf(text);
      options.onDone(serializeRuns(runs), htmlOf(runs));
      close();
    }

    function commit() {
      if (closed) return true;
      if (overLimit()) {
        text.focus();
        return false;
      }
      finish();
      return true;
    }

    async function cancelEditing() {
      if (changed() && !(await options.confirmDiscard())) {
        text.focus();
        return;
      }
      close();
      if (options.onCancel) options.onCancel();
    }

    for (const button of buttons) {
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        text.focus();
        applyMark(button.dataset.mark);
        refresh();
        refreshMarks();
      });
    }
    done.addEventListener("click", () => {
      if (!overLimit()) finish();
    });
    cancel.addEventListener("click", cancelEditing);
    root.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancelEditing();
    });
    text.addEventListener("beforeinput", (event) => {
      if (event.inputType === "insertParagraph") {
        event.preventDefault();
        document.execCommand("insertLineBreak");
      } else if (event.inputType.startsWith("format") && !ALLOWED_FORMATS.includes(event.inputType)) {
        event.preventDefault();
      }
    });
    text.addEventListener("paste", (event) => {
      event.preventDefault();
      insertPlainText(event.clipboardData ? event.clipboardData.getData("text/plain") : "");
    });
    text.addEventListener("drop", (event) => {
      event.preventDefault();
      insertPlainText(event.dataTransfer ? event.dataTransfer.getData("text/plain") : "");
    });
    text.addEventListener("input", () => {
      refresh();
      refreshMarks();
      if (options.onInput) options.onInput();
    });
    document.addEventListener("selectionchange", refreshMarks);

    refresh();
    text.focus();
    return { element: root, commit, close, cancel: cancelEditing, changed };
  }

  window.NotesEditor = { NOTES_MAX, open, serialize, runsOf, htmlOf, serializeRuns };
})();
