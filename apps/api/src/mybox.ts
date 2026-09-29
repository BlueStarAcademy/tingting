import fs from 'fs';
import path from 'path';
import { config } from './config';
import { pool } from './db';
import { getUploadsDir } from './media-upload';

const API = 'https://open-api.mybox.naver.com/v1/drive';
const IMAGE_RE = /\.(jpe?g|png|webp)$/i;
const RETRY_INTERVAL_MS = 30 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

class MyboxError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const state = {
  running: false,
  rerun: false,
  pending: 0,
  lastRunAt: null as string | null,
  lastError: null as string | null,
};

async function myboxPost<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.myboxToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { code?: string };
  if (!res.ok) throw new MyboxError(res.status, `MYBOX ${endpoint} ${res.status} ${data.code ?? ''}`.trim());
  return data as T;
}

/** Folder ID for `relPath` under the backup root ('' = the root itself), created on first use. */
async function folderId(relPath: string): Promise<string> {
  const { rows } = await pool.query<{ resource_id: string }>('SELECT resource_id FROM mybox_folders WHERE path = $1', [
    relPath,
  ]);
  if (rows[0]) return rows[0].resource_id;

  const parentId = relPath ? await folderId('') : undefined;
  const name = relPath || config.myboxFolderName;
  let created: { resourceId: string };
  try {
    created = await myboxPost('/folders', { folderName: name, parentId });
  } catch (e) {
    if (!(e instanceof MyboxError && e.status === 409)) throw e;
    // A folder with this name already exists but we lost its ID (e.g. the DB was reset).
    created = await myboxPost('/folders', { folderName: `${name} (${Date.now()})`, parentId });
  }
  await pool.query(
    `INSERT INTO mybox_folders (path, resource_id) VALUES ($1, $2)
     ON CONFLICT (path) DO UPDATE SET resource_id = EXCLUDED.resource_id`,
    [relPath, created.resourceId],
  );
  return created.resourceId;
}

/** Upload one file into its KST month folder and return `YYYY-MM/<name>`. */
async function uploadFile(fileName: string): Promise<string> {
  const data = await fs.promises.readFile(path.join(getUploadsDir(), fileName));
  // Stored names look like `<epoch ms>-<hex>.<ext>`.
  const [msPart, hexPart = ''] = fileName.split('-');
  const ms = Number(msPart);
  const kst = new Date((Number.isFinite(ms) && ms > 0 ? ms : Date.now()) + KST_OFFSET_MS).toISOString();
  const month = kst.slice(0, 7);
  const name = `${kst.slice(0, 10)}_${kst.slice(11, 19).replace(/:/g, '')}_${hexPart.slice(0, 6)}${path.extname(fileName)}`;

  const parentId = await folderId(month);
  const { uploadUrl } = await myboxPost<{ uploadUrl: string }>('/files', {
    fileName: name,
    fileSize: data.length,
    parentId,
    isOverwrite: true,
  });
  const form = new FormData();
  form.append('Filedata', new Blob([new Uint8Array(data)]), name);
  const res = await fetch(uploadUrl, { method: 'POST', body: form });
  if (!res.ok) throw new MyboxError(res.status, `MYBOX upload ${res.status}`);
  return `${month}/${name}`;
}

async function runBackup(): Promise<void> {
  const files = (await fs.promises.readdir(getUploadsDir())).filter((f) => IMAGE_RE.test(f));
  const { rows } = await pool.query<{ file_name: string }>('SELECT file_name FROM mybox_backups');
  const done = new Set(rows.map((r) => r.file_name));
  const pending = files.filter((f) => !done.has(f)).sort();
  state.pending = pending.length;

  for (const fileName of pending) {
    let resourcePath: string;
    try {
      resourcePath = await uploadFile(fileName);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        state.pending--;
        continue;
      }
      // Someone deleted our folders in MYBOX; recreate them on the next pass.
      if (e instanceof MyboxError && e.status === 404) await pool.query('DELETE FROM mybox_folders');
      throw e;
    }
    await pool.query(
      'INSERT INTO mybox_backups (file_name, resource_path) VALUES ($1, $2) ON CONFLICT (file_name) DO NOTHING',
      [fileName, resourcePath],
    );
    state.pending--;
    console.log(`[mybox] backed up ${fileName} -> ${resourcePath}`);
  }
}

/** Copy any not-yet-backed-up uploads to MYBOX in the background. Safe to call often. */
export function requestMyboxBackup(): void {
  if (!config.myboxToken) return;
  if (state.running) {
    state.rerun = true;
    return;
  }
  state.running = true;
  runBackup()
    .then(() => {
      state.lastError = null;
    })
    .catch((e: unknown) => {
      state.lastError = e instanceof Error ? e.message : String(e);
      console.error('[mybox] backup failed:', state.lastError);
    })
    .finally(() => {
      state.running = false;
      state.lastRunAt = new Date().toISOString();
      if (state.rerun) {
        state.rerun = false;
        requestMyboxBackup();
      }
    });
}

export function startMyboxBackup(): void {
  if (!config.myboxToken) {
    console.warn('[mybox] MYBOX_TOKEN not set; photo backup disabled');
    return;
  }
  requestMyboxBackup();
  setInterval(requestMyboxBackup, RETRY_INTERVAL_MS).unref();
}

export function myboxBackupStatus() {
  return {
    enabled: Boolean(config.myboxToken),
    pending: state.pending,
    lastRunAt: state.lastRunAt,
    lastError: state.lastError,
  };
}
