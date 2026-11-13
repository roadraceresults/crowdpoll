Start a new spec for these requirements called `20261112-173151-REMOVE-VOTE`  
!! THIS FILE IS GENERATED USING THE SKILL `/speckit-requirements`. DO NOT EDIT OR DELETE THIS FILE !!  

# Initial High-Level Requirements

During our extensive manual testing of the CrowdPoll.vote platform  
we have identifed that for dynamic polls (voters may change their vote) 
users have expected to be able to remove their vote.  
Currenly, when a checkbox, or radio button is clicked to un-set a choice,  
the "Submit Vote(s)" button is disabled. 

The requirement of this feature is to allow a user to remove their vote from a dynamic poll without being blocked by the disabled "Submit Vote(s)" button.

## Decisions from the requirements report (2026-11-12 5:42 PM)

- **AM1** — A removal is the submission of an empty selection on a Dynamic-Vote poll by a voter who holds a vote;  
  un-setting some of several choices on a multiple-choice poll remains a change of vote, submitted as today.  
- **UA1** — Storage: the voter's `votes` row is kept with `choice_ids = []`, as for an invitee who has not voted yet;  
  a `vote_history` row records the empty selection, and the line-graph tally and every `cardinality(choice_ids) > 0` reader treat it as "not voted";  
  `polls.ever_voted` stays true, so the poll's edit and delete rules are unchanged.  
- **UA2** — Live counters: a removal decrements each previous choice and `total` by one, bumps `seq`, removes the pid from `voted:<session>`, sets `lastvote:<pid>:<email>` to `[]`, and leaves the trending bucket alone;  
  a later vote by the same voter is a new vote in every respect (total +1, voter limit re-checked, trending bucket +1).  
- **UA3** — Personal tabs: the consumer deletes the `user_polls` `voted` relation when it writes the removal, as a ban or reset does;  
  the poll leaves Your Votes, leaves the Home tab unless another relation keeps it, and the card no longer says "You voted";  
  `forgetTabs` refreshes the voter's tabs.  
- **UA4** — Refusals: a removal is accepted only on an OPEN Dynamic-Vote poll by a voter who currently holds a vote.  
  The state gates run first, as for a vote (an EDITING poll answers `POLL_EDITING` and the card keeps its selection), then the ban and invitation checks;  
  an empty selection from a voter without a vote answers 400 "Select at least one choice.";  
  a Final-Vote poll answers 409 "You have already voted on this poll and cannot change your vote."  
- **UA5** — After a removal the card behaves as after a vote: it flips to the front with the vote hold, the results show the new counts, "You voted" is gone;  
  the vote notice reads "Your vote was removed." (or the queued notice when the removal was queued), and the next ballot opens with nothing selected.  
- **NC1** — Submit control: the same Submit button, enabled and relabelled "Remove vote" while the selection is empty and the viewer holds a vote on a Dynamic-Vote poll;  
  it returns to "Submit vote" / "Submit votes" as soon as a choice is picked;  
  the front face's `.btn-vote-sizer` carries the widest of the three labels so both faces' buttons keep one width.  
  With no vote held and nothing selected, Submit stays disabled as today.  
- **NC2** — API: the browser sends the existing `POST /api/polls/:pid/vote` with `choiceIds: []`;  
  `postman/openapi.json` relaxes `choiceIds` to `minItems: 0` and describes the removal and the empty `myChoiceIds` in the response.  
- **NC3** — No confirmation step: one click on "Remove vote" removes the vote, and the notice says so.  
