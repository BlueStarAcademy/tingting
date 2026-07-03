ALTER TABLE groups ADD COLUMN IF NOT EXISTS unlocked_gallery_slots INT NOT NULL DEFAULT 0;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS shared_gallery_uploader_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS is_shared_gallery BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_visits_group_shared_recent
  ON visits (group_id, is_shared_gallery, visited_at DESC);
