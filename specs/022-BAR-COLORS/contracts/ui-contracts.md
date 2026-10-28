# UI Contract: Bar Colors (022)

Amends the "Palette" row of `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md` (bar colours
and text). Every other row there still holds.

## C1. Which palette colour a bar takes

| Item | Contract |
|---|---|
| Starting colour | Palette entry `s = FNV-1a-32(poll id) mod 50` (array index; `s + 1` in 1-based numbering) |
| Following bars | The k-th non-Yes/No bar from the top, counting from 0, takes `palette[(s + k) mod 50]` |
| Order | Display order, highest percentage first; a reorder moves colours with positions, as before |
| Yes/No | `#018826` / `#CF0234`, unchanged, and they consume no palette entry |
| No id | `s = 0` (today's colours) |
| Where | Every poll card: every tab, the grid and the maximized view |
| Stability | The same for every user, device and reload; changes only if the palette itself changes |

## C2. Unchanged

The palette's 50 colours and order; each bar's 80% (palette) or 85% (Yes/No) tint; the tint's dark
shade for text (≥ 7:1); the clipped copy over the fill (white on Yes/No, the fill's better light or
dark shade otherwise); bar sizing; the voting face; the admin pages.

## C3. Observable check

For a poll with id `poll-fifty` (s = 25) and 50 choices at 0 votes, the bars from the top take
palette entries 25, 26, … 49, 0, 1, … 24.
