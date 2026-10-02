# App Store listing

Everything to paste into **App Store Connect → Apps → Semestra**. Each field shows its length and Apple's limit.
Screenshots: `store/screenshots/` (iPhone 6.9″ 1320×2868 and iPad 13″ 2064×2752, German and English); regenerate
them with `node scripts/store-shots.mjs` (see the comment at the top of that script).

## App information (once, under "App Information" and "Pricing and Availability")

| Field | Value |
| --- | --- |
| Primary language | German |
| Additional language | English (U.S.); English (U.K.) can use the same texts |
| Bundle ID | at.semestra.app |
| Category | Education; secondary: Productivity |
| Age rating | 4+ (answer "None" / "No" to every question in the questionnaire) |
| Price | Free (your decision) |
| Privacy policy URL | https://semestra.at/#privacy |
| Support URL | https://semestra.at |
| Marketing URL | https://semestra.at |
| Copyright | 2026 Lukas Geyer |
| App Privacy | "Data Not Collected" (the app collects nothing, has no analytics and makes no network requests) |
| Encryption | Already answered in the app (no non-exempt encryption), so App Store Connect won't ask |


## German (primary language)

**Name** (21/30)

```
Semestra – Lernplaner
```

**Subtitle** (29/30)

```
Prüfungen rund um deine Woche
```

**Promotional text** (159/170)

```
Trag Prüfungen und Stundenplan ein: Semestra füllt deine freie Zeit mit Lernblöcken und plant neu, sobald sich etwas ändert. Ohne Konto, alles bleibt am Gerät.
```

**Description** (1911/4000)

```
Semestra plant deine Prüfungsvorbereitung rund um deine Woche.

Du trägst deine Prüfungen und deinen Stundenplan ein. Semestra füllt die freie Zeit dazwischen mit Lernblöcken, hält deine Karteikarten am Laufen und plant automatisch neu, sobald sich etwas ändert. Kein Konto, keine Werbung, kein Tracking: Dein Plan bleibt auf deinem Gerät.

SO FUNKTIONIERT ES
• Prüfungen eintragen: Datum, Umfang und wie viele Wochen du dich vorbereiten willst.
• Woche eintragen: Stundenplan als Kalenderdatei (.ics) importieren oder deine typische Woche eingeben.
• Fertig: Semestra verteilt die Lernstunden passend zu deiner freien Zeit, die nächste Prüfung zuerst.

HEUTE
Dein Tag als Zeitleiste: Lehrveranstaltungen, Karteikarten-Wiederholungen, Nachbereitung nach langen LV-Tagen und konzentrierte Lernblöcke mit Pausen. Hak ab, was erledigt ist. Unerledigtes wandert automatisch auf die nächsten Tage.

WOCHE UND JAHR
Die Woche als übersichtliches Raster und eine Zeitleiste aller Prüfungen mit Vorbereitungszeit, geplanten Stunden und Status: ✓ im Plan, ~ knapp oder ! zu wenig Zeit.

KARTEIKARTEN
Du lernst mit Anki oder anderen Karteikarten? Semestra reserviert jeden Tag Zeit für Wiederholungen und neue Karten und rechnet aus, wie viele neue Karten pro Tag du brauchst, um einen Stapel rechtzeitig zu schaffen.

ERINNERUNGEN
Optional und einzeln wählbar: ein Morgenüberblick, ein Hinweis vor jedem Block, ein Abend-Check, wenn noch Blöcke offen sind, und eine Ankündigung einige Tage vor jeder Prüfung.

DEINE DATEN BLEIBEN BEI DIR
Semestra braucht kein Konto, verbindet sich mit keinem Server und funktioniert komplett offline. Sicherungen und Kalender-Exporte teilst du über das Teilen-Menü, wohin du willst.

AUSSERDEM
• Feiertage für Österreich, Deutschland und die Schweiz
• Ferien und eigene Termine fließen in den Plan ein
• Deutsch und Englisch, helles und dunkles Design
• Auch im Browser unter semestra.at
```

**Keywords** (100/100 bytes; commas, no spaces; the words of the name count already)

```
lernen,lernplan,prüfung,studium,uni,stundenplan,karteikarten,anki,klausur,semester,lernzeit,medizin
```


## English

**Name** (24/30)

```
Semestra – Study Planner
```

**Subtitle** (27/30)

```
Plan exams around your week
```

**Promotional text** (168/170)

```
Add your exams and your timetable: Semestra fills your free time with study blocks and re-plans whenever something changes. No account, everything stays on your device.
```

**Description** (1694/4000)

```
Semestra plans your exam preparation around your week.

Add your exams and your timetable. Semestra fills the free time in between with study blocks, keeps your flashcards going and re-plans automatically whenever something changes. No account, no ads, no tracking: your plan stays on your device.

HOW IT WORKS
• Add your exams: the date, how much there is to learn and how many weeks you want to prepare.
• Add your week: import your timetable as a calendar file (.ics) or enter your typical week.
• Done: Semestra spreads the study hours across your free time, nearest exam first.

TODAY
Your day as a timeline: classes, flashcard reviews, a follow-up after long class days and focused study blocks with breaks. Tick off what you've done. Anything left over moves to the next days by itself.

WEEK AND YEAR
Your week as a clear grid, and a timeline of all your exams with prep window, planned hours and a status: ✓ on track, ~ tight or ! short.

FLASHCARDS
Using Anki or other flashcards? Semestra sets aside time every day for reviews and new cards, and works out how many new cards a day you need to finish a deck in time.

REMINDERS
Optional, each one on its own: a morning overview, a heads-up before each block, an evening check when blocks are still open, and a notice a few days before each exam.

YOUR DATA STAYS WITH YOU
Semestra needs no account, connects to no server and works completely offline. Backups and calendar exports go through the share sheet, wherever you want them.

ALSO
• Public holidays for Austria, Germany and Switzerland
• Term breaks and your own appointments are part of the plan
• English and German, light and dark mode
• Also in your browser at semestra.at
```

**Keywords** (99/100 bytes; commas, no spaces; the words of the name count already)

```
study,exam,revision,timetable,flashcards,anki,university,college,schedule,student,semester,medicine
```


## App Review Information

Sign-in required: **No**. Contact: Lukas Geyer, hallo@semestra.at (add your phone number in App Store Connect).


**Notes** (1428/4000)

```
Semestra is a study planner that works entirely on the device. There is no login, no account and no server; the app makes no network requests.

How to review it quickly:
1. On the welcome screen, tap "Explore an example first". This loads a complete example plan (four exams, a timetable, flashcards) with dates around today.
2. Today, Week and Year show the plan. Tap a block for details, or tap its circle to tick it off; the plan updates immediately.
3. Setup → Reminders: switch on any of the four reminders. iOS asks for permission the first time. "Before each block" sends a notification the chosen number of minutes before each planned block (the example plan has blocks every day).
4. Setup → Your data → "Download backup" opens the share sheet with a JSON backup; "Export .ics" does the same with a calendar file.

What the app does beyond a website (guideline 4.2):
• Local notifications, scheduled on the device from the user's plan and rescheduled whenever it changes (morning overview, before each block, evening check, before exams).
• Data is stored in a file in the app's own storage, works fully offline, and is included in the device backup.
• Backups and calendar exports go through the iOS share sheet; timetables are imported with the document picker.

Privacy: the app collects no data (App Privacy: Data Not Collected). Privacy policy: https://semestra.at/#privacy

Contact: Lukas Geyer, hallo@semestra.at
```


## If the name is taken

App names must be unique in the App Store. If "Semestra – Lernplaner" is refused, these keep the brand: "Semestra: Lernplan & Prüfungen", "Semestra – Prüfungsplaner" (English: "Semestra: Exam Planner").
