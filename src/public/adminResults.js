/**
 * admin-results.html logic (US8): aggregate results + read-only
 * voted/not-yet-voted lists, Export JSON/Markdown. Remove/ban/un-ban live on
 * the Edit Poll page instead (adminPoll.js — /speckit-analyze finding I1).
 */
(function () {
  "use strict";

  const DELETED_ACCOUNT = /@deleted\.invalid$/;

  function voterLabel(v) {
    if (DELETED_ACCOUNT.test(v.emailAddress)) return "Deleted user";
    return v.userName ? v.userName + " <" + v.emailAddress + ">" : v.emailAddress;
  }

  const pid = new URLSearchParams(location.search).get("PID");

  async function load() {
    const res = await fetch("/api/admin/polls/" + encodeURIComponent(pid) + "/results");
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById("resultsTitle").textContent = data.title;
    document.getElementById("resultsSubtitle").textContent = data.subtitle || "";
    document.getElementById("resultsTotals").textContent =
      data.totalVoted + " participant" + (data.totalVoted === 1 ? "" : "s") + " voted";

    document.getElementById("resultsChoices").replaceChildren(
      ...data.choices.map((c) => {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = c.label + " — " + c.count + " (" + c.pct + "%)";
        li.appendChild(span);
        return li;
      })
    );

    document.getElementById("votedList").replaceChildren(
      ...data.voted.map((v) => {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.textContent = voterLabel(v);
        li.appendChild(span);
        return li;
      })
    );

    const notYetSection = document.getElementById("notYetVotedSection");
    if (data.notYetVoted) {
      notYetSection.style.display = "";
      document.getElementById("notYetVotedList").replaceChildren(
        ...data.notYetVoted.map((v) => {
          const li = document.createElement("li");
          const span = document.createElement("span");
          span.textContent = voterLabel(v);
          li.appendChild(span);
          return li;
        })
      );
    } else {
      notYetSection.style.display = "none";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!pid) return;
    document.getElementById("exportJsonLink").href =
      "/api/admin/polls/" + encodeURIComponent(pid) + "/export.json";
    document.getElementById("exportMdLink").href =
      "/api/admin/polls/" + encodeURIComponent(pid) + "/export.md";
    load();
  });
})();
