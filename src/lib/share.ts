import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes text to a temporary file and opens the Android share sheet (Drive, Files, WhatsApp…). */
export async function shareTextFile(name: string, content: string, mimeType: string, dialogTitle: string) {
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

/** Lets the user pick a file and returns its text, or null if they cancelled. */
export async function pickTextFile(mimeTypes: string[]): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes });
  if (picked.canceled) return null;
  return picked.result.text();
}
