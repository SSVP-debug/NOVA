# Accessibility check (task D2): what a person must test by hand

Automated tests prove the text sizes, the high-contrast colours (WCAG AAA 7:1 for text, 3:1 for borders), the skip link, focus movement, labels and the Listen button. They cannot prove it feels right. Do these checks on the real demo device and write the result in `docs/EVIDENCE.md`.

## 1. Keyboard only (no mouse) - 5 minutes
Put the mouse away. Use Tab, Shift+Tab, Enter, Space and the arrow keys.
1. Reload. Press Tab once: a **"Skip to main content"** link appears. Press Enter: focus goes to the main area.
2. Tab to the tabs. Press Enter on **Practice**. Focus should land at the top of the new screen.
3. Do a full 5-question session: choose how sure you are, pick an answer, press **Check answer**, read the feedback, finish and read the summary.
4. Open **Settings**, change the text size, switch high contrast on and off, save a backup.
5. Every button must show a clear focus outline. You must never get stuck or lose track of where you are.

Result: pass / fail. Where it failed: ______

## 2. Zoom and text size - 3 minutes
1. In Settings choose **Extra large**. Then press Ctrl and + in the browser until 200%.
2. Nothing may be cut off. There must be no sideways scrolling for normal text. Buttons must still be readable.

Result: pass / fail. Where it failed: ______

## 3. High contrast - 2 minutes
Switch it on. Look at every screen: Home, Learn, Practice (right and wrong answer), My DNA, Settings. Text must be easy to read, the progress bars must be visible, and nothing may depend on colour alone.

Result: pass / fail. Where it failed: ______

## 4. Read aloud - 5 minutes (needs the device, not just the laptop)
1. Settings: turn on Read aloud. If the box is greyed out, the browser has no speech voice. Try another browser.
2. Open Learn and press **Listen**. Then a practice question, then a wrong-answer explanation.
3. **Turn Wi-Fi off and try again.** Some browsers use online voices that stop working offline. If so, install an offline voice in the system settings, or say honestly in the demo that read-aloud needs a local voice.
4. Leave the screen while it is speaking: the voice must stop.

Result: pass / fail. Browser and voice used: ______

## 5. Screen reader - 10 minutes (optional but strong evidence)
Windows: turn on Narrator (Win+Ctrl+Enter). Check that the profile screen, tabs, question, confidence buttons, answer buttons and feedback are announced in a sensible order, and that "Correct" or "Not quite" is read out without you searching for it.

Result: pass / fail / not tested. Notes: ______
