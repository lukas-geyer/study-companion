# Semestra

A study planner that works around your week. You enter your exams and your classes; the app fills your
free time with focused study blocks, keeps flashcards (e.g. Anki) going every day, and re-plans as soon as
something changes. It runs in the browser, can be installed on a phone like an app, works offline, and keeps
all data on the device.

Live at **https://semestra.at** (GitHub Pages, deployed on every push to `main`).

The app is called Semestra (semestra.at). The name lives in `src/config.ts`, `index.html` (title tags) and
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

The imprint and privacy notice are linked quietly at the bottom of every page (direct links: add `#imprint`
or `#privacy` to the address). Your name, address and e-mail for them are in `src/config.ts` (`IMPRINT`).

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
src/config.ts           app name, storage keys, imprint details
src/native.ts           what differs in the iPhone app (detection, share sheet)
src/core/               planning engine: dates, holidays, timetable, flashcards, planner, .ics import/export, backups
src/state/              app state, persistence (IndexedDB → localStorage → memory), actions
src/i18n/               English and German texts, date/number formatting
src/ui/                 React components: App, Today, Week, Year, Setup, dialogs, setup assistant, imprint/privacy
src/styles/             Pastell design tokens and styles
public/                 icons, web app manifest, fonts (SIL Open Font License, see public/fonts/OFL.txt)
scripts/                build (incl. service worker), dev server, icon generator, screenshot script
tests/                  engine tests (bun test)
ios/, capacitor.config.ts   the iPhone app (Xcode project, Capacitor settings)
.github/workflows/      checks and deployment to GitHub Pages
CLAUDE.md, .claude/     notes and setup for Claude Code sessions working on this repository
```

## The iPhone app

The iPhone app is the same web app inside a thin native shell made with [Capacitor](https://capacitorjs.com).
The Xcode project is in `ios/`; `capacitor.config.ts` sets the name (Semestra) and bundle ID
(`at.semestra.app`). In the app the plan is stored in a file in the app's own storage (iOS can clear web
storage), backups and calendar exports open the iOS share sheet, and the app works without internet.
Only in the app: optional **reminders** (Setup → Reminders): a morning overview, a heads-up before each
block, an evening check when blocks are still open, and a notice a few days before each exam.

**First time on your Mac**
1. Install **Xcode** from the Mac App Store and open it once, so it can install its components.
2. Install Node.js and Bun (see "Run it on your computer" above).
3. Get the code: `git clone https://github.com/lukas-geyer/study-companion.git`, then `cd study-companion`
   and `npm install`.
4. `bun run ios` builds the web app and copies it into the iOS project. `bun run ios:open` opens it in Xcode.
   The first time, Xcode downloads the Capacitor packages (bottom-left progress), which takes a minute.
5. In Xcode, click **App** at the top of the left sidebar → target **App** → **Signing & Capabilities** →
   **Team**: add your Apple ID and choose it. A free Apple ID is enough to run the app on your own iPhone.
6. Connect your iPhone with a cable. On the iPhone turn on Settings → Privacy & Security → **Developer Mode**
   (it restarts). Choose your iPhone at the top of the Xcode window and press ▶.

**After every change:** `bun run ios`, then ▶ in Xcode again.

**Publishing (TestFlight and App Store)**
1. Join the **Apple Developer Program** (developer.apple.com, 99 USD/year) with the same Apple ID.
2. In **App Store Connect** → Apps → **+** → New App: platform iOS, name Semestra, bundle ID `at.semestra.app`.
3. In Xcode: choose **Any iOS Device** at the top, then Product → **Archive** → **Distribute App** →
   App Store Connect. After processing, the build appears under **TestFlight** for you and testers.
4. For the App Store listing you need screenshots, a description, the privacy policy URL
   `https://semestra.at/#privacy`, a support URL (e.g. `https://semestra.at`) and the privacy label: the
   app collects no data ("Data Not Collected").
5. Apple rejects apps that are only a website in a wrapper (guideline 4.2); the reminders are what the app
   adds over the website. Mention them in the review notes.

## Ideas for later

- Optional sync between devices (would need accounts and a server, and a privacy policy under GDPR)
- Dragging blocks to other times, marking days as sick/off
- More regions for public holidays; semester templates per university
