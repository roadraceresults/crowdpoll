Start a new spec for these requirements called `022-BAR-COLORS`.

The path to these requirents is `designDocs\022-high-level-requirements-BAR-COLORS.md`.
The SKILL used to refine these requirements and to create the specs is:  
`speckit-mdd-architecture designDocs/022-high-level-requirements-BAR-COLORS.md`.

# Overview
This requirements document specifies the high-level requirements for assigning colors to the bars on a Poll Card.  

# Design
A recent, successfully implemented feature, was for assigning colors to the bars on a Poll Card from a vibrant palette and  
selecting font colors for text and background colors for the bars to ensure that the text is readable.  
The one drawback is that the colors on the Poll Cards on a grid with a large number of Poll Cards is very repetitive and appears as if those colors are a theme for the entire website.  

## Semantic Colors  
The current technique has two semantic colors for Yes/True and No/False bars and a palette of 50 colors for other bars.  
The semantic colors are provide an intutitive understanding of the meaning of the bars. Those will remain as is.  

## Non-Semantic Colors
The non-semantic colors are the colors for the other bars.  
The current technique is to assign colors beginning with palette entry 1 and continuing through the palette until all bars have a color assigned.  
This is done the same way for all Poll Cards resulting in a very repetitive color scheme.  

The colors will now be assigned to the bars on a Poll Card based on the Poll Card's unique ID.  
The unique id will be mapped, using a mathematical function that generates an index into the color palette.  
That index will be a number from 1 to the size of the color palette, which is the array called RESULTS_PALETTE_ENTRIES in `src\public\pollCard.js`.  

Since the index is based on the Poll Card's unique ID, the colors will vary for the Poll Cards and the colors for a Poll Card will never change since the unique ID does not change.

### Mapping the unique ID to a palette index
- The Poll Card's unique ID is the poll's id (`polls.id`, a UUID string, which reaches the card as `opts.pid`). The same poll therefore shows the same colors on every tab, in the grid and in the maximized view, and to every user.
- The mathematical function is the 32-bit FNV-1a hash of the id string's UTF-16 code units (offset basis `0x811C9DC5`, prime `0x01000193`, using `Math.imul` and `>>> 0`), taken modulo the length of the color palette (50). It uses integer arithmetic only, so every browser computes the same result.
- The index this document numbers 1 to 50 (entry 1 is darkish blue `#014182`) is that result plus one; in the code, the array index is the result itself, 0 to 49.
- The index is the palette entry of the **first non-semantic bar**. Each following non-semantic bar takes the next entry, wrapping from the last entry to the first. Semantic (Yes/No) bars still consume no palette entry. Since a poll has at most 50 choices and the palette holds 50 entries, no color repeats within one Poll Card.
- Colors follow the bars' **display order** (highest percentage first), as they do today: the first non-semantic bar from the top takes the poll's starting entry. A Poll Card's sequence of palette colors, top to bottom among the non-semantic bars, therefore never changes, and a Yes or No bar keeps its semantic color wherever it ranks; a choice that changes rank in a live refresh takes the color of its new position, as it does today.
- A Poll Card without an id (reachable only from tests) uses index 1, today's colors.
- A Poll Card's colors are fixed for a given color palette. Adding, removing or reordering an entry in `RESULTS_PALETTE_ENTRIES` recolors every Poll Card; that is accepted.
- The colors vary across Poll Cards, but no two Poll Cards are guaranteed different starting entries: with 50 possible starts, two cards on a grid will sometimes match. Nothing reorders or reassigns colors to avoid a match.

### Effect on the current implementation
- Every Poll Card whose index is not 1 shows different bar colors once this feature is deployed. Nothing stored or served changes. The README's description of the bar colors is updated.
- The tests in `tests/client-bar-colours.test.ts` that expect the palette to start at entry 1 are rewritten to expect entry `((index − 1 + i) mod 50) + 1` for the i-th non-semantic bar, counting `i` from 0, with the index computed by the same function. A case is added with a fixture id whose index is known and not 1, and a case whose bars wrap past entry 50. `ARCHITECTURE.md` and `specs/021-MAXIMIZED-POLL-CARD/contracts/ui-contracts.md`, which say the palette is taken in order from entry 1, are annotated to point to this feature.

# Functional Requirements
This feature will not affect any functional requirements of the CrowdPoll webapp.

# Assumptions
- The color technique of 021 is kept whole: the palette's contents and order, the bar tints, the derived text colors, and the text copy clipped to every bar's fill (white on a Yes/No fill, the fill's light or dark shade on a palette fill), whose color moves with the fill when a Poll Card starts at a different palette entry.
- The index is computed in the browser; no field is added to the poll, its API or its database row.
- A copied poll gets a new id, so its colors differ from the original's.
- The spec directory is `specs/022-BAR-COLORS/`.

# Exclusions
- The Yes/No semantic colors and the word rules that select them.
- The contents and order of `RESULTS_PALETTE_ENTRIES`.
- The tint and text-color rules, and bar sizing and spacing.
- The voting face's vote-row colors.
- The admin pages, which draw no result bars.
- Any server, route, `postman/openapi.json`, configuration or database change.

