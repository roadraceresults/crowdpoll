Start a new spec for these requirements called `20261105-162941-MULTIPLE-ACCOUNT-PREVENTION`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

Currently, the Crowdpoll web app is still restricted to test users.  
However, we want to prepare for when it is opened up to the general public, by preparing the necessary infrastructure and security measures to be able to detect when a user is attempting to create multiple accounts or engage in other forms of fraudulent activity.  
The most critical aspect of the CrowdPoll service is to ensure that there is one vote per person.  
To achieve this, we need to implement robust mechanisms for user verification, account monitoring, and fraud detection, while maintaining a seamless user experience.  
We need to do this without compromising the user experience, ensuring that legitimate users can easily participate in polls while fraudulent activities are effectively mitigated.  
We also need to do this without infringing on user privacy, ensuring that any data collected for fraud detection is handled securely and in compliance with relevant regulations.  

Currently, we are using FCaptcha as a mechanism to prevent automated account creation and fraudulent activity.  
There are also safeguards in place with the Better-Auth library to enhance account security and prevent unauthorized access.  

In addition to this, the raw data that would help in detecting fraud attepts, would be tracking { account ID, device fingerprint }.  
The analysis of this data would be done offline to identify patterns indicative of fraudulent activity, without impacting the real-time user experience.  
The offline analysis would involve examining the collected data to detect when a single device finger-print signs in, and more importantly, votes multiple times with different account within a certain time frame.  
Of course, a device could be used to vote from 2 accounts legitimately, such as in a shared household scenario, so the analysis needs to account for such cases and avoid false positives.  
But consistent patterns of multiple accounts voting from the same device fingerprint within a short time frame would be indicative of fraudulent activity and should trigger further investigation.

The deliverables for this requirement includes the collection of the data.  
The analysis of the data, and the subsequent identification of potential fraudulent activity, and how it is addressed, would be a requirement for the future.

Question: one question that we would like you top consider, and research if necessary:  
would assigning each user a "Voter ID" help to make the priority of "One Vote, One Person" more clear as a part of the brand.  
The "Vote ID" would not be used to Log In, but it is just a branding element to reinforce the concept of "One Vote, One Person" and to help users easily identify their unique voting identity within the platform.  
We have also considered that this could backfire by being interpretted as a challenge to hackers when they might not otherwise target the platform, potentially drawing unwanted attention and attempts to compromise the system.

**Decision on the Voter ID**: no Voter ID is issued in this feature.  
The brand is carried in words, "One Vote, One Person", with no absolute security claim beside it.  
A Voter ID may be revisited once the fraud analysis exists.

## Decisions

- **Scope** (IN1): this feature delivers the collection of the data, with its disclosure and retention.  
  User verification, account monitoring and fraud detection are the long-term goal, for later features.  
  This feature alone does not ensure one vote per person, and nothing should claim that it does.  
- **The record** (IN2): the account ID, the fingerprint, the event (sign-in or vote), the poll for a vote, and the time.  
  It never holds the choices.  
- **Device fingerprint** (AM1): two hashes are recorded, one for the browser and one for the hardware-like attributes that browsers report alike (screen, colour depth, CPU cores, time zone, platform); no GPU, since the fingerprint library does not read it on Firefox (analysis finding I2).  
  The hardware hash alone is never to be read as one device.  
- **Sign-in events** (AM2): one per session, sent by the first page of the signed-in site that loads after the session starts and the Terms are accepted, whichever sign-in method was used.  
- **Vote events** (AM3): every vote `castVote` accepts is recorded, including changes and clears.  
  Refused requests are not recorded.  
- **Source of the fingerprint** (UA1): FingerprintJS 5 (MIT), a pinned copy committed under `src/public/` and served by CrowdPoll, with no third-party request.  
- **Stored form** (UA2): only a keyed hash (HMAC-SHA-256, with a new secret in `infra/secrets.auto.tfvars`), with a version number for the library and key.  
  Raw attributes never reach the database or the logs.  
- **Delivery** (UA3): the fingerprint is computed once at page idle and sent as a request header.  
  A missing or malformed value never delays or refuses a vote.  
  The event travels in the vote stream and is written by `writeBatch` with the votes, with empty hashes when missing.  
- **Retention** (UA4): 3 months, by monthly partition, and removed at once with the account.  
- **Access** (UA5): no screen, API or export in this feature; the data is read only by the operator, directly from the database.  
  It is not visible to poll creators or in-app administrators, is never logged, and is included in a privacy-request copy.  
- **Start of collection** (UA6): a setting, `ENV_DEVICE_EVENTS_ENABLED`, off by default; it is turned on in production after the notice in NC2, test users included.  
  When it is off, the fingerprint library is not loaded, and nothing is computed or sent.  
- **Verification** (UA7): tests prove that a vote without a fingerprint still succeeds, that no third-party request appears, and that no cookie or browser storage key remains.  
  A periodic count logs events with and without a fingerprint, as a coverage figure, with no identifying value.  
- **Basis for collection** (NC1): plain disclosure in the Privacy Policy and the Terms, stating the purpose and that it is never for advertising.  
  It is accepted once through the existing `/accept-terms` card, with a new `TERMS_VERSION`.  
  A lawyer's review is required before the public opening.  
- **Notice** (NC2): the test users are told directly, without the formal 30 days, and collection may start at once.  
  This relies on every account being a test user who agrees, so it must be confirmed before collection starts.  
  Any change that matters after the public opening keeps the policy's 30-day email.  
- **No stored browser identifier** (NC3): the fingerprint only; revisit if the coverage figure or the later analysis shows it is too unstable.  
