import type { Migration } from "kysely/migration";
import * as extensionsAndAuth from "./001-extensions-and-auth.js";
import * as polls from "./002-polls.js";
import * as participation from "./003-participation.js";
import * as voteHistory from "./004-vote-history.js";
import * as launchedAt from "./005-launched-at.js";
import * as userPermissions from "./006-user-permissions.js";
import * as titleLengths from "./007-title-lengths.js";
import * as emailKey from "./008-email-key.js";
import * as termsAndPrivacy from "./009-terms-and-privacy.js";
import * as invitations from "./010-invitations.js";
import * as invitationTokens from "./011-invitation-tokens.js";

/** Applied in key order; add a new migration by appending the next number. */
export const migrations: Record<string, Migration> = {
  "001-extensions-and-auth": extensionsAndAuth,
  "002-polls": polls,
  "003-participation": participation,
  "004-vote-history": voteHistory,
  "005-launched-at": launchedAt,
  "006-user-permissions": userPermissions,
  "007-title-lengths": titleLengths,
  "008-email-key": emailKey,
  "009-terms-and-privacy": termsAndPrivacy,
  "010-invitations": invitations,
  "011-invitation-tokens": invitationTokens
};
