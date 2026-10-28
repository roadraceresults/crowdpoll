const PRIMARY = "#2C6A46";
const ON_PRIMARY = "#FFFFFF";
const TEXT = "#1A1C19";
const MUTED = "#5C6058";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SUPPORT = "support@crowdpoll.vote";
const FOOTER = [
  `Questions? Write to ${SUPPORT}.`,
  "You received this email because someone entered this address at crowdpoll.vote."
];

export interface EmailMessage {
  subject: string;
  text: string;
  html: string;
}

interface LayoutInput {
  origin: string;
  preheader: string;
  heading: string;
  headingLine2?: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  closing?: string[];
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphHtml(text: string, color = TEXT, size = 16): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:${size}px;line-height:1.5;color:${color};">${escapeHtml(text)}</p>`;
}

function policyLinksHtml(origin: string): string {
  const link = (path: string, label: string) => `<a href="${escapeHtml(origin)}${path}" style="color:${MUTED};">${label}</a>`;
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:1.5;color:${MUTED};">${link("/privacy", "Privacy Policy")} · ${link("/terms", "Terms of Service")}</p>`;
}

export function layout({ origin, preheader, heading, headingLine2, paragraphs, action, closing = [] }: LayoutInput): {
  text: string;
  html: string;
} {
  const textParts = ["CrowdPoll", headingLine2 === undefined ? heading : `${heading}
${headingLine2}`, ...paragraphs];
  if (action) textParts.push(`${action.label}:\n${action.url}`);
  const policy = action ? [`Privacy Policy: ${origin}/privacy · Terms of Service: ${origin}/terms`] : [];
  textParts.push(...closing, [...FOOTER, ...policy].join("\n"));
  const text = `${textParts.join("\n\n")}\n`;

  const actionHtml = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;"><tr><td style="background:${PRIMARY};border-radius:20px;">` +
      `<a href="${escapeHtml(action.url)}" style="display:inline-block;padding:10px 24px;font-family:${FONT};font-size:16px;font-weight:600;color:${ON_PRIMARY};text-decoration:none;">${escapeHtml(action.label)}</a>` +
      `</td></tr></table>` +
      `<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;line-height:1.5;color:${MUTED};">Or copy this link: <span style="word-break:break-all;">${escapeHtml(action.url)}</span></p>`
    : "";

  const html =
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(heading)}</title></head>` +
    `<body style="margin:0;padding:0;background:#F4F5F0;">` +
    `<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F0;"><tr><td align="center" style="padding:24px 12px;">` +
    `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:12px;overflow:hidden;">` +
    `<tr><td style="background:${PRIMARY};padding:16px 24px;">` +
    `<img src="${escapeHtml(origin)}/email-logo.png" width="48" height="48" alt="CrowdPoll" style="vertical-align:middle;border:0;">` +
    `<span style="vertical-align:middle;margin-left:12px;font-family:${FONT};font-size:22px;font-weight:700;color:${ON_PRIMARY};">CrowdPoll</span>` +
    `</td></tr>` +
    `<tr><td style="padding:24px;">` +
    `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.3;color:${TEXT};">${escapeHtml(heading)}${headingLine2 === undefined ? "" : `<br>${escapeHtml(headingLine2)}`}</h1>` +
    paragraphs.map((p) => paragraphHtml(p)).join("") +
    actionHtml +
    closing.map((p) => paragraphHtml(p)).join("") +
    `</td></tr>` +
    `<tr><td style="padding:16px 24px;border-top:1px solid #E0E3DB;">` +
    FOOTER.map((line) => paragraphHtml(line, MUTED, 13)).join("") +
    (action ? policyLinksHtml(origin) : "") +
    `</td></tr></table></td></tr></table></body></html>`;

  return { text, html };
}

function originOf(url: string): string {
  return new URL(url).origin;
}

export function loginLinkMessage(url: string, logoOrigin?: string): EmailMessage {
  return {
    subject: "Your CrowdPoll sign-in link",
    ...layout({
      origin: logoOrigin ?? originOf(url),
      preheader: "Use this link within 15 minutes to sign in to CrowdPoll.",
      heading: "Sign in to CrowdPoll",
      paragraphs: ["Use the button below to sign in. The link works once, for 15 minutes."],
      action: { label: "Sign in", url },
      closing: ["If you didn't ask to sign in, you can ignore this email; nobody can sign in without this link."]
    })
  };
}

export function createAccountMessage(url: string, logoOrigin?: string): EmailMessage {
  return {
    subject: "Finish creating your CrowdPoll account",
    ...layout({
      origin: logoOrigin ?? originOf(url),
      preheader: "Someone asked to sign in to CrowdPoll with this address, but it has no account yet.",
      heading: "Create your CrowdPoll account",
      paragraphs: [
        "Someone asked to sign in to CrowdPoll with this address, but there's no account for it yet. If it was you, create your account to continue. The button works once, for 15 minutes."
      ],
      action: { label: "Create account", url },
      closing: ["If it wasn't you, you can ignore this email; no account is created unless you finish."]
    })
  };
}

export function emailChangeVerificationMessage(url: string, logoOrigin?: string): EmailMessage {
  return {
    subject: "Confirm your new CrowdPoll email address",
    ...layout({
      origin: logoOrigin ?? originOf(url),
      preheader: "Confirm this address within 15 minutes to finish changing your CrowdPoll email.",
      heading: "Confirm your new email address",
      paragraphs: [
        "You asked to change your CrowdPoll account's email address to this one. Use the button below to confirm it. The link works once, for 15 minutes."
      ],
      action: { label: "Confirm new address", url },
      closing: ["If you didn't ask for this change, you can ignore this email; your account's address stays as it is."]
    })
  };
}

export function accountDeletedMessage(origin: string): EmailMessage {
  return {
    subject: "Your CrowdPoll account was deleted",
    ...layout({
      origin,
      preheader: "Your account and the data tied to it are gone.",
      heading: "Your account was deleted",
      paragraphs: [
        "Your CrowdPoll account for this address was deleted at your request.",
        "We deleted your account, your sessions, your bookmarks and the polls you created. Your votes on other people's polls stay counted, but no longer carry your address or name.",
        "If you did not ask for this, write to privacy@crowdpoll.vote."
      ]
    })
  };
}

export function emailChangeNoticeMessage(origin: string, newEmail: string): EmailMessage {
  return {
    subject: "Your CrowdPoll email address was changed",
    ...layout({
      origin,
      preheader: "Your CrowdPoll account now uses a different email address.",
      heading: "Your email address was changed",
      paragraphs: [
        `The email address on your CrowdPoll account was changed to ${newEmail}. This address no longer receives sign-in links.`,
        `If you didn't make this change, write to ${SUPPORT} straight away.`
      ]
    })
  };
}

export function formatPollDate(date: Date, timeZone: string | null): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone ?? "UTC",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short"
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}, ${parts.hour}:${parts.minute} ${parts.dayPeriod} ${parts.timeZoneName}`;
}

export interface InvitationInput {
  creatorName: string;
  creatorEmail: string;
  title: string;
  link: string;
  origin: string;
  anonymous: boolean;
  reminder: boolean;
  launchedAt: Date;
  endAt: Date | null;
  timeZone: string | null;
  signInAddress?: string;
}

export function invitationMessage(input: InvitationInput): EmailMessage {
  const { creatorName, creatorEmail, title, link, origin, anonymous, reminder, launchedAt, endAt, timeZone, signInAddress } = input;
  const subject = `${creatorName} invited you to a private poll on CrowdPoll: "${title}"`;
  const paragraphs = [
    `${creatorName} (${creatorEmail}) invited you to vote in their poll "${title}" on CrowdPoll. That's why we're writing to you.`,
    `It's an Invitation Only private poll: only the people ${creatorName} invites can see it and vote.`
  ];
  if (anonymous) paragraphs.push(`Your vote will be anonymous: ${creatorName} will not see how you voted.`);
  paragraphs.push(`Poll Started: ${formatPollDate(launchedAt, timeZone)}`);
  if (endAt) paragraphs.push(`Poll Ends: ${formatPollDate(endAt, timeZone)}`);
  const ignoreLine = reminder
    ? "If you'd rather not take part, just ignore this email. This is the only reminder we'll send about this poll."
    : `If you'd rather not take part, just ignore this email. We won't contact you again, except for up to one reminder about this poll if ${creatorName} re-sends it, another private invitation, or where the law requires it.`;
  return {
    subject: reminder ? `Reminder: ${subject}` : subject,
    ...layout({
      origin,
      preheader: `You're invited to vote in "${title}".`,
      heading: `${reminder ? "Reminder: you" : "You"} are invited to vote in a Private Poll:`,
      headingLine2: `"${title}"`,
      paragraphs,
      action: { label: "Open the poll", url: link },
      closing: [
        ...(signInAddress
          ? [`This button signs you in to CrowdPoll as ${signInAddress}. Please don't forward this email.`]
          : []),
        ignoreLine,
        `${creatorName} gave us your address only for this poll; our Privacy Policy (${origin}/privacy#invitations) explains how we use it and how to have it removed.`
      ]
    })
  };
}
