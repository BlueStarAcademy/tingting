-- TingTing initial schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  stars INT NOT NULL DEFAULT 100,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  visited_regions TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Groups
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

-- Places (seed data synced separately)
CREATE TABLE places (
  id TEXT PRIMARY KEY,
  region_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  category TEXT,
  image_url TEXT
);

-- Visits
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id),
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  photo_uri TEXT,
  edited_photo_uri TEXT,
  note TEXT,
  filter TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
);

-- Quests
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id TEXT NOT NULL REFERENCES places(id),
  title TEXT NOT NULL,
  description TEXT,
  reward_stars INT NOT NULL DEFAULT 10,
  target_lat DOUBLE PRECISION NOT NULL,
  target_lng DOUBLE PRECISION NOT NULL,
  radius_meters INT NOT NULL DEFAULT 200
);

CREATE TABLE quest_completions (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id)
);

-- Recommendations (UGC)
CREATE TABLE place_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Star transactions
CREATE TABLE star_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY groups_select ON groups FOR SELECT USING (
  owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM group_members gm WHERE gm.group_id = groups.id AND gm.user_id = auth.uid()
  )
);
CREATE POLICY groups_insert ON groups FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY group_members_select ON group_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY group_members_insert ON group_members FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY places_select ON places FOR SELECT USING (true);

CREATE POLICY visits_select ON visits FOR SELECT USING (user_id = auth.uid());
CREATE POLICY visits_insert ON visits FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY visits_update ON visits FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY quests_select ON quests FOR SELECT USING (true);

CREATE POLICY quest_completions_select ON quest_completions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY quest_completions_insert ON quest_completions FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY recommendations_select ON place_recommendations FOR SELECT USING (true);
CREATE POLICY recommendations_insert ON place_recommendations FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY star_transactions_select ON star_transactions FOR SELECT USING (user_id = auth.uid());

-- RPC: create_group
CREATE OR REPLACE FUNCTION create_group(p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group_count INT;
  v_cost INT := 0;
  v_stars INT;
  v_group_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COUNT(*) INTO v_group_count FROM groups WHERE owner_id = v_user_id;
  IF v_group_count >= 1 THEN v_cost := 50; END IF;

  SELECT stars INTO v_stars FROM profiles WHERE id = v_user_id FOR UPDATE;
  IF v_stars < v_cost THEN RAISE EXCEPTION 'Insufficient stars'; END IF;

  IF v_cost > 0 THEN
    UPDATE profiles SET stars = stars - v_cost WHERE id = v_user_id;
    INSERT INTO star_transactions (user_id, amount, reason) VALUES (v_user_id, -v_cost, 'create_group');
  END IF;

  INSERT INTO groups (name, description, owner_id) VALUES (p_name, p_description, v_user_id)
  RETURNING id INTO v_group_id;

  INSERT INTO group_members (group_id, user_id) VALUES (v_group_id, v_user_id);

  RETURN json_build_object('id', v_group_id, 'cost', v_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: get_home_dashboard
CREATE OR REPLACE FUNCTION get_home_dashboard()
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile profiles%ROWTYPE;
  v_groups JSON;
  v_visits JSON;
  v_progress JSON;
  v_visited INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_profile FROM profiles WHERE id = v_user_id;

  SELECT COALESCE(json_agg(g ORDER BY g.created_at DESC), '[]'::json) INTO v_groups
  FROM (
    SELECT gr.id, gr.name, gr.description, gr.owner_id, gr.created_at,
      (SELECT array_agg(gm.user_id) FROM group_members gm WHERE gm.group_id = gr.id) AS member_ids
    FROM groups gr
    WHERE gr.owner_id = v_user_id OR EXISTS (
      SELECT 1 FROM group_members gm WHERE gm.group_id = gr.id AND gm.user_id = v_user_id
    )
  ) g;

  SELECT COALESCE(json_agg(v ORDER BY v.visited_at DESC), '[]'::json) INTO v_visits
  FROM (SELECT * FROM visits WHERE user_id = v_user_id ORDER BY visited_at DESC LIMIT 6) v;

  v_visited := COALESCE(array_length(v_profile.visited_regions, 1), 0);

  RETURN json_build_object(
    'profile', row_to_json(v_profile),
    'groups', v_groups,
    'recentVisits', v_visits,
    'visitedCount', v_visited,
    'totalRegions', 17
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: spend_stars
CREATE OR REPLACE FUNCTION spend_stars(p_amount INT, p_reason TEXT)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_stars INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;

  SELECT stars INTO v_stars FROM profiles WHERE id = v_user_id FOR UPDATE;
  IF v_stars < p_amount THEN RAISE EXCEPTION 'Insufficient stars'; END IF;

  UPDATE profiles SET stars = stars - p_amount WHERE id = v_user_id;
  INSERT INTO star_transactions (user_id, amount, reason) VALUES (v_user_id, -p_amount, p_reason);

  RETURN json_build_object('stars', v_stars - p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: complete_quest
CREATE OR REPLACE FUNCTION complete_quest(p_quest_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_quest quests%ROWTYPE;
  v_dist DOUBLE PRECISION;
  v_reward INT;
  v_stars INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF EXISTS (SELECT 1 FROM quest_completions WHERE user_id = v_user_id AND quest_id = p_quest_id) THEN
    RAISE EXCEPTION 'Quest already completed';
  END IF;

  SELECT * INTO v_quest FROM quests WHERE id = p_quest_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quest not found'; END IF;

  v_dist := 111320 * sqrt(power(p_lat - v_quest.target_lat, 2) + power((p_lng - v_quest.target_lng) * cos(radians(v_quest.target_lat)), 2));
  IF v_dist > v_quest.radius_meters THEN RAISE EXCEPTION 'Too far from quest location'; END IF;

  v_reward := v_quest.reward_stars;
  INSERT INTO quest_completions (user_id, quest_id) VALUES (v_user_id, p_quest_id);
  UPDATE profiles SET stars = stars + v_reward WHERE id = v_user_id RETURNING stars INTO v_stars;
  INSERT INTO star_transactions (user_id, amount, reason) VALUES (v_user_id, v_reward, 'quest_complete');

  RETURN json_build_object('reward', v_reward, 'stars', v_stars);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: use_ai_feature
CREATE OR REPLACE FUNCTION use_ai_feature(p_feature TEXT)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cost INT := 20;
  v_stars INT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_feature = 'sky' THEN v_cost := 25; END IF;

  SELECT stars INTO v_stars FROM profiles WHERE id = v_user_id FOR UPDATE;
  IF v_stars < v_cost THEN RAISE EXCEPTION 'Insufficient stars'; END IF;

  UPDATE profiles SET stars = stars - v_cost WHERE id = v_user_id;
  INSERT INTO star_transactions (user_id, amount, reason) VALUES (v_user_id, -v_cost, 'ai_' || p_feature);

  RETURN json_build_object('feature', p_feature, 'cost', v_cost, 'stars', v_stars - v_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
