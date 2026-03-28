require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'futbolx',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDB() {
  const connection = await pool.getConnection();
  try {
    console.log('[DB] MySQL Bağlantısı kuruldu, tablolar kontrol ediliyor...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        is_active TINYINT DEFAULT 1,
        current_ip VARCHAR(50),
        multi_login_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        ip VARCHAR(50),
        reason TEXT,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        action TEXT,
        ip VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS gol6_matches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        match_id INT UNIQUE NOT NULL,
        match_date DATE NOT NULL,
        team1 VARCHAR(100),
        team2 VARCHAR(100),
        league VARCHAR(100),
        league_flag VARCHAR(255),
        home_score INT,
        away_score INT,
        total_goals INT,
        home_win FLOAT,
        draw FLOAT,
        away_win FLOAT,
        over25 FLOAT,
        under25 FLOAT,
        iy_15_ust FLOAT,
        iy_kg_var FLOAT,
        bets_json LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_gol6_date (match_date),
        INDEX idx_gol6_goals (total_goals)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sm_players (
        id INT PRIMARY KEY,
        name VARCHAR(100),
        common_name VARCHAR(100),
        firstname VARCHAR(100),
        lastname VARCHAR(100),
        team_id INT,
        team_name VARCHAR(100),
        league_id INT,
        league_name VARCHAR(100),
        season_id INT,
        position VARCHAR(50),
        image_url VARCHAR(255),
        appearances INT DEFAULT 0,
        minutes INT DEFAULT 0,
        goals INT DEFAULT 0,
        assists INT DEFAULT 0,
        yellowcards INT DEFAULT 0,
        redcards INT DEFAULT 0,
        shots_total INT DEFAULT 0,
        shots_on_target INT DEFAULT 0,
        tackles INT DEFAULT 0,
        saves INT DEFAULT 0,
        fouls INT DEFAULT 0,
        goals_per_game FLOAT DEFAULT 0,
        assists_per_game FLOAT DEFAULT 0,
        cards_per_game FLOAT DEFAULT 0,
        shots_per_game FLOAT DEFAULT 0,
        shots_on_target_pg FLOAT DEFAULT 0,
        tackles_per_game FLOAT DEFAULT 0,
        saves_per_game FLOAT DEFAULT 0,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sm_players_team (team_id),
        INDEX idx_sm_players_league (league_id),
        INDEX idx_sm_players_name (common_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sm_team_mapping (
        nosy_name VARCHAR(100) PRIMARY KEY,
        sm_team_id INT,
        sm_team_name VARCHAR(100),
        league_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sm_team_form (
        team_id INT,
        team_name VARCHAR(100),
        league_id INT,
        match_date DATE,
        opponent VARCHAR(100),
        is_home TINYINT,
        goals_for INT,
        goals_against INT,
        kg_var TINYINT,
        over25 TINYINT,
        over35 TINYINT,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, match_date, opponent),
        INDEX idx_sm_form_team (team_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed admin user if none exists
    const [adminRows] = await connection.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (adminRows.length === 0) {
      await connection.query("INSERT INTO users (phone, password, role) VALUES (?, ?, ?)", ['5551234567', '1234', 'admin']);
      console.log('[DB] Admin user created: 5551234567 / 1234');
    }

  } catch (error) {
    console.error('[DB] MySQL Initialization Error:', error);
  } finally {
    connection.release();
  }
}

module.exports = { pool, initDB };
