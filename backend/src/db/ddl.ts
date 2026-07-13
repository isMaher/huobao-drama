/** Runtime DDL — idempotent. Source of truth for table existence at boot. */
export const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  locale TEXT NOT NULL DEFAULT 'ar',
  avatar_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS studios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description_ar TEXT,
  description_en TEXT,
  logo_url TEXT,
  banner_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS titles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  studio_id INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'series',
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  synopsis_ar TEXT,
  synopsis_en TEXT,
  genre_id INTEGER,
  year INTEGER,
  poster_url TEXT,
  backdrop_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  moderation_note TEXT,
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_titles_status ON titles (status);
CREATE INDEX IF NOT EXISTS idx_titles_studio ON titles (studio_id);

CREATE TABLE IF NOT EXISTS episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_id INTEGER NOT NULL,
  number INTEGER NOT NULL DEFAULT 1,
  name_ar TEXT,
  name_en TEXT,
  video_url TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_episodes_title ON episodes (title_id);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title_id INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  body TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, title_id)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  studio_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, studio_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  episode_id INTEGER NOT NULL,
  position_sec INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, episode_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`
