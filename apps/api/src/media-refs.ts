import { pool } from './db';
import { deleteMediaFile } from './media-upload';

/**
 * Unlink uploads that no photo or avatar points at any more. Copies share files, so a
 * file goes only with its last row. MYBOX keeps its copy either way (keyed by file name).
 * Call after the deleting transaction has committed.
 */
export async function deleteUnreferencedMedia(uris: (string | null | undefined)[]): Promise<void> {
  const candidates = [...new Set(uris.filter((u): u is string => Boolean(u?.startsWith('/media/files/'))))];
  if (candidates.length === 0) return;
  const { rows } = await pool.query<{ uri: string }>(
    `SELECT u AS uri FROM unnest($1::text[]) AS u
     WHERE NOT EXISTS (SELECT 1 FROM photos WHERE original_uri = u OR edited_uri = u)
       AND NOT EXISTS (SELECT 1 FROM users WHERE avatar_uri = u)`,
    [candidates],
  );
  for (const row of rows) deleteMediaFile(row.uri);
}
