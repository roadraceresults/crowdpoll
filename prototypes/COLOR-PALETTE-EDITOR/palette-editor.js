(function () {
  const SAMPLE_TEXT = "Sample text across both colors";
  const redrawers = [];
  let derivation = "proposed";
  let proposedTint = 0.9;
  const SEMANTIC_PREVIOUS_TINT = 0.85;
  const SEMANTIC_PREVIOUS_TEXT = "#FFFFFF";

  const textOverrides = {};
  Object.keys(EDITOR_TEXT_ON_FILL).forEach((hex) => { textOverrides[hex.toUpperCase()] = EDITOR_TEXT_ON_FILL[hex].toUpperCase(); });

  function blackOrWhiteOn(fill) {
    const chosen = textOverrides[fill.toUpperCase()];
    if (chosen) return chosen;
    return contrastRatio("#FFFFFF", fill) >= contrastRatio("#000000", fill) ? "#FFFFFF" : "#000000";
  }

  function deriveColors(hex) {
    if (derivation === "proposed") return barColorsFor(hex, proposedTint, blackOrWhiteOn(hex));
    return derivation === "previous"
      ? barColorsFor(hex, SEMANTIC_PREVIOUS_TINT, SEMANTIC_PREVIOUS_TEXT)
      : barColorsFor(hex, RESULTS_TRACK_TINT, inkOnFillFor(hex));
  }

  const palettes = [
    {
      id: "results",
      title: "Automated Bar Color Palette",
      source: "pollCard.js: RESULTS_PALETTE_ENTRIES",
      rows: AUTOMATED_PALETTE_ENTRIES.map((entry) => ({ hex: entry.hex.toUpperCase(), name: entry.name })),
      derive: deriveColors
    },
    {
      id: "semantic",
      title: "Semantic Color Palette",
      source: "pollCard.js: SEMANTIC_AFFIRMATIVE_COLOR, SEMANTIC_NEGATIVE_COLOR",
      rows: [
        { role: "Affirmative (Yes)", constant: "SEMANTIC_AFFIRMATIVE_COLOR", hex: SEMANTIC_PALETTE.affirmative.toUpperCase() },
        { role: "Negative (No)", constant: "SEMANTIC_NEGATIVE_COLOR", hex: SEMANTIC_PALETTE.negative.toUpperCase() }
      ],
      derive: deriveColors
    },
    {
      id: "manual",
      title: "Manual Setting Color Palette",
      source: "barPalette.ts: BAR_PALETTE",
      rows: MANUAL_PALETTE_ENTRIES.map((entry) => ({ hex: entry.hex.toUpperCase(), name: entry.name })),
      derive: deriveColors
    }
  ];
  palettes[0].rows.forEach((row) => { row.name = nearestColorName(row.hex); });
  palettes[1].rows.forEach((row) => { row.name = nearestColorName(row.hex); });
  palettes[2].rows.forEach((row) => { row.name = nearestColorName(row.hex); });

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildBar(palette, hex) {
    const { track, inkOnTrack, inkOnFill } = palette.derive(hex);
    const bar = el("div", "bar");
    bar.style.background = track;
    const fill = el("span", "bar-fill");
    fill.style.background = hex;
    const text = el("span", "bar-text", SAMPLE_TEXT);
    text.style.color = inkOnTrack;
    const overlay = el("span", "bar-ink-on-fill");
    overlay.setAttribute("aria-hidden", "true");
    const copy = el("span", "bar-text", SAMPLE_TEXT);
    copy.style.color = inkOnFill;
    overlay.appendChild(copy);
    bar.append(fill, text, overlay);
    bar.title = "Fill " + hex + ", light color " + track + ", text " + inkOnTrack + " on the light part and " + inkOnFill + " on the fill";
    return bar;
  }

  function fillDerived(box, palette, hex) {
    const { track, inkOnTrack, inkOnFill } = palette.derive(hex);
    box.querySelectorAll(".derived-chip").forEach((chip) => chip.remove());
    const anchor = box.querySelector(".text-choice");
    [
      ["Background", track, null],
      ["Text on background", inkOnTrack, track],
      ["Text on fill", inkOnFill, hex]
    ].forEach(([label, color, against]) => {
      const chip = el("span", "derived-chip");
      const swatch = el("span", "derived-swatch");
      swatch.style.background = color;
      chip.append(swatch, el("span", null, label + " "), el("b", "hex", color.toUpperCase()));
      if (against) chip.append(el("span", "contrast", " " + contrastRatio(color, against).toFixed(2) + ":1"));
      box.insertBefore(chip, anchor);
    });
  }

  function buildDerived(palette, row) {
    const box = el("div", "derived");
    const choice = el("label", "text-choice", "Text on fill ");
    const select = el("select");
    select.setAttribute("aria-label", "Text color on the fill of " + row.hex);
    [["", "Automatic"], ["#FFFFFF", "White"], ["#000000", "Black"]].forEach(([value, label]) => {
      const option = el("option", null, label);
      option.value = value;
      select.appendChild(option);
    });
    select.addEventListener("change", () => {
      if (select.value) textOverrides[row.hex] = select.value;
      else delete textOverrides[row.hex];
      redrawers.forEach((redrawRow) => redrawRow());
    });
    choice.appendChild(select);
    box.appendChild(choice);
    box.sync = () => {
      select.value = textOverrides[row.hex] || "";
      select.setAttribute("aria-label", "Text color on the fill of " + row.hex);
      fillDerived(box, palette, row.hex);
    };
    box.sync();
    return box;
  }

  function nameCase(palette, name) {
    if (palette.id !== "manual") return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function buildRow(palette, row, index) {
    const item = el("li");
    if (row.role) item.appendChild(el("div", "row-role", row.role));
    const line = el("div", "palette-row");
    const number = el("span", "row-index", String(index + 1));
    const hexText = el("span", "hex", row.hex);
    const nameInput = el("input", "name-input");
    nameInput.type = "text";
    nameInput.value = row.name;
    nameInput.setAttribute("aria-label", "Name of " + row.hex);
    nameInput.addEventListener("input", () => { row.name = nameInput.value; });

    const picker = el("input", "color-input");
    picker.type = "color";
    picker.value = row.hex.toLowerCase();
    picker.setAttribute("aria-label", "New color for " + row.hex);
    const button = el("button", null, "Change color");
    button.type = "button";
    button.addEventListener("click", () => {
      picker.value = row.hex.toLowerCase();
      if (typeof picker.showPicker === "function") picker.showPicker();
      else picker.click();
    });
    picker.addEventListener("change", () => {
      row.hex = picker.value.toUpperCase();
      row.name = nameCase(palette, nearestColorName(row.hex));
      redraw(line, palette, row, index);
    });

    let bar = buildBar(palette, row.hex);
    line.append(number, bar, hexText, nameInput, button, picker);
    const derived = buildDerived(palette, row);
    line.redraw = () => {
      const fresh = buildBar(palette, row.hex);
      bar.replaceWith(fresh);
      bar = fresh;
      derived.sync();
      hexText.textContent = row.hex;
      nameInput.value = row.name;
      nameInput.setAttribute("aria-label", "Name of " + row.hex);
    };
    item.append(line, derived);
    redrawers.push(() => line.redraw());
    return item;
  }

  function redraw(line) {
    line.redraw();
  }

  function render() {
    const host = document.getElementById("palettes");
    for (const palette of palettes) {
      const section = el("section");
      section.appendChild(el("h2", null, palette.title));
      section.appendChild(el("p", "source", palette.source));
      const list = el("ul", "palette-list");
      palette.rows.forEach((row, index) => list.appendChild(buildRow(palette, row, index)));

      section.appendChild(list);
      host.appendChild(section);
    }
  }

  function generate() {
    const results = palettes[0].rows
      .map((row) => `  { hex: '${row.hex}', name: '${row.name.replace(/'/g, "\\'")}' }`)
      .join(",\n");
    const semantic = palettes[1].rows;
    const used = new Set(palettes.flatMap((palette) => palette.rows.map((row) => row.hex)));
    const overrides = Object.keys(textOverrides).filter((hex) => used.has(hex))
      .map((hex) => `  '${hex}': '${textOverrides[hex]}'`).join(",\n");
    const manual = palettes[2].rows
      .map((row) => `  { name: ${JSON.stringify(row.name)}, hex: ${JSON.stringify(row.hex)} }`)
      .join(",\n");
    return [
      "const RESULTS_PALETTE_ENTRIES = [",
      results,
      "];",
      "",
      `const SEMANTIC_AFFIRMATIVE_COLOR = '${semantic[0].hex}';`,
      `const SEMANTIC_NEGATIVE_COLOR = '${semantic[1].hex}';`,
      "",
      "const TEXT_ON_FILL_OVERRIDES = {",
      overrides,
      "};",
      "",
      "export const BAR_PALETTE: readonly BarPaletteColor[] = [",
      manual,
      "];",
      ""
    ].join("\n");
  }

  function showOutput() {
    const output = document.getElementById("output");
    const text = document.getElementById("outputText");
    text.value = generate();
    output.hidden = false;
    document.getElementById("copyNote").textContent = "";
    output.scrollIntoView({ block: "start" });
    text.focus();
    text.select();
  }

  async function copyOutput() {
    const text = document.getElementById("outputText");
    const note = document.getElementById("copyNote");
    try {
      await navigator.clipboard.writeText(text.value);
      note.textContent = "Copied.";
    } catch {
      text.focus();
      text.select();
      note.textContent = "Select the text and copy it with Ctrl+C.";
    }
  }

  render();
  const tintInput = document.getElementById("tintInput");
  const tintValue = document.getElementById("tintValue");
  tintInput.addEventListener("input", () => {
    proposedTint = Number(tintInput.value) / 100;
    tintValue.textContent = tintInput.value + "%";
    redrawers.forEach((redrawRow) => redrawRow());
  });
  document.querySelectorAll('input[name="derivation"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      derivation = radio.value;
      redrawers.forEach((redrawRow) => redrawRow());
    });
  });
  document.getElementById("generateBtn").addEventListener("click", showOutput);
  document.getElementById("copyBtn").addEventListener("click", copyOutput);
  document.getElementById("closeOutputBtn").addEventListener("click", () => {
    document.getElementById("output").hidden = true;
  });
})();
