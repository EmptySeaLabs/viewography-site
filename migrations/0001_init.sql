-- Beta requests from viewography.app/beta/ (Mark, Nov 14, 2026). One row per email.
CREATE TABLE IF NOT EXISTS beta_requests (
  id         INTEGER PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name       TEXT NOT NULL,
  model      TEXT NOT NULL,
  source     TEXT NOT NULL,   -- 'site', or 'preview' for a Cloudflare preview build
  created_at TEXT NOT NULL    -- ISO 8601
);

-- Small cached values the Worker builds, such as the "Streaming this week" list.
CREATE TABLE IF NOT EXISTS site_cache (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,   -- JSON
  updated_at TEXT NOT NULL
);
