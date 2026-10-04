-- Recommended travel courses the couple chose to keep, with ordered stops per day.
CREATE TABLE IF NOT EXISTS trip_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  nights SMALLINT NOT NULL DEFAULT 0 CHECK (nights BETWEEN 0 AND 2),
  transport TEXT NOT NULL CHECK (transport IN ('car', 'transit')),
  focus TEXT[] NOT NULL DEFAULT '{}',
  start_point JSONB,
  -- Per day: { "startTime": "HH:MM", "start": { "name", "lat", "lng" } }
  day_starts JSONB NOT NULL DEFAULT '[]',
  route_source TEXT NOT NULL DEFAULT 'estimate',
  sources TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trip_courses_region_idx ON trip_courses (region_code, start_date);

CREATE TABLE IF NOT EXISTS trip_course_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES trip_courses(id) ON DELETE CASCADE,
  day SMALLINT NOT NULL,
  position SMALLINT NOT NULL,
  stop_key TEXT NOT NULL,
  slot TEXT NOT NULL,
  arrive TEXT NOT NULL,
  dwell_min SMALLINT NOT NULL,
  -- RecommendedPlace snapshot, so the course survives provider changes
  place JSONB NOT NULL,
  leg JSONB,
  UNIQUE (course_id, day, position)
);

-- One calendar entry per course day keeps courses in the shared 일정 tab.
ALTER TABLE plans ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES trip_courses(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS plans_course_idx ON plans (course_id);
