// App-wide constants. The app's name is changed here, in index.html and in public/manifest.webmanifest.
export const APP_NAME = 'Semestra';
export const APP_ID = 'semestra';
export const APP_VERSION = '0.1.0';
// Storage keys (IndexedDB database / localStorage key). Changing them loses existing data.
export const DB_NAME = 'semestra';
export const STORE_KEY = 'app-data';
export const DATA_VERSION = 1;
// Imprint and privacy contact (Austria: § 5 ECG, § 25 MedienG; GDPR Art. 13), shown under Imprint and Privacy.
export const IMPRINT = {
  name: 'Lukas Geyer',
  address: ['Ghegagasse 13/32', '8020 Graz', 'Österreich'] as string[],
  email: 'hallo@semestra.at',
};
