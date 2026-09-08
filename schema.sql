CREATE TABLE IF NOT EXISTS scores (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  day       TEXT    NOT NULL,
  who       TEXT    NOT NULL,
  score     INTEGER NOT NULL,
  found     INTEGER NOT NULL,
  customers INTEGER NOT NULL,
  mins_left INTEGER NOT NULL,
  at        INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_day_score ON scores(day, score DESC);
