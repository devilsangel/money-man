CREATE TABLE categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL UNIQUE,
  color       TEXT    NOT NULL DEFAULT '#6366f1',
  icon        TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  type            TEXT    NOT NULL CHECK(type IN ('checking','savings','credit_card','cash','investment')),
  currency        TEXT    NOT NULL DEFAULT 'USD',
  initial_balance INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  archived_at     TEXT
);

CREATE TABLE transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  amount      INTEGER NOT NULL,
  payee       TEXT,
  notes       TEXT,
  date        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK(type IN ('expense','income','transfer')),
  transfer_id INTEGER REFERENCES transactions(id),
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_transactions_account_id  ON transactions(account_id);
CREATE INDEX idx_transactions_date        ON transactions(date);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);

CREATE TABLE budgets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount      INTEGER NOT NULL,
  month       TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(category_id, month)
);

-- Seed default categories
INSERT INTO categories (name, color, icon) VALUES
  ('Food & Dining',    '#FF9500', '🍔'),
  ('Transportation',   '#007AFF', '🚗'),
  ('Housing',          '#AF52DE', '🏠'),
  ('Entertainment',    '#FF2D55', '🎬'),
  ('Healthcare',       '#34C759', '💊'),
  ('Shopping',         '#FF6B35', '🛍'),
  ('Utilities',        '#5856D6', '⚡'),
  ('Income',           '#30D158', '💰'),
  ('Other',            '#8E8E93', '📦');
