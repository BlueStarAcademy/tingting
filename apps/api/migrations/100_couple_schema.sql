-- Couple-only schema. Drops every table from the previous public/commercial app.
DROP TABLE IF EXISTS
  group_recommended_place_visits,
  group_quest_completions,
  group_chat_messages,
  group_schedules,
  customer_inquiries,
  mailbox_messages,
  star_transactions,
  editor_unlocks,
  place_recommendations,
  quest_completions,
  visits,
  group_members,
  groups,
  places,
  users
CASCADE;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_uri TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_code TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('food', 'play', 'event', 'stay')),
  name TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  phone TEXT,
  url TEXT,
  kakao_place_id TEXT UNIQUE,
  kakao_category TEXT,
  event_start DATE,
  event_end DATE,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'wish' CHECK (status IN ('wish', 'visited')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX places_region_idx ON places (region_code, category);

CREATE TABLE place_reviews (
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, user_id)
);

CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  visited_on DATE NOT NULL,
  note TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX visits_place_idx ON visits (place_id);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID REFERENCES places(id) ON DELETE SET NULL,
  visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
  original_uri TEXT NOT NULL,
  edited_uri TEXT,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX photos_place_idx ON photos (place_id);
CREATE INDEX photos_taken_idx ON photos (taken_at DESC);

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date DATE NOT NULL,
  title TEXT NOT NULL,
  place_id UUID REFERENCES places(id) ON DELETE SET NULL,
  memo TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX plans_date_idx ON plans (plan_date);
