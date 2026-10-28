/*
  Sample cards for the design harness.

  Each object is one `PollDetail` — the shape the card is fed at runtime. In the
  application it is built by deltaClient.js's `toPollDetail()` from three things:
  the card projection the server published, the live vote counts, and the
  visitor's own overlay (what they voted, whether they bookmarked it). Here it is
  written out by hand so the card can be designed without a server.

  Field notes, for editing:

    pid             any unique string
    title/subtitle  the two lines at the top of the front face
    choices[]       { id, label, position, count, pct } — pct is what the bar
                    draws, so it is supplied, not computed
    totalVoted      the "N votes" line under the action row
    totalNotYetVoted  when > 0, adds "· N not yet voted" (invitation-only polls)
    choiceMode      'Single-Choice Poll' | 'Multiple-Choice Poll'
    voteMutability  'Final-Vote Poll' | 'Dynamic-Vote Poll'
    pollState       'OPEN' | 'CLOSED' | 'EDITING' | 'WAITING TO OPEN' | …
    endAt           ISO string — the date in "Poll closed on …"
    myChoiceIds[]   the visitor's own vote; selects the bars on the back face
    bookmarked      fills the star red
    canVote         false + voteBlockedReason shows the blocked message and
                    withdraws the Vote and Submit buttons
    listedBecause[] 'voted' | 'created' | 'invited' | 'bookmarked' — the italic
                    lines under the totals, shown on the personal tabs
*/

window.SAMPLE_CARDS = [
  {
    heading: "Long title, long choices, many of them",
    opts: { showVote: true, showLive: true, showBookmark: true },
    detail: {
      pid: "p7",
      title: "Which of these deliberately over-long option labels wraps in the way you would want it to on a narrow card?",
      subtitle: "A stress case for the type scale, the bar heights and the scroll arrows",
      choiceMode: "Single-Choice Poll",
      voteMutability: "Final-Vote Poll",
      pollVisibility: "Public Poll",
      pollState: "OPEN",
      startAt: null,
      endAt: null,
      choices: [
        { id: "c1", label: "An option whose label runs on long enough to wrap onto a second line at most card widths", position: 0, count: 31, pct: 31 },
        { id: "c2", label: "A shorter one", position: 1, count: 24, pct: 24 },
        { id: "c3", label: "Another that is middling in length, as labels tend to be", position: 2, count: 18, pct: 18 },
        { id: "c4", label: "Fourth", position: 3, count: 12, pct: 12 },
        { id: "c5", label: "Fifth", position: 4, count: 8, pct: 8 },
        { id: "c6", label: "Sixth", position: 5, count: 4, pct: 4 },
        { id: "c7", label: "Seventh, which is where the scroll arrows earn their keep", position: 6, count: 3, pct: 3 }
      ],
      totalVoted: 100,
      totalNotYetVoted: 0,
      contentVersion: 1,
      countsVersion: 1,
      myChoiceIds: [],
      bookmarked: false,
      canVote: true,
      voteBlockedReason: null
    }
  }
];
