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
