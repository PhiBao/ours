CREATE TABLE IF NOT EXISTS pair (
  code        TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  reveal_json TEXT,
  revealed_at INTEGER,
  talked_mark INTEGER
);
CREATE TABLE IF NOT EXISTS person (
  pair_code    TEXT NOT NULL REFERENCES pair(code),
  name         TEXT NOT NULL,
  sealed       INTEGER NOT NULL DEFAULT 0,
  sealed_at    INTEGER,
  commitment   TEXT,
  raw_answers  TEXT,
  alt_answers  TEXT,
  PRIMARY KEY (pair_code, name)
);
