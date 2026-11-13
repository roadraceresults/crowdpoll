import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  accountDeletedMessage,
  createAccountMessage,
  emailChangeNoticeMessage,
  emailChangeVerificationMessage,
  layout,
  loginLinkMessage
} from "../src/email/templates.js";

const before = JSON.parse(
  readFileSync(new URL("./fixtures/email-messages-before-heading-line-2.json", import.meta.url), "utf8")
) as Record<string, { subject: string; text: string; html: string }>;

const url = "https://crowdpoll.vote/api/auth/verify?token=abc&bind=def";

describe("layout() headingLine2", () => {
  it("writes the second line after a <br> inside the heading, both escaped", () => {
    const { html } = layout({
      origin: "https://crowdpoll.vote",
      preheader: "p",
      heading: "You & me:",
      headingLine2: '"<b>Title</b>"',
      paragraphs: ["Body"]
    });
    expect(html).toContain("You &amp; me:<br>&quot;&lt;b&gt;Title&lt;/b&gt;&quot;</h1>");
  });

  it("puts the second line on its own line directly after the heading in the text part", () => {
    const { text } = layout({
      origin: "https://crowdpoll.vote",
      preheader: "p",
      heading: "Heading:",
      headingLine2: '"Title"',
      paragraphs: ["Body"]
    });
    expect(text.startsWith('CrowdPoll\n\nHeading:\n"Title"\n\nBody\n\n')).toBe(true);
  });

  it("leaves every existing message exactly as it was before the change", () => {
    const now = {
      loginLink: loginLinkMessage(url),
      loginLinkWithLogoOrigin: loginLinkMessage(url, "https://assets.example"),
      createAccount: createAccountMessage(url),
      emailChangeVerification: emailChangeVerificationMessage(url),
      accountDeleted: accountDeletedMessage("https://crowdpoll.vote"),
      emailChangeNotice: emailChangeNoticeMessage("https://crowdpoll.vote", "new@example.com")
    };
    expect(Object.keys(now).sort()).toEqual(Object.keys(before).sort());
    for (const [name, message] of Object.entries(now)) {
      expect(message, name).toEqual(before[name]);
    }
  });
});

describe("layout() header logo", () => {
  it("shows the hosted logo at 56 × 56 with its alt text", () => {
    const { html } = layout({ origin: "https://crowdpoll.vote", preheader: "p", heading: "H", paragraphs: ["B"] });
    expect(html).toContain(
      '<img src="https://crowdpoll.vote/email-logo.png" width="56" height="56" alt="CrowdPoll" style="vertical-align:middle;border:0;">'
    );
  });
});

describe("layout() messageBox", () => {
  const base = {
    origin: "https://crowdpoll.vote",
    preheader: "p",
    heading: "Heading:",
    paragraphs: ["First", "Second & more"]
  };

  it("draws the box's html unescaped in one div between the first and second paragraphs", () => {
    const { html } = layout({ ...base, messageBox: { html: "Hi <strong>all</strong><br>&lt;b&gt;", text: "Hi all\n<b>" } });
    const first = html.indexOf(">First</p>");
    const box = html.indexOf("<div style=");
    const second = html.indexOf(">Second &amp; more</p>");
    expect(first).toBeGreaterThan(0);
    expect(box).toBeGreaterThan(first);
    expect(second).toBeGreaterThan(box);
    const div = html.slice(box, html.indexOf("</div>", box) + 6);
    expect(div).toContain("border-radius:8px");
    expect(div).toContain("overflow-wrap:anywhere");
    expect(div).toContain(">Hi <strong>all</strong><br>&lt;b&gt;</div>");
    expect(html.match(/<div /g)).toHaveLength(1);
  });

  it("puts the box's text as its own paragraph after the first", () => {
    const { text } = layout({ ...base, messageBox: { html: "x", text: "Hi all\n<b>" } });
    expect(text).toContain("\n\nFirst\n\nHi all\n<b>\n\nSecond & more\n\n");
  });

  it("leaves the output unchanged without a box", () => {
    expect(layout({ ...base, messageBox: undefined })).toEqual(layout(base));
    expect(layout(base).html).not.toContain("<div");
  });
});
