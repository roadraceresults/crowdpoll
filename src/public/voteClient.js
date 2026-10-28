/*
  VOTE CLIENT — one vote path on the browser side. A vote is answered with the
  poll's live counts and the voter's choices, which the owning tab applies at
  once; every Vote button honours the vote floor the response hands back; a vote
  refused for load (429/503) stays pending and is retried once after the wait.
*/
(function () {
  "use strict";

  const QUEUED_NOTICE = "Your vote is queued and will be processed as soon as possible.";
  const RETRY_MESSAGE = "Your vote could not be recorded. Please try again.";
  let nextAllowedAt = 0;

  function canVote() {
    return Date.now() >= nextAllowedAt;
  }

  function holdOff(ms) {
    nextAllowedAt = Math.max(nextAllowedAt, Date.now() + ms);
  }

  async function post(pid, choiceIds) {
    const res = await fetch("/api/polls/" + encodeURIComponent(pid) + "/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choiceIds: choiceIds })
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body: body };
  }

  /*
    Resolves to { ok: true, outcome } after the vote was accepted, or
    { ok: false, status, error, code } after a definitive refusal; a 429/503 is
    retried once after retryAfterMs (+ jitter on 503) before it counts as a refusal.
  */
  async function submit(pid, choiceIds) {
    let attempt;
    try {
      attempt = await post(pid, choiceIds);
    } catch {
      return { ok: false, status: 0, error: "Your vote could not be sent. Check your connection and try again." };
    }
    if (attempt.status === 429 || attempt.status === 503) {
      const wait = (attempt.body.retryAfterMs || 2000) + (attempt.status === 503 ? Math.floor(Math.random() * 1000) : 0);
      holdOff(wait);
      await new Promise((resolve) => setTimeout(resolve, wait));
      try {
        attempt = await post(pid, choiceIds);
      } catch {
        return { ok: false, status: 0, error: RETRY_MESSAGE };
      }
      if (attempt.status === 429 || attempt.status === 503) return { ok: false, status: attempt.status, error: RETRY_MESSAGE };
    }
    if (attempt.status !== 200) {
      return { ok: false, status: attempt.status, error: attempt.body.error || RETRY_MESSAGE, code: attempt.body.code };
    }
    holdOff(attempt.body.nextRefreshMs || 0);
    return { ok: true, outcome: attempt.body };
  }

  window.VoteClient = {
    submit: submit,
    canVote: canVote,
    nextAllowedAt: () => nextAllowedAt,
    QUEUED_NOTICE: QUEUED_NOTICE
  };
})();
