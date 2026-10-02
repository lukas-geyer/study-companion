// The iOS app (Capacitor) runs this same web app. Everything that has to behave differently there goes through here.
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const isNative: boolean = Capacitor.isNativePlatform();

/** Writes a generated file (backup, calendar export) to the app's cache and opens the iOS share sheet for it. */
export async function shareFile(filename: string, text: string): Promise<'saved' | 'declined'> {
  const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ files: [uri] });
    return 'saved';
  } catch (e) {
    // Closing the share sheet without choosing anything rejects with "Share canceled".
    if (/cancel/i.test(String((e as { message?: string })?.message ?? e))) return 'declined';
    throw e;
  }
}
