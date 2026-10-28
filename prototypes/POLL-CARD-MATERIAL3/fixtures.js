/*
  FIXTURES shared by every prototype page under POLL-CARD-MATERIAL3
  (REQUIREMENT CrowdPoll Header and Tab Bar, recommendation 2): the sample polls
  and the stub VoteClient, moved here out of harness.js. poll-card.html,
  MAXIMIZED-POLL-CARD/single-card.html and HEADER-TAB-BAR/header-tab-bar.html
  load it before their own harness.

  window.PollFixtures is { key: { label, poll } }. A harness copies a poll
  before showing it, so a vote on one page does not change the shared entry.
*/
(function () {
  'use strict';

  const iso = (daysAgo) => new Date(Date.now() - daysAgo * 86400000).toISOString();

  function poll(pid, title, subtitle, choices, extra) {
    return Object.assign({
      pid, title, subtitle,
      choices: choices.map((c, i) => ({ id: pid + '-c' + (i + 1), label: c[0], pct: c[1] })),
      totalVoted: 0, totalNotYetVoted: 0,
      pollState: 'OPEN', choiceMode: 'Multiple-Choice Poll',
      myChoiceIds: [], canVote: true, bookmarked: false, listedBecause: []
    }, extra);
  }

  const FIXTURES = {
    open: {
      label: 'Open, multi-choice, mid-vote',
      poll: poll('poll-open', 'Which topics should the community meeting cover?',
        'Pick every topic you would like on the agenda.',
        [['Road resurfacing', 34], ['Park renovation', 27], ['Library hours', 18],
         ['Bike lanes', 14], ['Street lighting', 7]],
        { totalVoted: 128 })
    },
    unvoted: {
      label: 'Never voted (all 0%)',
      poll: poll('poll-unvoted', 'Where should we hold the summer picnic?', 'Single choice.',
        [['Lakeside pavilion', 0], ['Central park', 0], ['School field', 0]],
        { choiceMode: 'Single-Choice Poll', totalVoted: 0 })
    },
    yesno: {
      label: 'Yes / No',
      poll: poll('poll-agree', 'Do you support extending library hours?', '',
        [['Yes', 62], ['No', 38]],
        { choiceMode: 'Single-Choice Poll', totalVoted: 341 })
    },
    closed: {
      label: 'Closed',
      poll: poll('poll-closed', 'Should the council adopt the new budget?', 'Voting has ended.',
        [['Adopt as written', 48], ['Adopt with amendments', 39], ['Reject', 13]],
        { pollState: 'CLOSED', endAt: iso(3), totalVoted: 1207, myChoiceIds: ['poll-closed-c2'] })
    },
    long: {
      label: 'Long choice list (12)',
      poll: poll('poll-colours-a', 'Which colours should the new logo use?', 'Choose up to twelve.',
        [['Red', 14], ['Orange', 12], ['Yellow', 11], ['Green', 10], ['Teal', 9], ['Blue', 9],
         ['Indigo', 8], ['Violet', 7], ['Pink', 6], ['Brown', 5], ['Grey', 5], ['Black', 4]],
        { totalVoted: 902, bookmarked: true, listedBecause: ['voted'] })
    },
    // REQUIREMENT006: the stress case the static maximized page was drawn from
    // (MAXIMIZED-POLL-CARD/single-card-static.html): a long question and the
    // 50 choices a poll may have, which is the 25px end of the maximized bars.
    fifty: {
      label: 'Fifty choices, long question',
      poll: poll('poll-fifty', 'Which of these deliberately over-long option labels wraps in the way you would want it to on a narrow card?',
        'A stress case for the type scale, the bar heights and the scroll arrows',
        [
        ['An option whose label runs on long enough to wrap onto a second line at most card widths', 4],
        ['A shorter one', 4],
        ['Another that is middling in length, as labels tend to be', 4],
        ['Fourth', 4],
        ['Fifth', 4],
        ['Sixth', 4],
        ['Seventh, which is where the scroll arrows earn their keep', 4],
        ['Bar Number 8,umber victor far ink delta foxtrot kilo romeo c', 3],
        ['Bar Number 9,yankee last golf kilo north kilo amber mike ink hotel delta upper golf j', 3],
        ['Bar Number 10,amber golf first near west amber south slate first south', 3],
        ['Bar Number 11,chalk november victor juliet victor east north ochre sierra east', 3],
        ['Bar Number 12,foxtrot', 3],
        ['Bar Number 13,uni', 3],
        ['Bar Number 14,whiskey west oscar alpha quebec quiet east plain chalk inner kilo i', 3],
        ['Bar Number 15,amber loud q', 3],
        ['Bar Number 16,india quiet', 3],
        ['Bar Number 17,amber yankee alpha quebec echo last hotel east lower north', 3],
        ['Bar Number 18,kilo juliet ink foxtrot sienna tango west far quebe', 3],
        ['Bar Number 19,oscar cha', 3],
        ['Bar Number 20,near west sienna ya', 2],
        ['Bar Number 21,far quebec west foxtrot plain kilo zulu slate outer south paper ink', 2],
        ['Bar Number 22,zulu mike delta chalk east lower umber chalk echo w', 2],
        ['Bar Number 23,hotel romeo last ink uniform north kilo', 2],
        ['Bar Number 24,delta zulu quiet delta yankee first last south alpha qu', 2],
        ['Bar Number 25,yankee quebec sierra west loud inner chalk plain inner first rom', 2],
        ['Bar Number 26,amber plain juliet inner romeo ochre near umbe', 2],
        ['Bar Number 27,quiet ochre alpha juli', 2],
        ['Bar Number 28,whiskey first near victor moss foxtrot plain near zulu u', 2],
        ['Bar Number 29,quiet romeo outer yankee upper i', 2],
        ['Bar Number 30,yankee', 2],
        ['Bar Number 31,last bravo umber lima umber yankee romeo ju', 2],
        ['Bar Number 32,uniform outer chalk xray whiskey moss linen juliet umber charl', 2],
        ['Bar Number 33,mike first last juliet delta mike oscar papa slate amber uniform victo', 1],
        ['Bar Number 34,papa first sie', 1],
        ['Bar Number 35,tango victor zulu xray juliet oscar golf romeo victor quebec east zulu', 1],
        ['Bar Number 36,zulu', 1],
        ['Bar Number 37,umber papa ink upper east south whiskey lower india victor outer jul', 1],
        ['Bar Number 38,outer xray quebec slate umber ochre lima golf xray echo tango fo', 1],
        ['Bar Number 39,hotel tango oscar pap', 1],
        ['Bar Number 40,juliet sierra zulu outer inner sierra lima s', 1],
        ['Bar Number 41,linen paper quebec inner p', 1],
        ['Bar Number 42,chalk f', 1],
        ['Bar Number 43,ink inner plain plain tango lower echo linen lower chalk lower inner m', 0],
        ['Bar Number 44,tango amber victor lin', 0],
        ['Bar Number 45,oscar sierra mike quebec ink golf mike alpha uniform last golf', 0],
        ['Bar Number 46,oscar south yankee bravo plain golf chalk foxtrot pa', 0],
        ['Bar Number 47,inner bravo first north', 0],
        ['Bar Number 48,november far pl', 0],
        ['Bar Number 49,alpha near romeo xray west ink zulu east kilo first loud bravo charl', 0],
        ['Bar Number 50,india sie', 0]
        ],
        { totalVoted: 100 })
    }
  };

  // ---- Stub VoteClient: no network. Resolves after a short delay. ----
  window.VoteClient = {
    canVote: () => true,
    QUEUED_NOTICE: 'Your vote is queued and will be processed as soon as possible.',
    submit: (pid, choiceIds) => new Promise((resolve) => {
      console.log('[sample] vote', pid, choiceIds);
      setTimeout(() => resolve({ ok: true, outcome: { status: 'recorded', choiceIds, nextRefreshMs: 0 } }), 400);
    })
  };

  window.PollFixtures = FIXTURES;
})();
