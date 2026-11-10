# Quickstart: Poll Notes

## Automated

```
npx tsc --noEmit
npm test
```

The notes tests need nothing beyond the embedded PostgreSQL:

- the renderer's cases (research R1, R2, SC-002);
- the editor's serializer and its round trip (contract C5, SC-003);
- the card, Maximized view and step 2 in jsdom;
- search and the public page.

## Manual checks

These run the app locally (`devScripts/launch-dev.ps1`) in a current Chrome, Firefox and Safari or Edge, because jsdom
has no editing behaviour.

**Q1. Writing notes.**
1. Create a poll and open step 2, then click "... edit ⌄".
2. Type three paragraphs. Make words bold, italic and underlined with the buttons and with Ctrl/⌘+B, I, U.
3. Click Done, then Save. Reload.

Expected: the editor opens in place with the focus in it, and the buttons show the marks at the cursor. After Done,
step 2 shows two formatted lines. After the reload, the same notes come back.

**Q2. Nothing else gets in.** Paste a page from a website, with links, headings and images, and drop in an image file.
Expected: only its text arrives. Typing `<script>alert(1)</script>`, `javascript:alert(1)` and `https://example.com`
shows each one as plain text everywhere.

**Q3. Leaving the editor.**
- Change the notes and press Escape. Expected: the discard dialog appears.
- Change them again and click "Next >>". Expected: the change is kept.
- Cancel the card. Expected: the poll's old notes remain.

**Q4. The limit.** Paste text until the counter passes 6000. Expected: Done is disabled. A request sending 6001
characters is refused with "Notes must be at most 6000 characters."

**Q5. The poll card.** Publish polls with long notes, notes of one line, and no notes. Open them as a guest and logged in.
Expected:
- Long notes show two lines with an ellipsis and "Show more ⌄".
- One line shows no button.
- No notes shows no area.

**Q6. The Maximized view.**
1. Click "Show more ⌄". Expected: the card on the left without its preview, and the full notes above the line graph.
2. Narrow the window to one column. Expected: card, notes, graph.
3. Edit the notes in another tab and publish. Expected: the open view refreshes them.

**Q7. A voted poll.** Change the notes of a poll with votes. Expected: voters see the old notes until screening applies
the update. A notes text with a screened word is refused with the new message.

**Q8. Search and the public page.**
1. Search for a word that is only in a poll's notes. Expected: the poll is found.
2. Log out and open `/poll/<pid>`. Expected: the notes are under the summary, and the page source's meta description is
   unchanged.

**Q9. The admin card's read-only face, exports and copies.** Expected:
- The read-only face shows two lines of notes, and clicking them opens step 2.
- Both downloads include the notes as stored.
- A duplicate has the same notes.
