import type { GraphFile } from "./extractLineGraph.js";

const SUBTITLE = "Poll for Demonstration";
const POLL_CREATOR_EMAIL = "devadmin01@crowdpoll.vote";
const VOTE_COUNT = 1000;

export interface Heading {
  title: string;
  subtitle?: string;
}

export interface ExtractAllFields {
  type: string;
  url?: string;
}

function choiceKeyOf(letter: string): string {
  return `choice_${letter}`;
}

export function toPollGraphFile(graph: GraphFile, heading: Heading, extra?: ExtractAllFields): Record<string, unknown> {
  const file: Record<string, unknown> = {
    title: heading.title,
    subtitle: heading.subtitle ?? SUBTITLE,
    poll_creator_email: POLL_CREATOR_EMAIL,
    vote_count: VOTE_COUNT,
  };
  if (extra !== undefined) {
    file.type = extra.type;
    if (extra.url !== undefined) file.url = extra.url;
  }
  for (const key of Object.keys(graph)) {
    if (key.startsWith("label_")) file[choiceKeyOf(key.slice("label_".length))] = graph[key];
  }
  file.data_points = graph.data_points.map(({ date, ...values }) => {
    const point: Record<string, unknown> = { date };
    for (const [letter, value] of Object.entries(values)) point[choiceKeyOf(letter)] = value;
    return point;
  });
  return file;
}
