-- "세부 지역 폴더": one trip to one 시/군/구 inside a region album (지역별 앨범 → 강원 → 속초 · 2026.10).
-- city_code/city_name come from packages/shared/src/city-data.ts (SGIS codes, 세종 uses 행정동 codes).
CREATE TABLE city_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL,
  city_code TEXT NOT NULL,
  city_name TEXT NOT NULL CHECK (char_length(btrim(city_name)) BETWEEN 1 AND 40),
  title TEXT CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 1 AND 40),
  memo TEXT CHECK (memo IS NULL OR char_length(memo) <= 60),
  start_date DATE NOT NULL,
  end_date DATE CHECK (end_date IS NULL OR end_date >= start_date),
  cover_photo_id UUID REFERENCES photos(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, region_code)
);
CREATE INDEX city_folders_region_idx ON city_folders (region_code, city_code, start_date DESC);

-- A photo in a city folder stays in its region album: region_code keeps the folder's province
-- (enforced by the composite FK) and it is never in a general folder at the same time.
-- No ON DELETE action: the API moves or deletes the photos before dropping a folder.
ALTER TABLE photos ADD COLUMN city_folder_id UUID;
ALTER TABLE photos ADD CONSTRAINT photos_city_folder_fk
  FOREIGN KEY (city_folder_id, region_code) REFERENCES city_folders (id, region_code);
ALTER TABLE photos ADD CONSTRAINT photos_city_folder_album
  CHECK (city_folder_id IS NULL OR (region_code IS NOT NULL AND folder_id IS NULL));
CREATE INDEX photos_city_folder_taken_idx ON photos (city_folder_id, taken_at DESC, id DESC) WHERE city_folder_id IS NOT NULL;

-- "세부장소 핀": places pinned on a city folder's street map. Kept apart from `places` (the wish /
-- visited list): pins are per trip, the same café can be pinned on several trips, and their
-- categories (맛집/카페/관광/숙소/기타) differ.
CREATE TABLE city_folder_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID NOT NULL REFERENCES city_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  memo TEXT CHECK (memo IS NULL OR char_length(memo) <= 100),
  category TEXT NOT NULL DEFAULT 'etc' CHECK (category IN ('food', 'cafe', 'sight', 'stay', 'etc')),
  lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  address TEXT,
  kakao_place_id TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX city_folder_pins_folder_idx ON city_folder_pins (folder_id, created_at);
