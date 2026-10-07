# Change note: task A4 (My DNA: concept map + mistake timeline)

## What a student sees (My DNA tab)
1. **Concept map**: boxes in columns (a topic comes after the topics it needs), arrows from a topic to the topic it unlocks. Solid arrow = the first topic is strong enough (35% or more). Dashed arrow = not yet.
2. **Readable without colour**: each box shows a symbol, a word and a percent (✔ Solid, ◐ Shaky, ○ New, ⊘ Locked) and has its own border style (thick, round, dotted, dashed). A legend is printed under the map.
3. **Topic by topic** (the same map in words, good for screen readers and small phones): status, percent, "Needs: ...", "Unlocks: ...". A locked topic adds **To unlock: reach 35% in Variables (now 0%)**.
4. **Mistake timeline**: for each mistake, a dated list: made this mistake / missed the follow-up check / passed the follow-up check (fixed). Dates are in words ("3 days ago") and use the app clock.
5. "What NOVA has learned about you" is kept as before.

## Files
New:
- `src/core/engine/dna.ts` (pure: `buildConceptMap`, `buildMistakeTimeline`)
- `src/core/engine/dna.test.ts` (7 tests)
- `src/ui/screens/dna.test.tsx` (4 tests)
- `CHANGES_A4.md`

Changed:
- `src/ui/screens/Dna.tsx` (rewritten)
- `src/core/engine/index.ts` (one export line)
- `docs/BACKLOG.md`, `docs/PROJECT_DESIGN_REPORT.md` (A4 done, 68 tests)

NOT changed: `types.ts`, `ports.ts`, `config.ts`, `styles.css`, `package.json`. No new library.

## Honest limits
- Tested in jsdom only. I did NOT see the map in a real browser. Please look at it (sizes, wrapping, dark mode). The map is 4 columns wide (about 700 px), so on a phone it scrolls sideways inside its card. The word list below it is the phone-friendly view.
- "Seen N times" counts every wrong tagged answer, including missed follow-up checks. So Aarav shows "seen 7 times" while the timeline shows 5 "made this mistake" and 2 "missed the follow-up check".
- The timeline uses the attempt history, which is capped at 200 answers. Very old entries can drop off, but the "seen" count stays right.
- Locked topics follow the existing rule (a prerequisite below 35%). A new learner has 0% in Variables, so Lists and Loops show as Locked even if the check showed they know them. This comes from Variables having no questions yet (B2), not from the map.

## Commands (PowerShell, in C:\bunny\Hackathons\nova)
```
Expand-Archive -Path .\nova-A4-changes.zip -DestinationPath . -Force
npm run check
npm run dev
```
Try it: Load demo learners, open "Aarav", My DNA. Then "Fresh learner", My DNA (locked topics with the unlock text). Try the keyboard (Tab) and your system dark mode.
