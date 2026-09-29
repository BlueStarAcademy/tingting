-- Files in UPLOADS_DIR that already have a copy in MYBOX.
CREATE TABLE mybox_backups (
  file_name TEXT PRIMARY KEY,
  resource_path TEXT NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MYBOX folder IDs, keyed by folder path relative to the backup root ('' = root).
CREATE TABLE mybox_folders (
  path TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL
);
