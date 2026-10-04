-- TingTing-only photo folders ("일반 앨범"), shared by both partners.
CREATE TABLE album_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX album_folders_sort_idx ON album_folders (sort_order, created_at);

-- A photo lives in at most one album: a region ("지역별 앨범") or a folder.
-- Rows with neither are legacy/unsorted photos.
ALTER TABLE photos ADD COLUMN region_code TEXT;
ALTER TABLE photos ADD COLUMN folder_id UUID REFERENCES album_folders(id) ON DELETE SET NULL;
ALTER TABLE photos ADD CONSTRAINT photos_single_album CHECK (region_code IS NULL OR folder_id IS NULL);

UPDATE photos ph SET region_code = pl.region_code
FROM places pl
WHERE pl.id = ph.place_id AND ph.region_code IS NULL;

CREATE INDEX photos_region_taken_idx ON photos (region_code, taken_at DESC, id DESC) WHERE region_code IS NOT NULL;
CREATE INDEX photos_folder_taken_idx ON photos (folder_id, taken_at DESC, id DESC) WHERE folder_id IS NOT NULL;
CREATE INDEX photos_original_uri_idx ON photos (original_uri);
CREATE INDEX photos_edited_uri_idx ON photos (edited_uri) WHERE edited_uri IS NOT NULL;
