import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Transporter } from "nodemailer";
import { loadConfig } from "../src/config.js";
import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  MailError,
  createTransportFor,
  initMailer,
  maskAddress,
  sendEmailChangeNotice,
  sendLoginLink,
  setTransport
} from "../src/email/mailer.js";
import {
  createAccountMessage,
  emailChangeNoticeMessage,
  emailChangeVerificationMessage,
  escapeHtml,
  loginLinkMessage
} from "../src/email/templates.js";

const SECRET = "test-secret-0123456789-0123456789-0123456789";
const LINK = "https://crowdpoll.vote/api/auth/verify?token=secret-token-value&stay=0";

function useTransport(sendMail: (message: unknown) => Promise<unknown>): void {
  setTransport({ sendMail } as unknown as Transporter);
}

function logged(spy: { mock: { calls: unknown[][] } }): string {
  return spy.mock.calls.map((call) => call.map(String).join(" ")).join("\n");
}

describe("maskAddress", () => {
  it("keeps the first character of the local part and the domain", () => {
    expect(maskAddress("jsmith@example.org")).toBe("j•••@example.org");
  });

  it("handles a one-character local part", () => {
    expect(maskAddress("a@example.org")).toBe("a•••@example.org");
  });
});

describe("send logging and timeout", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
    initMailer(loadConfig({ ENV_BETTER_AUTH_SECRET: SECRET, ENV_PUBLIC_ORIGIN: "http://localhost:8080", ENV_EMAIL_SEND_TIMEOUT: "50" }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the type, the masked recipient and the message id", async () => {
    useTransport(async () => ({ messageId: "test-1" }));
    await sendLoginLink("jsmith@example.org", LINK);
    expect(logged(log)).toContain("Sent login-link to j•••@example.org (message id test-1)");
  });

  it("never logs the full address, the link or its token", async () => {
    useTransport(async () => ({ messageId: "test-2" }));
    await sendLoginLink("jsmith@example.org", LINK);
    useTransport(async () => {
      throw new Error("refused");
    });
    await expect(sendLoginLink("jsmith@example.org", LINK)).rejects.toBeInstanceOf(MailError);
    const all = `${logged(log)}\n${logged(error)}`;
    expect(all).not.toContain("jsmith@example.org");
    expect(all).not.toContain("secret-token-value");
    expect(all).not.toContain(LINK);
  });

  it("fails a send that runs past the timeout", async () => {
    useTransport(() => new Promise(() => {}));
    await expect(sendLoginLink("jsmith@example.org", LINK)).rejects.toBeInstanceOf(MailError);
    expect(logged(log)).toContain("Timed out sending login-link to j•••@example.org");
  });
});

describe("SES transport (US1)", () => {
  it("sends through the SES v2 API and returns SES's message id", async () => {
    const sent: unknown[] = [];
    const sesClient = {
      config: { region: async () => "ca-central-1" },
      send: async (command: unknown) => {
        sent.push(command);
        return { MessageId: "abc" };
      }
    };
    const config = loadConfig({
      ENV_BETTER_AUTH_SECRET: SECRET,
      ENV_PUBLIC_ORIGIN: "http://localhost:8080",
      ENV_EMAIL_TRANSPORT: "ses",
      ENV_SES_REGION: "ca-central-1",
      ENV_SES_ACCESS_KEY_ID: "key-id",
      ENV_SES_SECRET_ACCESS_KEY: "secret-key"
    });
    const transport = createTransportFor(config, sesClient);
    const info = await transport.sendMail({
      from: config.emailFrom,
      to: "jsmith@example.org",
      subject: "Test",
      text: "Hello"
    });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toBeInstanceOf(SendEmailCommand);
    expect(info.messageId).toBe("<abc@ca-central-1.amazonses.com>");
  });
});

describe("branded layout and messages (US2)", () => {
  const ORIGIN = "https://crowdpoll.vote";
  const URL_WITH_QUOTE = `${ORIGIN}/api/auth/verify?token=a"b<script>&stay=0`;

  it("builds every action message on the shared layout", () => {
    for (const message of [
      loginLinkMessage(`${ORIGIN}/api/auth/verify?token=t&stay=0`),
      createAccountMessage(`${ORIGIN}/create-account`),
      emailChangeVerificationMessage(`${ORIGIN}/api/me/email-change/verify?token=t`)
    ]) {
      expect(message.html).toContain(`src="${ORIGIN}/email-logo.png"`);
      expect(message.html).toContain('alt="CrowdPoll"');
      expect(message.html).toContain("support@crowdpoll.vote");
      expect(message.html).toContain("Or copy this link:");
      expect(message.text).toContain("support@crowdpoll.vote");
      expect(message.text).toMatch(/\nhttps:\/\/crowdpoll\.vote\/\S+\n/);
    }
  });

  it("uses the approved wording (M1–M4)", () => {
    expect(loginLinkMessage(`${ORIGIN}/x`).subject).toBe("Your CrowdPoll sign-in link");
    expect(createAccountMessage(`${ORIGIN}/x`).subject).toBe("Finish creating your CrowdPoll account");
    expect(emailChangeVerificationMessage(`${ORIGIN}/x`).subject).toBe("Confirm your new CrowdPoll email address");
    expect(emailChangeNoticeMessage(ORIGIN, "new@example.org").subject).toBe(
      "Your CrowdPoll email address was changed"
    );
  });

  it("links the Privacy Policy and Terms from every action message's footer (M2)", () => {
    for (const message of [
      loginLinkMessage(`${ORIGIN}/api/auth/verify?token=t&stay=0`),
      createAccountMessage(`${ORIGIN}/create-account`),
      emailChangeVerificationMessage(`${ORIGIN}/api/me/email-change/verify?token=t`)
    ]) {
      expect(message.text).toContain(`Privacy Policy: ${ORIGIN}/privacy · Terms of Service: ${ORIGIN}/terms`);
      expect(message.html).toContain(`<a href="${ORIGIN}/privacy"`);
      expect(message.html).toContain(`<a href="${ORIGIN}/terms"`);
    }
  });

  it("gives the change notice no action link", () => {
    const notice = emailChangeNoticeMessage(ORIGIN, "new@example.org");
    expect(notice.html).not.toContain("<a href");
    expect(notice.text).not.toMatch(/https?:\/\//);
    expect(notice.text).toContain("new@example.org");
  });

  it("escapes every inserted value in the HTML", () => {
    const login = loginLinkMessage(URL_WITH_QUOTE);
    expect(login.html).not.toContain("<script>");
    expect(login.html).toContain("a&quot;b&lt;script&gt;&amp;stay=0");
    const notice = emailChangeNoticeMessage(ORIGIN, '"x"<b>@example.org');
    expect(notice.html).not.toContain("<b>@");
    expect(notice.html).toContain("&quot;x&quot;&lt;b&gt;@example.org");
    expect(escapeHtml(`<&>"'`)).toBe("&lt;&amp;&gt;&quot;&#39;");
  });
});

describe("logo origin (ENV_EMAIL_ASSET_ORIGIN)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function sentHtml(env: Record<string, string>, link: string): Promise<string> {
    vi.spyOn(console, "log").mockImplementation(() => {});
    initMailer(loadConfig({ ENV_BETTER_AUTH_SECRET: SECRET, ENV_PUBLIC_ORIGIN: "http://localhost:8080", ...env }));
    let html = "";
    useTransport(async (message) => {
      html = (message as { html: string }).html;
      return { messageId: "logo" };
    });
    await sendLoginLink("jsmith@example.org", link);
    return html;
  }

  it("loads the logo from the setting when it is set", async () => {
    const html = await sentHtml(
      { ENV_EMAIL_ASSET_ORIGIN: "https://crowdpoll.vote" },
      "http://localhost:8080/api/auth/verify?token=t&stay=0"
    );
    expect(html).toContain('src="https://crowdpoll.vote/email-logo.png"');
    expect(html).toContain('href="http://localhost:8080/api/auth/verify?token=t&amp;stay=0"');
  });

  it("loads the logo from the link's origin when it is not", async () => {
    const html = await sentHtml({}, "http://localhost:8080/api/auth/verify?token=t&stay=0");
    expect(html).toContain('src="http://localhost:8080/email-logo.png"');
  });

  it("uses the setting for the change notice too", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    initMailer(loadConfig({ ENV_BETTER_AUTH_SECRET: SECRET, ENV_PUBLIC_ORIGIN: "http://localhost:8080", ENV_EMAIL_ASSET_ORIGIN: "https://crowdpoll.vote" }));
    let html = "";
    useTransport(async (message) => {
      html = (message as { html: string }).html;
      return { messageId: "notice" };
    });
    await sendEmailChangeNotice("http://localhost:8080", "old@example.org", "new@example.org");
    expect(html).toContain('src="https://crowdpoll.vote/email-logo.png"');
  });
});
