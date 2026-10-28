import { describe, expect, it } from "vitest";
import { formatPollDate, invitationMessage, type InvitationInput } from "../src/email/templates.js";

const BASE: InvitationInput = {
  creatorName: "David Brooks",
  creatorEmail: "david@example.com",
  title: "When do you want to meet?",
  link: "https://crowdpoll.vote/?PID=p1",
  origin: "https://crowdpoll.vote",
  anonymous: false,
  reminder: false,
  launchedAt: new Date("2026-10-26T16:59:00Z"),
  endAt: null,
  timeZone: "America/New_York"
};

const SUBJECT = 'David Brooks invited you to a private poll on CrowdPoll: "When do you want to meet?"';
const PARAGRAPH_1 =
  'David Brooks (david@example.com) invited you to vote in their poll "When do you want to meet?" on CrowdPoll. That\'s why we\'re writing to you.';
const PARAGRAPH_2 = "It's an Invitation Only private poll: only the people David Brooks invites can see it and vote.";
const ANONYMOUS = "Your vote will be anonymous: David Brooks will not see how you voted.";
const CLOSING_1 =
  "If you'd rather not take part, just ignore this email. We won't contact you again, except for up to one reminder about this poll if David Brooks re-sends it, another private invitation, or where the law requires it.";
const REMINDER_CLOSING_1 = "If you'd rather not take part, just ignore this email. This is the only reminder we'll send about this poll.";
const CLOSING_2 =
  "David Brooks gave us your address only for this poll; our Privacy Policy (https://crowdpoll.vote/privacy#invitations) explains how we use it and how to have it removed.";
const STARTED = "Poll Started: Monday, October 26, 2026, 12:59 PM EDT";
const ENDS = "Poll Ends: Monday, November 2, 2026, 5:00 PM EST";

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;");

describe("formatPollDate", () => {
  it("names the zone in force on each date", () => {
    expect(formatPollDate(new Date("2026-10-26T16:59:00Z"), "America/New_York")).toBe("Monday, October 26, 2026, 12:59 PM EDT");
    expect(formatPollDate(new Date("2026-11-02T22:00:00Z"), "America/New_York")).toBe("Monday, November 2, 2026, 5:00 PM EST");
  });

  it("writes UTC when the poll has no zone", () => {
    expect(formatPollDate(new Date("2026-10-26T16:59:00Z"), null)).toBe("Monday, October 26, 2026, 4:59 PM UTC");
  });
});

describe("M1", () => {
  const message = invitationMessage(BASE);

  it("has the subject, heading and the title on its own line", () => {
    expect(message.subject).toBe(SUBJECT);
    expect(message.text).toContain('You are invited to vote in a Private Poll:\n"When do you want to meet?"\n');
    expect(message.html).toContain(`You are invited to vote in a Private Poll:<br>${escape('"When do you want to meet?"')}</h1>`);
  });

  it("has every paragraph, the button and both closings, in order, in text and html", () => {
    const parts = [PARAGRAPH_1, PARAGRAPH_2, STARTED, "Open the poll:\nhttps://crowdpoll.vote/?PID=p1", CLOSING_1, CLOSING_2];
    let at = -1;
    for (const part of parts) {
      const next = message.text.indexOf(part);
      expect(next, part).toBeGreaterThan(at);
      at = next;
    }
    for (const part of [PARAGRAPH_1, PARAGRAPH_2, STARTED, CLOSING_1, CLOSING_2]) expect(message.html).toContain(escape(part));
    expect(message.html).toContain(">Open the poll</a>");
    expect(message.text).not.toContain(ANONYMOUS);
    expect(message.text).not.toContain("Poll Ends");
  });

  it("adds the anonymity paragraph and Poll Ends, last before the button", () => {
    const full = invitationMessage({ ...BASE, anonymous: true, endAt: new Date("2026-11-02T22:00:00Z") });
    const text = full.text;
    expect(text.indexOf(ANONYMOUS)).toBeGreaterThan(text.indexOf(PARAGRAPH_2));
    expect(text.indexOf(STARTED)).toBeGreaterThan(text.indexOf(ANONYMOUS));
    expect(text.indexOf(ENDS)).toBeGreaterThan(text.indexOf(STARTED));
    expect(text.indexOf("Open the poll:")).toBeGreaterThan(text.indexOf(ENDS));
    expect(full.html.indexOf(">Open the poll</a>")).toBeGreaterThan(full.html.indexOf(escape(ENDS)));
  });
});

describe("sign-in sentence (M1)", () => {
  const SENTENCE = "This button signs you in to CrowdPoll as maria.chen@gmail.com. Please don't forward this email.";
  const message = invitationMessage({
    ...BASE,
    link: "https://crowdpoll.vote/invite?PID=p1&token=t0",
    signInAddress: "maria.chen@gmail.com"
  });

  it("carries the invite link and the sentence under the button in the text part", () => {
    expect(message.text).toContain("Open the poll:\nhttps://crowdpoll.vote/invite?PID=p1&token=t0");
    expect(message.text.indexOf(SENTENCE)).toBeGreaterThan(message.text.indexOf("Open the poll:"));
    expect(message.text.indexOf(CLOSING_1)).toBeGreaterThan(message.text.indexOf(SENTENCE));
  });

  it("carries the sentence under the button in the html part, escaped", () => {
    expect(message.html).toContain(escape(SENTENCE));
    expect(message.html.indexOf(escape(SENTENCE))).toBeGreaterThan(message.html.indexOf(">Open the poll</a>"));
    expect(message.html.indexOf(escape(CLOSING_1))).toBeGreaterThan(message.html.indexOf(escape(SENTENCE)));
    const quoted = invitationMessage({ ...BASE, signInAddress: "o'neil@example.com" });
    expect(quoted.html).toContain("o&#39;neil@example.com");
  });

  it("is absent without a signInAddress, in the invitation and the reminder", () => {
    for (const reminder of [false, true]) {
      const plain = invitationMessage({ ...BASE, reminder });
      expect(plain.text).not.toContain("signs you in");
      expect(plain.html).not.toContain("signs you in");
    }
  });

  it("keeps the sentence in the reminder form", () => {
    const reminder = invitationMessage({ ...BASE, reminder: true, signInAddress: "maria.chen@gmail.com" });
    expect(reminder.text).toContain(SENTENCE);
    expect(reminder.text.indexOf(REMINDER_CLOSING_1)).toBeGreaterThan(reminder.text.indexOf(SENTENCE));
  });
});

describe("M2", () => {
  const message = invitationMessage({ ...BASE, reminder: true });

  it("has the Reminder subject, heading and closing", () => {
    expect(message.subject).toBe(`Reminder: ${SUBJECT}`);
    expect(message.text).toContain('Reminder: you are invited to vote in a Private Poll:\n"When do you want to meet?"');
    expect(message.text).toContain(REMINDER_CLOSING_1);
    expect(message.text).not.toContain(CLOSING_1);
    expect(message.text).toContain(CLOSING_2);
  });
});

describe("escaping", () => {
  it("escapes every value in the html", () => {
    const message = invitationMessage({ ...BASE, creatorName: "<b>Eve</b>", title: "A & <i>B</i>" });
    expect(message.html).not.toContain("<b>Eve</b>");
    expect(message.html).not.toContain("<i>B</i>");
    expect(message.html).toContain("&lt;b&gt;Eve&lt;/b&gt;");
    expect(message.html).toContain("A &amp; &lt;i&gt;B&lt;/i&gt;");
  });
});
