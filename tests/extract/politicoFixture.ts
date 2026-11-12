// Builds minimal Politico Poll of Polls pages for tests, mirroring the saved France page's
// structure: an <h2> heading, a control div, and a `plot-trend pop-d3` block whose <svg>
// holds axis ticks, trend paths, legend texts and the rendered focus date.

export interface FixtureLine {
  key: string;
  points: [number, number][];
  label?: string;
  rawPath?: string;
}

export interface FixtureChart {
  heading: string;
  lines?: FixtureLine[];
  xTicks?: [number, string][];
  yTicks?: [number, string][];
  focusDate?: string;
  eventDate?: string;
  code?: string;
  svg?: boolean;
}

// With DEFAULT_X_TICKS and focus date 'Oct 22, 2026': x = 0 is 09/01/26 and 10 px is one day.
export const DEFAULT_X_TICKS: [number, string][] = [[0, "Sep"], [300, "Oct"]];
// With DEFAULT_Y_TICKS: value = 100 - y.
export const DEFAULT_Y_TICKS: [number, string][] = [[100, "0 %"], [0, "100 %"]];
export const DEFAULT_FOCUS_DATE = "Oct 22, 2026";

export const MACRON_HEADING = "France — President Emmanuel Macron’s approval rating";
export const MACRON_TITLE_TYPED = "France — President Emmanuel Macron's approval rating";

export function pathOf(points: [number, number][]): string {
  const segments = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x},${y}`);
  return segments.join("") + (points.length === 1 ? "Z" : "");
}

function tickOf([offset, label]: [number, string], axis: "x" | "y"): string {
  const translate = axis === "x" ? `${offset},0` : `0,${offset}`;
  return `<g class="tick" opacity="1" transform="translate(${translate})"><line stroke="currentColor"></line><text fill="currentColor">${label}</text></g>`;
}

function svgOf(chart: FixtureChart, code: string): string {
  const xTicks = (chart.xTicks ?? DEFAULT_X_TICKS).map((tick) => tickOf(tick, "x")).join("");
  const yTicks = (chart.yTicks ?? DEFAULT_Y_TICKS).map((tick) => tickOf(tick, "y")).join("");
  const lines = chart.lines ?? [];
  const paths = lines
    .map((line) => `<path class="line trend-${line.key} stroke-${code}-${line.key}" d="${line.rawPath ?? pathOf(line.points)}"></path>`)
    .join("");
  const legend = lines
    .filter((line) => line.label !== undefined)
    .map((line) => `<text class="trend-ov-name-${line.key} fill-${code}-${line.key}" text-anchor="end">${line.label}</text>`)
    .join("");
  // The UK page draws event annotations whose text also carries the date class; the real focus
  // date sits in the focus group, as on the saved pages.
  const events = chart.eventDate === undefined ? "" : `<g class="events"><line y2="400"></line><text class="date" text-anchor="middle">${chart.eventDate}</text></g>`;
  const focusDate = chart.focusDate ?? DEFAULT_FOCUS_DATE;
  const date = focusDate === "" ? "" : `<g class="focus"><text class="date" text-anchor="middle" x="500" y="-20">${focusDate}</text></g>`;
  return `<svg class="colorize"><g class="x axis">${xTicks}</g><g class="y axis">${yTicks}</g>${paths}${legend}${events}${date}</svg>`;
}

export function chartBlockOf(chart: FixtureChart, index: number): string {
  const code = chart.code ?? `FX-chart-${index + 1}`;
  const svg = chart.svg === false ? "" : svgOf(chart, code);
  return [
    `<h2 class="wp-block-heading">${chart.heading}</h2>`,
    "<div class=\"plot-trend-control pop-no-link-check\"><button>12 months</button></div>",
    `<div><div id="pop-d3-${index + 1}" class="plot-trend pop-d3" data-code="${code}" style="height: 500px">${svg}</div></div>`,
  ].join("\n");
}

export function politicoPage(charts: FixtureChart[]): string {
  const blocks = charts.map((chart, index) => chartBlockOf(chart, index)).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Poll of Polls</title></head><body>\n${blocks}\n</body></html>\n`;
}

// The standard three-line chart most tests use: Approve/Disapprove included, one-point No Opinion omitted.
export function macronChart(overrides: Partial<FixtureChart> = {}): FixtureChart {
  return {
    heading: MACRON_HEADING,
    code: "FR-presidential-approval",
    lines: [
      { key: "macron_approve", label: "Approve", points: [[0, 83], [10, 82], [20, 81]] },
      { key: "macron_disapprove", label: "Disapprove", points: [[0, 20], [10, 21], [20, 22]] },
      { key: "macron_noop", label: "No Opinion", points: [[0, 50]] },
    ],
    ...overrides,
  };
}
