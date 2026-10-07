# Offline test (task D1): how to prove NOVA works with no internet

This needs **a person and a real browser**. The automated checks cannot do it for you. Do it today, and again before the demo and after any big change.

## Part 1: Automated check (30 seconds)
```
npm run build
npm run check:offline
```
It checks the production build: the service worker saves every file the page needs, there is a way to reload offline, the manifest is complete, nothing is loaded from the internet, and the saved size stays small. It also prints the saved size (use it in the evidence). CI runs it on every push. If you host under a sub-path, run it as `VITE_BASE=/NOVA/ npm run check:offline` (PowerShell: `$env:VITE_BASE="/NOVA/"; npm run check:offline`).

## Part 2: Real browser test (Chrome or Edge, a normal window, not Incognito)
1. `npm run build` then `npm run preview`. Open `http://localhost:4173`. (Service workers only work on `localhost` or `https`.)
2. Press F12, open **Application, then Service Workers**. You should see `sw.js` as **activated and running**. Under **Cache Storage** you should see the saved files.
3. Wait until the line under the NOVA title says **"Ready to work offline"**.
4. Create a profile (or load the demo learners) and answer a few questions, so there is data on the device.
5. Open the **Network** tab. Clear it. Tick **Offline** (or turn Wi-Fi off, even better).
6. Reload the page. **The app must load.** The badge must say **"Offline mode: working from files saved on this device"**.
7. Do a full 5-question practice session and open My DNA. Everything must work.
8. In the Network tab: same-site files show **(ServiceWorker)**, there are **no red failed requests** and **no requests to other websites**. Take a screenshot. This is your evidence.
9. **Strongest proof:** go back to the terminal and stop the preview server (Ctrl+C), then reload. It still loads, because the app is saved in the browser.
10. Close all browser windows, switch Wi-Fi off, open the browser and go to the same address. Check the app and your saved profile come back.
11. Optional: click the install icon in the address bar and run it as an installed app.

## Part 3: Real device (do this before the demo)
1. Host the build on any static site with HTTPS and open the link on the demo phone or laptop **once, online**. Wait for "Ready to work offline".
2. Switch on airplane mode and reopen the app from the home screen or browser. Run a full session.
3. Hosting notes: Netlify, Vercel and Cloudflare Pages serve from the site root and work as they are. **GitHub Pages project sites live under a sub-path** (`https://<user>.github.io/NOVA/`), so build with `VITE_BASE=/NOVA/` (PowerShell: `$env:VITE_BASE="/NOVA/"; npm run build`). Without it the app will not load there.

## Part 4: What to record (copy into `docs/EVIDENCE.md`)
| Item | Result | Date |
|---|---|---|
| Saved size (from `npm run check:offline`) | ___ KB gzip | |
| Badge says "Ready to work offline" after first visit | yes / no | |
| Reload with Network set to Offline works | yes / no | |
| Works with the preview server stopped | yes / no | |
| Works after closing the browser, Wi-Fi off | yes / no | |
| Network tab: failed requests / other websites | 0 / 0 | |
| Device and browser used | | |
| Screenshot saved as | `docs/evidence/offline-network.png` | |
| Weak device: time from opening to first question | ___ s | |
| Weak device: memory (Chrome Task Manager, Shift+Esc) | ___ MB | |

## If something fails
- **Page does not load offline:** the service worker was not active. Check Application, then Service Workers. Unregister it, hard reload online, wait for the badge, try again.
- **Badge stays "Not saved for offline use yet":** you are probably using `npm run dev`. The service worker only exists in the built app (`npm run preview`).
- **Old version shows after a change:** Application, then Service Workers, tick "Update on reload", or unregister it.
- **Profiles disappeared:** the browser data was cleared. Export a backup file first (profile picker has Import now; the Export button comes with task D3).
