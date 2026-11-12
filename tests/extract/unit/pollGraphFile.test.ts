import { describe, expect, it } from "vitest";
import type { GraphFile } from "../../../devScripts/extract/extractLineGraph.js";
import { toPollGraphFile } from "../../../devScripts/extract/pollGraphFile.js";

const GRAPH = {
  graph_title: "Page title",
  label_a: "Approve",
  label_b: "Disapprove",
  data_points: [
    { date: "09/01/26", a: 17, b: 80 },
    { date: "09/02/26", b: 79 },
  ],
} as GraphFile;

describe("toPollGraphFile", () => {
  it("writes the config title, the fixed fields, the choices and the points in order", () => {
    const file = toPollGraphFile(GRAPH, { title: "Typed title" });
    expect(file).toEqual({
      title: "Typed title",
      subtitle: "Poll for Demonstration",
      poll_creator_email: "devadmin01@crowdpoll.vote",
      vote_count: 1000,
      choice_a: "Approve",
      choice_b: "Disapprove",
      data_points: [
        { date: "09/01/26", choice_a: 17, choice_b: 80 },
        { date: "09/02/26", choice_b: 79 },
      ],
    });
    expect(Object.keys(file)).toEqual(["title", "subtitle", "poll_creator_email", "vote_count", "choice_a", "choice_b", "data_points"]);
    expect(Object.keys((file.data_points as object[])[0]!)).toEqual(["date", "choice_a", "choice_b"]);
    expect(typeof file.vote_count).toBe("number");
  });

  it("keeps a point's missing choices missing", () => {
    const file = toPollGraphFile(GRAPH, { title: "T" });
    expect((file.data_points as object[])[1]).not.toHaveProperty("choice_a");
  });

  it("writes the given subtitle in place of the fixed one", () => {
    expect(toPollGraphFile(GRAPH, { title: "T", subtitle: "Demo" }).subtitle).toBe("Demo");
  });

  it("writes type and url after vote_count when given", () => {
    const file = toPollGraphFile(GRAPH, { title: "T" }, { type: "politico line graph", url: "https://www.politico.eu/x" });
    expect(Object.keys(file)).toEqual([
      "title", "subtitle", "poll_creator_email", "vote_count", "type", "url", "choice_a", "choice_b", "data_points",
    ]);
    expect(file.type).toBe("politico line graph");
    expect(file).not.toHaveProperty("graph_type");
    expect(file.url).toBe("https://www.politico.eu/x");
  });

  it("leaves out url when it is not defined", () => {
    const file = toPollGraphFile(GRAPH, { title: "T" }, { type: "cnn line graph", url: undefined });
    expect(file.type).toBe("cnn line graph");
    expect(file).not.toHaveProperty("url");
    expect(toPollGraphFile(GRAPH, { title: "T" })).not.toHaveProperty("type");
  });

  it("writes oldest_age_in_days after type and url when given", () => {
    const file = toPollGraphFile(GRAPH, { title: "T" }, { type: "cnn line graph", url: "https://www.cnn.com/x", oldestAgeInDays: 365 });
    expect(Object.keys(file).slice(4, 7)).toEqual(["type", "url", "oldest_age_in_days"]);
    expect(file.oldest_age_in_days).toBe(365);
    expect(toPollGraphFile(GRAPH, { title: "T" }, { type: "cnn line graph" })).not.toHaveProperty("oldest_age_in_days");
    expect(toPollGraphFile(GRAPH, { title: "T" })).not.toHaveProperty("oldest_age_in_days");
  });
});
