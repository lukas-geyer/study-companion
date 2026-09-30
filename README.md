# Study Companion

A study planner that works around your week. You enter your exams and your classes; the app fills your
free time with focused study blocks, keeps flashcards (e.g. Anki) going every day, and re-plans as soon as
something changes. It runs in the browser, can be installed on a phone like an app, works offline, and keeps
all data on the device.

"Study Companion" is a working title. The name lives in `src/config.ts`, `index.html` (title tags) and
`public/manifest.webmanifest`.

## What it does

- **Today** – an agenda of the day: classes, flashcard reviews, follow-ups after long class days, deep and
  focus blocks per exam (with study tips for the current phase), free slots, a "now" line. Tick blocks off;
  unfinished work flows into the next days.
- **Week** – a calendar grid of classes and planned blocks, with hours per exam.
- **Year** – exam timeline with each exam's prep window, weekly study load chart, and a status per exam
  (✓ on track, ~ tight, ! short by N hours).
- **Setup** – exams (date, hours, prep weeks, flashcard deck size), timetable (calendar import from any
  .ics file, typical week, breaks, courses linked to exams), daily rhythm (study window, hours per day,
  block lengths, meals, time off), flashcards, language/region/look, and your data (backup, restore,
  calendar export, reset).
- Setup assistant on first start, and an example plan to explore.
- German and English, light and dark mode, public holidays for Austria, Germany and Switzerland.

## Run it on your computer

You need [Node.js](https://nodejs.org) (for `npm`) and [Bun](https://bun.sh) (on a Mac:
`brew install node oven-sh/bun/bun`, or the installers from both websites).

```bash
npm install          # once: downloads React, TypeScript and the build tools
bun run dev          # development server with live reload → http://localhost:5173
bun test             # tests for the planning engine
bun run typecheck    # TypeScript check
bun run build        # production build → dist/
```

To look at the production build locally: `bunx serve dist` and open the address it prints.

## Put it online (free)

The build in `dist/` is a set of static files, so any static host works. Two easy ways:

**GitHub Pages (updates itself on every push)**
1. Put this folder into a GitHub repository. On the free plan, Pages needs the repository to be public.
2. In the repository: Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` checks every pull request (typecheck, tests, build) and
   publishes the app on every push to `main`. The address is `https://<your-user>.github.io/<repository>/`.

**Netlify Drop (manual, no account setup beyond a login)**
1. Run `bun run build`.
2. Open app.netlify.com/drop and drag the `dist` folder onto the page.

Paths are relative, so the app works in a sub-folder (like GitHub Pages) as well as on its own domain.

## Install it on a phone

Open the address in the browser:
- **iPhone/iPad (Safari):** Share → "Add to Home Screen".
- **Android (Chrome):** menu → "Install app" (or the install banner).

After the first visit the app also works offline. Updates arrive the next time it is opened online.

## Your data

Everything is stored in the browser on the device (IndexedDB, with localStorage as a fallback); nothing is
uploaded and there is no account. Setup → "Your data" has a backup download and restore, which is also how
to move a plan to another device. On iPhone, the home-screen app keeps its own storage, separate from
Safari.

## How the planning works

1. **Fixed daily blocks:** flashcard reviews first, new cards after lunch, a follow-up after long class
   days, and a weekly check-in.
2. **Exam windows:** each exam's hours (minus what you already logged) are spread over its prep weeks in
   proportion to each day's free time, nearest exam first. If a window is too full, it starts earlier.
3. **Blocks:** reservations become deep blocks (default 90 min) or focus blocks (45 min) that fit the
   free slots between classes, meals and buffers, each followed by a break. The day before an exam gets a
   final review; the exam day stays free.
4. **Status:** planned + done hours are compared with the target: ✓ ≥ 97 %, ~ ≥ 85 %, otherwise short.

The engine is pure TypeScript in `src/core` (no UI code) and is covered by `tests/core.test.ts`.

## Project layout

```
index.html              entry page
src/config.ts           app name, storage keys
src/core/               planning engine: dates, holidays, timetable, flashcards, planner, .ics import/export, backups
src/state/              app state, persistence (IndexedDB → localStorage → memory), actions
src/i18n/               English and German texts, date/number formatting
src/ui/                 React components: App, Today, Week, Year, Setup, dialogs, setup assistant
src/styles/             Pastell design tokens and styles
public/                 icons, web app manifest, fonts (SIL Open Font License, see public/fonts/OFL.txt)
scripts/                build (incl. service worker), dev server, icon generator, screenshot script
tests/                  engine tests (bun test)
.github/workflows/      checks and deployment to GitHub Pages
CLAUDE.md, .claude/     notes and setup for Claude Code sessions working on this repository
```

## Towards the App Store

The app is built so the same code can be wrapped as an iOS app with [Capacitor](https://capacitorjs.com).
The rough path (on a Mac with Xcode installed):

```bash
npm install @capacitor/core @capacitor/ios
npm install -D @capacitor/cli
npx cap init "Study Companion" com.example.studycompanion --web-dir dist
bun run build && npx cap add ios
npx cap open ios         # opens Xcode: run it in the simulator or on your iPhone
# after each change: bun run build && npx cap sync
```

Before submitting to the App Store:
- Apple tends to reject apps that are only a website in a wrapper, so the iOS version should add things a
  website can't do well: study reminders as local notifications (`@capacitor/local-notifications`), maybe a
  home-screen widget.
- Store data with `@capacitor/preferences` or a file (iOS may clear web storage of apps under storage
  pressure); the storage layer is one small file, `src/state/persist.ts`.
- You need an Apple Developer Program membership, an App Store Connect entry, screenshots and a privacy
  policy (easy here: no data leaves the device).

## Ideas for later

- Reminders and notifications (native app)
- Optional sync between devices (would need accounts and a server, and a privacy policy under GDPR)
- Dragging blocks to other times, marking days as sick/off
- More regions for public holidays; semester templates per university
