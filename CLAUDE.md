# Study Companion – working notes for Claude

A local-first study planner. It's built as an installable web app (PWA) and will later be wrapped for iOS
with Capacitor. Users enter their exams and their week (classes from an .ics import or a typical week).
The engine fills the free time with study blocks and flashcard sessions, and re-plans whenever something
changes. There are no accounts and no server: all data stays on the device. "Study Companion" is a working
title; the name lives in `src/config.ts`, `index.html` and `public/manifest.webmanifest`.

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
bun run icons          # regenerate the PNG app icons (scripts/icons.ts, uses sharp)
python3 scripts/shots.py [--dark] [--mobile] [--de]   # screenshots of dist/ → shots/ (Python Playwright)
```

- Bun is the runtime, bundler and test runner. npm is the package manager, because Bun's own installer
  has proxy problems in Claude Code cloud sessions. At session start, `.claude/settings.json` runs
  `scripts/install_pkgs.sh`, which installs with npm (in cloud sessions only).
- Before every push, run `bun run typecheck && bun test && bun run build`. CI
  (`.github/workflows/deploy.yml`) runs the same checks on every pull request and push, and deploys `main`
  to GitHub Pages.

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
    - `cards.ts`: flashcard load.
    - `intervals.ts`.
    - `backup.ts`: `normalize()` is the one place that accepts old or foreign data.
    - `example.ts`: the example plan, with dates relative to today.
    - `defaults.ts`, `types.ts`.
- `src/state/`:
  - `store.ts`: one immutable app state via `useSyncExternalStore`. `updateData(fn)` clones the state
    and saves with a debounce. A BroadcastChannel keeps tabs in sync.
  - `persist.ts`: IndexedDB → localStorage → memory.
  - `actions.ts`: every mutation. Components never modify data directly.
- `src/i18n/`: `en.ts` is the source of truth. `de.ts` is typed against it, so a missing key fails the
  typecheck. Dates and numbers are formatted via `Intl` (de-AT/de-DE/de-CH by region, en-GB).
- `src/ui/`:
  - `App.tsx`: the shell, with tabs Today/Week/Year/Setup; the current view is in the URL hash.
  - `views/`.
  - `Panes.tsx`: dialogs.
  - `Onboarding.tsx`: the setup assistant.
  - `parts/common.tsx`: `Box`, input components, and the colour-variable helpers `xv()`/`av()`.
- `scripts/build.ts`: Bun.build of `index.html`. It generates `sw.js` from `scripts/sw.template.js`
  (cache-first for hashed assets, network-first for the page). All URLs are relative, so the app works in
  a sub-folder (GitHub Pages).

## Invariants (users' stored data depends on them)

- Stored data carries a version (`DATA_VERSION` in `src/config.ts`). Any change to the shape of `AppData`
  must bump it and migrate the old shape in `normalize()` in `backup.ts`, with a test.
- Ticked blocks are stored by id (`${iso}_${type}_${exam || 'x'}_${k}`). Changing that scheme silently
  un-ticks everyone's history.
- Never rename `DB_NAME`, `STORE_KEY` or `APP_ID`: that loses everyone's data.
- No network requests, analytics, external fonts or CDNs. The app must work offline, and nothing leaves
  the device.

## Design ("Pastell-Parameter") – keep it constant

This is the owner's pastel design system, shared with his study handbooks and flashcard decks. The tokens
are in `src/styles/legacy.css`: `:root` plus two identical dark blocks (media query and
`[data-theme="dark"]`). `src/styles/app.css` holds app-only additions.

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
  - Cards are white on #f7f6fb, with a 20 px radius and a #ebe8f2 hairline.
  - Charts use one series in #c3bce0 (highlighted #8b80c4).
  - The "today" line is #c4517f.
- **Checks:** check every visual change in light mode, dark mode and a narrow phone layout (≤ 640 px).

## Conventions

- Every user-facing string goes through `t()`, with keys in both `en.ts` and `de.ts`. German uses „…“
  quotes.
- React 19 function components only; no UI, router or state libraries. Runtime dependencies stay at
  react + react-dom.
- Engine logic gets tests in `tests/core.test.ts`, with a fixed "today" (`const T = dn('2026-10-05')`),
  never the real date.
- `README.md` is for users (install, deploy, data). This file is about how to work on the code.

## Roadmap

- Decide the final app name.
- Ideas:
  - Reminders and notifications (native app).
  - Sync between devices; this needs accounts, a server and a GDPR privacy policy.
  - Drag blocks to other times; sick/off days.
  - More holiday regions; semester templates per university.
- iOS: a Capacitor wrapper (steps in README), built on the owner's Mac with Xcode.
  - It must add native value (local notifications, a widget) to pass App Store guideline 4.2.
  - Storage moves to `@capacitor/preferences` through `src/state/persist.ts`.
