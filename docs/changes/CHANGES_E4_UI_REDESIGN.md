# E4: UI redesign (professional look, same behaviour)

## Idea
NOVA means a star. Progress is shown as stars lighting up: gold is used only for mastery and progress, iris for actions, on a deep indigo ground. Lexend (a font designed for easier reading) is bundled, so it works offline.

## What changed for the student
- **App shell:** a sidebar with icons on wide screens; on phones a top bar and a bottom tab bar (the "Teach-back" tab shows "Teach" on a phone, its full name is kept for screen readers). The learner shows as an avatar with a Switch button.
- **Page titles** on every screen (Today, Learn, Teach it back, Ask about a topic, My learning DNA, Settings).
- **Home:** the first step of today's plan is the large "up next" card, the others are compact, each with an icon. Subject picker is a small control under the title.
- **Practice:** progress bar in gold, confidence as a Sure / Unsure / Guess switch, answers as large rows with letters A to D, bigger touch targets (at least 44 px).
- **My DNA:** the concept map is now a star chart. A star is filled for solid, part-lit for shaky, dotted for new, dashed and dim for locked; the words and symbols are still there, so colour is never the only signal. Gold lines show unlocked links.
- **Welcome screen:** logo, a short line, profile cards with an avatar, and the offline status.
- **Dark and light** follow the device. **High contrast** and **text size** still work (the colour names used by high contrast were kept).
- Demo tools (with `?demo=1`) are now a slim dashed strip.

## Files
New: `src/ui/icons.tsx`, `src/ui/shell.test.tsx` (3 tests).
Changed: `src/ui/styles.css` (rewritten), `App.tsx`, `PackPicker.tsx`, `screens/Home.tsx`, `Learn.tsx`, `Ask.tsx`, `TeachBack.tsx`, `Dna.tsx`, `ProfilePicker.tsx`, `practice/PracticeSession.tsx`, `package.json`, `package-lock.json` (adds `@fontsource-variable/lexend`).
No engine, storage or content files were touched. No behaviour changed; the Ask and Teach it back headings are now level-1 page titles.

## Honest status
- `npm run check` passes (199 tests), build and `check:offline` pass. The saved app grew from 466 KB to 519 KB (185 KB gzip) because of the font (40 KB).
- Looked at in headless Chrome at 1280 px and 390 px, in dark, light and high-contrast. **Not checked on a real phone, in Safari, or with a screen reader.**
- Screens I did not review closely after the change: the quick check (Diagnostic) and the session summary. They use the shared card, button and bar styles.

## Commands
```
npm install
npm run check
npm run build
npm run check:offline
npm run dev
```
