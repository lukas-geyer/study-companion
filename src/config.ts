// App-wide constants. The app's name is changed here, in index.html and in public/manifest.webmanifest.
export const APP_NAME = 'Semestra';
export const APP_ID = 'semestra';
export const APP_VERSION = '0.1.0';
// Storage keys (IndexedDB database / localStorage key). Changing them loses existing data.
export const DB_NAME = 'semestra';
export const STORE_KEY = 'app-data';
export const DATA_VERSION = 4; // 2: settings.reminders · 3: flashcard decks as a list (AppData.decks) · 4: deck reviews as due cards (Deck.due); all migrated in normalize
// Imprint and privacy contact (Austria: § 5 ECG, § 25 MedienG; GDPR Art. 13), shown under Imprint and Privacy.
export const IMPRINT = {
  name: 'Lukas Geyer',
  address: ['Ghegagasse 13/32', '8020 Graz', 'Österreich'] as string[],
  email: 'hallo@semestra.at',
};
// Voluntary donations: a quiet footer link on the website only. Never shown in the iOS app (App Store guideline 3.1.1).
export const SUPPORT_URL = 'https://buymeacoffee.com/lukasgeyer';
