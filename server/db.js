const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'futbolx.db');
const db = new Database(DB_PATH);

// WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    current_ip TEXT,
    multi_login_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
  );

  CREATE TABLE IF NOT EXISTS bans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    ip TEXT,
    reason TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    action TEXT,
    ip TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS gol6_matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER UNIQUE NOT NULL,
    match_date TEXT NOT NULL,
    team1 TEXT,
    team2 TEXT,
    league TEXT,
    league_flag TEXT,
    home_score INTEGER,
    away_score INTEGER,
    total_goals INTEGER,
    home_win REAL,
    draw REAL,
    away_win REAL,
    over25 REAL,
    under25 REAL,
    iy_15_ust REAL,
    iy_kg_var REAL,
    bets_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_gol6_date ON gol6_matches(match_date);
  CREATE INDEX IF NOT EXISTS idx_gol6_goals ON gol6_matches(total_goals);

  CREATE TABLE IF NOT EXISTS sm_players (
    id INTEGER PRIMARY KEY,
    name TEXT,
    common_name TEXT,
    firstname TEXT,
    lastname TEXT,
    team_id INTEGER,
    team_name TEXT,
    league_id INTEGER,
    league_name TEXT,
    season_id INTEGER,
    position TEXT,
    image_url TEXT,
    appearances INTEGER DEFAULT 0,
    minutes INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    yellowcards INTEGER DEFAULT 0,
    redcards INTEGER DEFAULT 0,
    shots_total INTEGER DEFAULT 0,
    shots_on_target INTEGER DEFAULT 0,
    tackles INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    fouls INTEGER DEFAULT 0,
    goals_per_game REAL DEFAULT 0,
    assists_per_game REAL DEFAULT 0,
    cards_per_game REAL DEFAULT 0,
    shots_per_game REAL DEFAULT 0,
    shots_on_target_pg REAL DEFAULT 0,
    tackles_per_game REAL DEFAULT 0,
    saves_per_game REAL DEFAULT 0,
    synced_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sm_team_mapping (
    nosy_name TEXT PRIMARY KEY,
    sm_team_id INTEGER,
    sm_team_name TEXT,
    league_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sm_players_team ON sm_players(team_id);
  CREATE INDEX IF NOT EXISTS idx_sm_players_league ON sm_players(league_id);
  CREATE INDEX IF NOT EXISTS idx_sm_players_name ON sm_players(common_name);

  CREATE TABLE IF NOT EXISTS sm_team_form (
    team_id INTEGER,
    team_name TEXT,
    league_id INTEGER,
    match_date TEXT,
    opponent TEXT,
    is_home INTEGER,
    goals_for INTEGER,
    goals_against INTEGER,
    kg_var INTEGER,
    over25 INTEGER,
    over35 INTEGER,
    synced_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (team_id, match_date, opponent)
  );
  CREATE INDEX IF NOT EXISTS idx_sm_form_team ON sm_team_form(team_id);
`);

// Seed admin user if none exists
const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (phone, password, role) VALUES (?, ?, ?)").run('5551234567', '1234', 'admin');
  console.log('[DB] Admin user created: 5551234567 / 1234');
}

module.exports = db;
