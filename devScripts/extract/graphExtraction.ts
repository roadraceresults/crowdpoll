import type { GraphFile } from "./extractLineGraph.js";
import { type ExtractAllFields, type Heading, toPollGraphFile } from "./pollGraphFile.js";
import { writeJsonFile } from "./writeJsonFile.js";

export interface GraphInput {
  graphTitle: string;
  inputHtml: string;
  inputHistory?: string;
  html: string;
}

export interface GraphResult {
  graph: GraphFile;
  warnings: string[];
}

export class ExtractError extends Error {}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function labelsOf(graph: GraphFile): unknown[] {
  return Object.keys(graph)
    .filter((key) => key.startsWith("label_"))
    .map((key) => graph[key]);
}

function countOf(points: unknown[]): string {
  return points.length === 1 ? "1 data point" : `${points.length} data points`;
}

export async function writeGraph(result: GraphResult, heading: Heading, outputJson: string, extra?: ExtractAllFields): Promise<boolean> {
  const { graph, warnings } = result;
  for (const warning of warnings) console.error(`Warning: ${warning}`);
  console.log(`Found graph "${heading.title}": ${labelsOf(graph).join(", ")}; ${countOf(graph.data_points)}`);
  try {
    await writeJsonFile(outputJson, toPollGraphFile(graph, heading, extra));
  } catch (error) {
    console.error(`Error: cannot write ${outputJson}: ${messageOf(error)}`);
    return false;
  }
  console.log(`Wrote ${outputJson}`);
  return true;
}
