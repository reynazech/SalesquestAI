import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

// Ordered schema migrations. Never edit a shipped migration; append a new one.
// The applied version is stored in PRAGMA user_version.
export const migrations = [
  // 1: users, sessions, training profiles, attempts, progress, entitlements
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    google_sub TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    picture TEXT,
    active_profile_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);

  CREATE TABLE profiles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industry TEXT NOT NULL,
    data TEXT NOT NULL,
    complete INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX profiles_user ON profiles(user_id);

  CREATE TABLE attempts (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    scenario_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    outcome TEXT,
    choices TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX attempts_user ON attempts(user_id, created_at);

  CREATE TABLE progress (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_key INTEGER NOT NULL DEFAULT 0,
    scenario_id TEXT NOT NULL,
    best_score INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 1,
    completed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, profile_key, scenario_id)
  );

  CREATE TABLE entitlements (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL,
    source TEXT NOT NULL,
    granted_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT
  );
  CREATE INDEX entitlements_user ON entitlements(user_id);
  `,
  // 2: simulation sessions (Levels 2+) and demo checkout orders
  `
  CREATE TABLE sim_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    profile_id INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
    level INTEGER NOT NULL,
    pack TEXT NOT NULL,
    status TEXT NOT NULL,
    state TEXT NOT NULL,
    transcript TEXT NOT NULL,
    report TEXT,
    score INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX sim_sessions_user ON sim_sessions(user_id, level, updated_at);

  CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    method TEXT,
    failure_reason TEXT,
    demo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX orders_user ON orders(user_id, created_at);
  `,
]

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
  migrate(db)
  return db
}

// Applies pending migrations, each in its own transaction.
export function migrate(db) {
  const current = db.prepare('PRAGMA user_version').get().user_version
  for (let v = current; v < migrations.length; v++) {
    db.exec('BEGIN')
    try {
      db.exec(migrations[v])
      db.exec(`PRAGMA user_version = ${v + 1}`)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw new Error(`Migration ${v + 1} failed: ${err.message}`)
    }
  }
  return migrations.length
}
