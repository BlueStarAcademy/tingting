-- Third-party place results (TourAPI, Kakao, OpenStreetMap), kept to save API quota across restarts.
CREATE TABLE IF NOT EXISTS recommendation_cache (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS recommendation_cache_expires_idx ON recommendation_cache (expires_at);
