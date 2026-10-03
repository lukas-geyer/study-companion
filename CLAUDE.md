# Semestra – working notes for Claude

A local-first study planner. It's an installable web app (PWA), and the same build runs as the iPhone app
inside Capacitor (`ios/`). Users enter their exams and their week (classes from an .ics import or a typical week).
The engine fills the free time with study blocks and flashcard sessions, and re-plans whenever something
changes. There are no accounts and no server: all data stays on the device. The app is called Semestra, live
at https://semestra.at via GitHub Pages (contact: hallo@semestra.at; "Study Companion" was the working
title). The name lives in `src/config.ts`, `index.html` and `public/manifest.webmanifest`. Internally it is `semestra` too (`APP_ID`, `DB_NAME`, the service-worker
cache prefix); the switch from `study-companion` in October 2026 deliberately dropped the owner's test data.

The owner isn't a professional developer. Explain changes in plain language. When something needs his
GitHub account (a setting, merging a pull request), tell him exactly what to click.

## Commands

```bash
npm install            # dependencies (npm, see the note below)
bun run dev            # dev server with live reload → http://localhost:5173
bun test               # engine tests (tests/*.test.ts, bun:test)
bun run typecheck      # tsc --noEmit
bun run build          # production PWA → dist/ (hashed assets, manifest, icons, fonts, generated sw.js)
bun run build:preview  # single-file page fragment → dist-preview/index.html (claude.ai artifact preview)
bun run icons          # regenerate the PNG app icons, incl. the iOS icon and launch image (scripts/icons.ts, sharp)
bun run ios            # build + copy into the Xcode project (cap sync ios); then build/run in Xcode on a Mac
python3 scripts/shots.py [--dark] [--mobile] [--de]   # screenshots of dist/ → shots/ (Python Playwright)
node scripts/store-shots.mjs   # App Store screenshots → store/screenshots/ (needs: npm i --no-save playwright-core)
node scripts/flyer.mjs         # A4 flyer (German) → store/flyer/ (needs: npm i --no-save playwright-core qrcode)
node scripts/bmc-banner.mjs     # Buy Me a Coffee cover, DE + EN → store/bmc/ (needs: npm i --no-save playwright-core)
```

The three image scripts share `scripts/lib.mjs` (browser, local server for `dist/`, fonts, and the colour tokens read
from `legacy.css`, so flyer and banner always use the app's real colours).

- Bun is the runtime, bundler and test runner. npm is the package manager, because Bun's own installer
  has proxy problems in Claude Code cloud sessions. At session start, `.claude/settings.json` runs
  `scripts/install_pkgs.sh`, which installs with npm (in cloud sessions only).
- Before every push, run `bun run typecheck && bun test && bun run build`. CI
  (`.github/workflows/deploy.yml`) runs the same checks on every pull request and push, and deploys `main`
  to GitHub Pages.
- `.github/workflows/ios.yml` compiles the iOS app for the simulator on a GitHub Mac (no signing) whenever
  iOS-related files change. It is the only native build check available from Linux sessions.

## Architecture

- `src/core/` is the pure TypeScript engine: no DOM, no React. Everything depends on it; it depends on
  nothing.
  - `dates.ts`: days are integers (day numbers: `dn('2026-10-05')`, `isoOf(n)`). Times are minutes
    since midnight (`toMin`, `hm`).
  - `planner.ts`: `buildPlan(data, T)` returns a `Plan`, where `T` is today's day number. Also
    `dayView`, `weekTotals` and `streak`. The steps:
    1. Fixed blocks: card reviews, new cards, follow-ups, weekly review.
    2. Exam windows reserve hours in proportion to each day's free time, nearest exam first (with
       auto-extend and pace).
    3. Deep (90′) and focus (45′) blocks, each followed by a break.
    4. A final review the day before an exam; the exam day stays free.
    5. A status per exam: ok, tight or short.
  - `timetable.ts`: classes per day, from imported .ics items and the typical week. Classes after
    `knownUntil` count as "estimated".
  - Other modules:
    - `holidays.ts`: public holidays for AT, DE and CH.
    - `ics.ts` / `icsExport.ts`: calendar import and export.
    - `cards.ts`: flashcard load per day from the user's decks (`AppData.decks`; a deck linked to an exam is
      spread to finish a week before it, others run at their own new-cards-per-day). Reviews are entered as due
      cards per day, as Anki shows them, and timed at `REVIEW_MIN` (45 s) each.
    - `intervals.ts`.
    - `backup.ts`: `normalize()` is the one place that accepts old or foreign data.
    - `example.ts`: the example plan, with dates relative to today.
    - `reminders.ts`: which reminders the iOS app schedules (morning overview, before each block, evening
      check, before exams) for the next 7 days, max 60 (iOS keeps 64). Texts: `src/ui/parts/reminders.ts`.
    - `defaults.ts`, `types.ts`.
- `src/state/`:
  - `store.ts`: one immutable app state via `useSyncExternalStore`. `updateData(fn)` clones the state
    and saves with a debounce. A BroadcastChannel keeps tabs in sync.
  - `persist.ts`: iOS app: a JSON file in the app's Library folder (`DB_NAME/STORE_KEY.json`); browser:
    IndexedDB → localStorage → memory.
  - `actions.ts`: every mutation. Components never modify data directly.
- `src/i18n/`: `en.ts` is the source of truth. `de.ts` is typed against it, so a missing key fails the
  typecheck. Dates and numbers are formatted via `Intl` (de-AT/de-DE/de-CH by region, en-GB).
- `src/ui/`:
  - `App.tsx`: the shell, with tabs Today/Week/Year/Setup; the current view is in the URL hash. The tab bar
    sticks while scrolling and then widens into an edge-to-edge top bar (`.tabs.stuck` in `app.css`).
  - `views/`. Setup sections are `Fold`s (`parts/Fold.tsx`): heading + one-line hint (`fold.*` texts), closed
    until tapped; `gotoSetup(id)` opens the section it jumps to. Scripts that click into Setup open them first.
  - `Panes.tsx`: dialogs (on phones a bottom sheet with a grab handle; pull down to close).
  - `Onboarding.tsx`: the setup assistant.
  - `Legal.tsx`: imprint and privacy notice (quiet footer links, the legal pane; direct links `#imprint` and
    `#privacy`). The operator's name, address and e-mail are `IMPRINT` in `src/config.ts`. The main footer also
    has the Buy Me a Coffee link (`SUPPORT_URL`), on the website only: App Store guideline 3.1.1 forbids it in
    the iOS app, so keep it behind `!isNative` and out of `store/listing.md`.
  - `parts/common.tsx`: `Box`, input components, `ViewHead` (heading + ‹ now › of Today/Week), `Confirm` (the
    inline "remove?" bar), and the colour-variable helpers `xv()`/`av()`.
- `src/native.ts`: everything that differs in the iOS app (`isNative`, share sheet for exported files, local
  notifications). `App.tsx` reschedules all reminders shortly after every plan change; Setup shows the
  Reminders section only in the app. The
  service worker is not registered there, and web-only hints ("add to home screen") are hidden.
- `ios/` + `capacitor.config.ts`: the Capacitor iOS project (Swift Package Manager, no CocoaPods), bundle ID
  `at.semestra.app`. `SemestraViewController` (in `SceneDelegate.swift`) turns the iOS scroll bounce back on, which
  Capacitor switches off. `ios/App/App/public` is generated by `cap sync` and not committed. It can be generated
  and synced on Linux, but building and signing needs Xcode on the owner's Mac (steps in README).
- `scripts/build.ts`: Bun.build of `index.html`. It generates `sw.js` from `scripts/sw.template.js`
  (cache-first for hashed assets, network-first for the page). All URLs are relative, so the app works in
  a sub-folder (GitHub Pages).

## Invariants (users' stored data depends on them)

- Stored data carries a version (`DATA_VERSION` in `src/config.ts`). Any change to the shape of `AppData`
  must bump it and migrate the old shape in `normalize()` in `backup.ts`, with a test.
- Ticked blocks are stored by id (`${iso}_${type}_${exam || 'x'}_${k}`). Changing that scheme silently
  un-ticks everyone's history.
- Never rename `DB_NAME`, `STORE_KEY` or `APP_ID` again: that loses everyone's data.
- No network requests, analytics, external fonts or CDNs. The app must work offline, and nothing leaves
  the device.
- The privacy notice (`pv.*` texts, `Legal.tsx`) says exactly what happens to data. Anything that changes
  that (a network request, a new kind of stored data, another host than GitHub Pages) must update it and
  `legal.updated` in the same change.

## Design ("Pastell-Parameter") – keep it constant

This is the owner's pastel design system, shared with his study handbooks and flashcard decks. The tokens
are in `src/styles/legacy.css`: `:root` plus two identical dark blocks (media query and
`[data-theme="dark"]`). `src/styles/app.css` holds app-only additions (Setup folds, decks, typical-week editor,
legal pane, phone layouts). Style each element in one place: change its rule rather than overriding it.

- **Tokens:** use them only; no new hex values in components. A new token needs a light definition and
  both dark ones.
- **Palettes** (accent / `-bg` / `-mid`): lav, butter, peach, rose, mint, sky, apricot, sage, lilac.
  - Exams get them in this order; classes and courses are always grey.
  - Colour never stands alone: every block also shows the exam's short name.
- **Boxes** (`<Box kind>`): hinweis (blue, i), lerntipp (yellow, ✎), achtung (orange, !, left edge),
  praxis (green, ✓), info (grey).
- **Status pills** show a symbol and text: ✓ on track (praxis green), ~ tight (lerntipp yellow), ! short
  (achtung orange).
- **Symbols:** ◆ deep block, ◇ focus block, ↺ follow-up. The matching symbols from the design system are
  ✦ final review, ↻ card reviews and + new cards. Tentative classes are hatched, estimated ones dashed.
- **Type:**
  - Source Sans 3 for body text.
  - Nunito Sans for headings; labels and tabs are in capitals.
  - Poppins 500 for kickers.
  - The fonts are self-hosted from `public/fonts` under the OFL. Source Sans 3 has a Reserved Font Name,
    so never subset, convert or rename the font files.
- **Cards and charts:**
  - Cards are white on #f7f6fb, with a 20 px radius, a #ebe8f2 hairline and a soft drop shadow (`--raise`). Every
    card (header, setup assistant, Setup folds too) uses the same inner spacing `--card-py`/`--card-px` and one
    heading style (`.h2`); info labels (`.pill`, `.chip`, `.stat`) share one look. Keep new elements on these.
  - Charts use one series in #c3bce0 (highlighted #8b80c4).
  - The "today" line is #c4517f.
- **Checks:** check every visual change in light mode, dark mode and a narrow phone layout (≤ 640 px).

## Conventions

- Every user-facing string goes through `t()`, with keys in both `en.ts` and `de.ts`. German uses „…“
  quotes.
- React 19 function components only; no UI, router or state libraries. Runtime dependencies stay at
  react + react-dom plus the Capacitor core and its official plugins; plugin calls go through
  `src/native.ts` or `persist.ts` and must keep the web build working without them.
- Engine logic gets tests in `tests/core.test.ts`, with a fixed "today" (`const T = dn('2026-10-05')`),
  never the real date.
- `README.md` is for users (install, deploy, data). This file is about how to work on the code.

## Roadmap

- Ideas:
  - Sync between devices; this needs accounts, a server and a GDPR privacy policy.
  - Drag blocks to other times; sick/off days.
  - More holiday regions; semester templates per university.
- iOS (Capacitor project in `ios/`, built on the owner's Mac with Xcode):
  - Done: study reminders as local notifications (the native value App Store guideline 4.2 asks for).
  - Done: runs on the owner's iPhone (free Apple ID signing, October 2026); pages, scrolling and notifications
    checked on the device.
  - Ready: App Store texts and review notes in `store/listing.md`, screenshots in `store/screenshots/`. Keep
    both in step with the app (features named in the description, screens in the screenshots).
  - Next: Apple Developer Program, TestFlight, App Store submission (privacy label: no data collected).
  - Later maybe a home-screen widget (Swift, Xcode).
