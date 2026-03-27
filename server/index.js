const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET = 'futbolx-secret-2026';

app.use(cors());
app.use(express.json());
app.set('trust proxy', true);

// ============================================
// HELPERS
// ============================================

const getIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
};

const logActivity = (userId, type, action, ip) => {
  db.prepare("INSERT INTO activity (user_id, type, action, ip) VALUES (?, ?, ?, ?)").run(userId, type, action, ip || '');
};

const getActiveBan = (userId, ip) => {
  const now = new Date().toISOString();
  return db.prepare(
    "SELECT * FROM bans WHERE (user_id = ? OR ip = ?) AND expires_at > ? ORDER BY expires_at DESC LIMIT 1"
  ).get(userId || -1, ip || '', now);
};

// ============================================
// AUTH MIDDLEWARE
// ============================================

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token gerekli' });

  try {
    const decoded = jwt.verify(token, SECRET);
    const ip = getIP(req);

    // Check ban
    const ban = getActiveBan(decoded.id, ip);
    if (ban) {
      return res.status(403).json({
        error: 'Erişim engellendi!',
        details: ban.reason,
        expires_at: ban.expires_at
      });
    }

    // Check user exists and active
    const user = db.prepare("SELECT * FROM users WHERE id = ? AND is_active = 1").get(decoded.id);
    if (!user) return res.status(403).json({ error: 'Hesap bulunamadı veya devre dışı' });

    req.user = user;
    req.userIP = ip;
    next();
  } catch(e) {
    return res.status(403).json({ error: 'Geçersiz token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Yetkiniz yok' });
  next();
};

// ============================================
// LOGIN
// ============================================

app.post('/api/login', (req, res) => {
  const { phone, password } = req.body;
  const ip = getIP(req);
  const normPhone = (phone || '').replace(/^0+/, '');

  // Check IP ban
  const ipBan = getActiveBan(null, ip);
  if (ipBan) {
    return res.status(403).json({
      error: '⛔ IP Adresiniz yasaklı!',
      details: ipBan.reason,
      expires_at: ipBan.expires_at
    });
  }

  // Find user
  const user = db.prepare("SELECT * FROM users WHERE phone = ? AND password = ? AND is_active = 1").get(normPhone, password);
  if (!user) {
    return res.status(401).json({ error: 'Hatalı telefon veya şifre!' });
  }

  // Check user-specific ban
  const userBan = getActiveBan(user.id, null);
  if (userBan) {
    return res.status(403).json({
      error: '⛔ Hesabınız geçici olarak yasaklı!',
      details: userBan.reason,
      expires_at: userBan.expires_at
    });
  }

  // ========== MULTI-LOGIN DETECTION ==========
  if (user.current_ip && user.current_ip !== ip && user.role !== 'admin') {
    const newCount = (user.multi_login_count || 0) + 1;

    if (newCount >= 2) {
      // 2. DENEME → HESAP SİL
      db.prepare("UPDATE users SET is_active = 0, multi_login_count = ? WHERE id = ?").run(newCount, user.id);
      logActivity(user.id, 'ban_permanent', `Hesap kapatıldı! Multi-login #${newCount}. Yeni IP: ${ip}, Eski IP: ${user.current_ip}`, ip);

      return res.status(403).json({
        error: '🚫 HESABINIZ KALICI OLARAK KAPATILDI!',
        details: 'Çoklu giriş denemesi tekrarlandığı için hesabınız kalıcı olarak kapatılmıştır. Yönetici ile iletişime geçin.',
        permanent: true
      });
    }

    // 1. DENEME → 30 DAKİKA BAN
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const banReason = 'Aynı anda farklı cihazdan giriş tespit edildi! Güvenlik nedeniyle 30 dakika erişim engellendi.';

    // Ban both IPs
    const insertBan = db.prepare("INSERT INTO bans (user_id, ip, reason, expires_at) VALUES (?, ?, ?, ?)");
    insertBan.run(user.id, ip, banReason, expiresAt);
    insertBan.run(user.id, user.current_ip, banReason, expiresAt);

    db.prepare("UPDATE users SET current_ip = ?, multi_login_count = ? WHERE id = ?").run(ip, newCount, user.id);
    logActivity(user.id, 'ban_temp', `30dk ban. Eski IP: ${user.current_ip}, Yeni IP: ${ip}`, ip);

    return res.status(403).json({
      error: '⛔ ÇOKLU GİRİŞ TESPİT EDİLDİ!',
      details: `Hesabınız başka bir cihazda açık! Sistemimiz tek cihazdan kullanıma izin verir. Her iki cihazın erişimi 30 DAKİKA engellenmiştir. TEKRARI HALİNDE HESABINIZ KALICI OLARAK SİLİNECEKTİR!`,
      expires_at: expiresAt,
      ban_warning: true
    });
  }

  // Normal login → IP güncelle
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET current_ip = ?, last_login = ? WHERE id = ?").run(ip, now, user.id);
  logActivity(user.id, 'login', 'Giriş yapıldı', ip);

  const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { phone: user.phone, role: user.role } });
});

// ============================================
// AUTH CHECK
// ============================================

app.get('/api/check-auth', auth, (req, res) => {
  res.json({ user: { phone: req.user.phone, role: req.user.role } });
});

// ============================================
// ADMIN: USER MANAGEMENT
// ============================================

// List all users
app.get('/api/users', auth, adminOnly, (req, res) => {
  const users = db.prepare("SELECT id, phone, password, role, is_active, current_ip, multi_login_count, created_at, last_login FROM users ORDER BY id DESC").all();
  res.json(users);
});

// Add user
app.post('/api/users', auth, adminOnly, (req, res) => {
  const { phone, password, role } = req.body;
  const normPhone = (phone || '').replace(/^0+/, '');

  if (!normPhone || !password) {
    return res.status(400).json({ error: 'Telefon ve şifre gerekli' });
  }

  try {
    const result = db.prepare("INSERT INTO users (phone, password, role) VALUES (?, ?, ?)").run(normPhone, password, role || 'user');
    res.json({ id: result.lastInsertRowid, phone: normPhone, role: role || 'user', is_active: 1 });
  } catch(e) {
    res.status(400).json({ error: 'Bu telefon numarası zaten kayıtlı!' });
  }
});

// Delete user
app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM users WHERE id = ? AND role != 'admin'").run(id);
  res.json({ success: true });
});

// Reactivate user (unban)
app.post('/api/users/:id/reactivate', auth, adminOnly, (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE users SET is_active = 1, multi_login_count = 0 WHERE id = ?").run(id);
  db.prepare("DELETE FROM bans WHERE user_id = ?").run(id);
  res.json({ success: true });
});

// ============================================
// ADMIN: USER STATS
// ============================================

app.get('/api/users/:id/stats', auth, adminOnly, (req, res) => {
  const { id } = req.params;

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_actions,
      SUM(CASE WHEN type = 'login' THEN 1 ELSE 0 END) as total_logins,
      SUM(CASE WHEN type = 'page' THEN 1 ELSE 0 END) as total_pages,
      SUM(CASE WHEN type LIKE 'ban%' THEN 1 ELSE 0 END) as total_bans,
      MIN(created_at) as first_activity,
      MAX(created_at) as last_activity
    FROM activity WHERE user_id = ?
  `).get(id);

  const recentActivity = db.prepare(
    "SELECT type, action, ip, created_at FROM activity WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
  ).all(id);

  res.json({ stats: stats || {}, recentActivity });
});

// ============================================
// ACTIVITY LOG (from frontend)
// ============================================

app.post('/api/activity', auth, (req, res) => {
  const { page } = req.body;
  logActivity(req.user.id, 'page', page, req.userIP);
  res.json({ success: true });
});

// ============================================
// NOSY API PROXY (CORS + key gizleme)
// ============================================

const NOSY_KEY = 'ZQHl6kiRJ74kroD66kdxxKvWDiF2tFoN8yZvL8L4NNSNUTC7QoX1jWKhANC5';
const NOSY_BASE = 'https://www.nosyapi.com/apiv2/service';

// Bülten — maç listesi
app.get('/api/nosy/bulten', auth, async (req, res) => {
  try {
    const date = req.query.date || '';
    const dateParam = date ? `&date=${date}` : '';
    const r = await fetch(`${NOSY_BASE}/bettable-matches?apiKey=${NOSY_KEY}${dateParam}`);
    const data = await r.json();
    res.json(data);
  } catch(e) {
    console.error('[NOSY] bulten error:', e.message);
    res.status(500).json({ error: 'NosyAPI bağlantı hatası' });
  }
});

// Maç sonuçları (tarih destekli)
app.get('/api/nosy/matches', auth, async (req, res) => {
  try {
    const date = req.query.date || '';
    const dateParam = date ? `&date=${date}` : '';
    const r = await fetch(`${NOSY_BASE}/matches-result?apiKey=${NOSY_KEY}${dateParam}`);
    const data = await r.json();
    res.json(data);
  } catch(e) {
    console.error('[NOSY] matches error:', e.message);
    res.status(500).json({ error: 'NosyAPI bağlantı hatası' });
  }
});

// ============================================
// 6+ GOL ANALİZİ — DB-backed
// ============================================

// İY 1.5 Üst ve İY KG Var oranlarını Bets'ten çıkar
function extractIYOdds(bets) {
  let iy15 = null, iykg = null, ms35 = null;
  if (!bets || !Array.isArray(bets)) return { iy15, iykg, ms35 };
  
  const bet15 = bets.find(b => (b.gameName || '').includes('İlk Yarı Alt/Üst 1.5'));
  if (bet15 && bet15.odds) {
    const ust = bet15.odds.find(o => o.value === 'Üst');
    iy15 = ust?.odd || null;
  }
  
  const betKG = bets.find(b => (b.gameName || '').includes('İlk Yarı Karşılıklı Gol'));
  if (betKG && betKG.odds) {
    const v = betKG.odds.find(o => o.value === 'Var');
    iykg = v?.odd || null;
  }

  const bet35 = bets.find(b => (b.gameName || '') === 'Alt/Üst 3.5');
  if (bet35 && bet35.odds) {
    const ust = bet35.odds.find(o => o.value === 'Üst');
    ms35 = ust?.odd || null;
  }
  
  return { iy15, iykg, ms35 };
}

// Belirli bir tarih aralığı için 6+ gol maçları API'den çekip DB'ye kaydet
async function syncGol6(daysBack = 3) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO gol6_matches 
    (match_id, match_date, team1, team2, league, league_flag, 
     home_score, away_score, total_goals, 
     home_win, draw, away_win, over25, under25, 
     iy_15_ust, iy_kg_var, ms_35_ust, bets_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date();
  let saved = 0;

  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().split('T')[0];

    try {
      const r = await fetch(`${NOSY_BASE}/matches-result?date=${date}&apiKey=${NOSY_KEY}`);
      const data = await r.json();
      if (data.status !== 'success' || !data.data) continue;

      for (const m of data.data) {
        const mr = m.matchResult || [];
        const hs = mr.find(r => r.metaName === 'msHomeScore')?.value;
        const as2 = mr.find(r => r.metaName === 'msAwayScore')?.value;
        if (!hs || !as2 || hs === '-' || as2 === '-') continue;
        
        const total = parseInt(hs) + parseInt(as2);
        if (total < 6) continue;

        // Zaten DB'de var mı kontrol et
        const exists = db.prepare('SELECT id FROM gol6_matches WHERE match_id = ?').get(m.MatchID);
        if (exists) continue;

        // Açılış oranlarını çek
        let homeWin = null, drawOdd = null, awayWin = null, over25 = null, under25 = null;
        let iy15 = null, iykg = null, ms35 = null, betsJson = null;

        try {
          const oddsRes = await fetch(`${NOSY_BASE}/bettable-matches/opening-odds?matchID=${m.MatchID}&apiKey=${NOSY_KEY}`);
          const oddsData = await oddsRes.json();
          if (oddsData.status === 'success' && oddsData.data && oddsData.data.length > 0) {
            const detail = oddsData.data[0];
            homeWin = detail.HomeWin;
            drawOdd = detail.Draw;
            awayWin = detail.AwayWin;
            over25 = detail.Over25;
            under25 = detail.Under25;
            
            const iyOdds = extractIYOdds(detail.Bets);
            iy15 = iyOdds.iy15;
            iykg = iyOdds.iykg;
            ms35 = iyOdds.ms35;
            betsJson = JSON.stringify(detail.Bets || []);
          }
        } catch(e) {
          console.error(`[GOL6-SYNC] odds error for ${m.MatchID}:`, e.message);
        }

        insert.run(
          m.MatchID, date, m.Team1, m.Team2, m.League, m.LeagueFlag,
          parseInt(hs), parseInt(as2), total,
          homeWin, drawOdd, awayWin, over25, under25,
          iy15, iykg, ms35, betsJson
        );
        saved++;
      }
    } catch(e) {
      console.error(`[GOL6-SYNC] ${date} error:`, e.message);
    }
  }
  console.log(`[GOL6-SYNC] ${saved} yeni maç kaydedildi`);
  return saved;
}

// 6+ Gol — DB'den oku (days query param ile filtrele)
app.get('/api/nosy/gol6', auth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffDate = cutoff.toISOString().split('T')[0];

    const rows = db.prepare(`
      SELECT * FROM gol6_matches 
      WHERE match_date >= ? 
        AND (
          (CASE WHEN ms_35_ust IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN iy_15_ust IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN iy_kg_var IS NOT NULL THEN 1 ELSE 0 END)
        ) >= 2
      ORDER BY total_goals DESC, match_date DESC
    `).all(cutoffDate);

    const data = rows.map(r => ({
      matchID: r.match_id,
      date: r.match_date,
      team1: r.team1,
      team2: r.team2,
      league: r.league,
      leagueFlag: r.league_flag,
      homeScore: r.home_score,
      awayScore: r.away_score,
      totalGoals: r.total_goals,
      homeWin: r.home_win,
      draw: r.draw,
      awayWin: r.away_win,
      over25: r.over25,
      under25: r.under25,
      iy15Ust: r.iy_15_ust,
      iyKGVar: r.iy_kg_var,
      ms35Ust: r.ms_35_ust,
      bets: r.bets_json ? JSON.parse(r.bets_json) : []
    }));

    res.json({ status: 'success', count: data.length, data });
  } catch(e) {
    console.error('[GOL6] error:', e.message);
    res.status(500).json({ error: 'Veritabanı hatası' });
  }
});

// 6+ Gol Senkronizasyonu — admin tetikler veya otomatik
app.post('/api/nosy/gol6/sync', auth, async (req, res) => {
  try {
    const daysBack = parseInt(req.body.days) || 5;
    const saved = await syncGol6(daysBack);
    const total = db.prepare('SELECT COUNT(*) as cnt FROM gol6_matches').get().cnt;
    res.json({ status: 'success', saved, total });
  } catch(e) {
    console.error('[GOL6-SYNC] error:', e.message);
    res.status(500).json({ error: 'Senkronizasyon hatası' });
  }
});

// BENZERLİK ANALİZİ — cache'li sistem
let bultenOddsCache = null;
let bultenOddsCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 dakika

// Bültendeki tüm maçların opening-odds'unu çek ve cache'le
async function getBultenOdds() {
  const now = Date.now();
  if (bultenOddsCache && (now - bultenOddsCacheTime) < CACHE_TTL) {
    console.log(`[CACHE] Bülten oranları cache'den (${bultenOddsCache.length} maç)`);
    return bultenOddsCache;
  }

  console.log('[CACHE] Bülten oranları API\'den çekiliyor...');
  const bultenRes = await fetch(`${NOSY_BASE}/bettable-matches?apiKey=${NOSY_KEY}`);
  const bultenData = await bultenRes.json();
  if (bultenData.status !== 'success' || !bultenData.data) return [];

  const upcoming = bultenData.data.filter(m => m.GameResult === 0 && m.LiveStatus !== 2);
  const results = [];

  for (const match of upcoming) {
    try {
      const oddsRes = await fetch(`${NOSY_BASE}/bettable-matches/opening-odds?matchID=${match.MatchID}&apiKey=${NOSY_KEY}`);
      const oddsData = await oddsRes.json();
      if (oddsData.status !== 'success' || !oddsData.data || !oddsData.data.length) continue;

      const detail = oddsData.data[0];
      const { iy15, iykg, ms35 } = extractIYOdds(detail.Bets || []);

      // En az 2 oran mevcut olmalı
      if ([ms35, iy15, iykg].filter(v => v !== null).length < 2) continue;

      results.push({
        matchID: match.MatchID,
        date: match.Date,
        time: match.Time?.slice(0, 5),
        team1: match.Team1,
        team2: match.Team2,
        league: match.League,
        ms35, iy15, iykg,
        homeWin: detail.HomeWin,
        draw: detail.Draw,
        awayWin: detail.AwayWin
      });
    } catch(e) { /* devam */ }
  }

  bultenOddsCache = results;
  bultenOddsCacheTime = now;
  console.log(`[CACHE] ${results.length} maç oranları cache'lendi`);
  return results;
}

app.get('/api/nosy/gol6/similar/:matchId', auth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const TOLERANCE = 0.05;

    // 1. Referans maçın oranlarını DB'den al
    const ref = db.prepare('SELECT * FROM gol6_matches WHERE match_id = ?').get(matchId);
    if (!ref) return res.status(404).json({ error: 'Maç bulunamadı' });

    const refOdds = { ms35: ref.ms_35_ust, iy15: ref.iy_15_ust, iykg: ref.iy_kg_var };

    // 2. Cache'li bülten oranlarını al
    const allOdds = await getBultenOdds();

    // 3. Benzerlik karşılaştır
    const similar = [];
    for (const m of allOdds) {
      let matchCount = 0;
      const matches = {};

      if (refOdds.ms35 && m.ms35 && Math.abs(refOdds.ms35 - m.ms35) <= TOLERANCE) {
        matchCount++;
        matches.ms35 = { ref: refOdds.ms35, current: m.ms35, diff: +(Math.abs(refOdds.ms35 - m.ms35).toFixed(2)) };
      }
      if (refOdds.iy15 && m.iy15 && Math.abs(refOdds.iy15 - m.iy15) <= TOLERANCE) {
        matchCount++;
        matches.iy15 = { ref: refOdds.iy15, current: m.iy15, diff: +(Math.abs(refOdds.iy15 - m.iy15).toFixed(2)) };
      }
      if (refOdds.iykg && m.iykg && Math.abs(refOdds.iykg - m.iykg) <= TOLERANCE) {
        matchCount++;
        matches.iykg = { ref: refOdds.iykg, current: m.iykg, diff: +(Math.abs(refOdds.iykg - m.iykg).toFixed(2)) };
      }

      if (matchCount >= 2) {
        similar.push({
          matchID: m.matchID, date: m.date, time: m.time,
          team1: m.team1, team2: m.team2, league: m.league,
          ms35Ust: m.ms35, iy15Ust: m.iy15, iyKGVar: m.iykg,
          matchCount, matches,
          homeWin: m.homeWin, draw: m.draw, awayWin: m.awayWin
        });
      }
    }

    similar.sort((a, b) => b.matchCount - a.matchCount);

    res.json({
      status: 'success', count: similar.length,
      refMatch: { team1: ref.team1, team2: ref.team2, score: `${ref.home_score}-${ref.away_score}` },
      refOdds, data: similar
    });
  } catch(e) {
    console.error('[GOL6-SIMILAR] error:', e.message);
    res.status(500).json({ error: 'Benzerlik analizi hatası' });
  }
});

// Uygulama başladığında son 3 günü otomatik senkronize et
syncGol6(3).catch(e => console.error('[GOL6-BOOT] sync error:', e.message));

// Maç detay — bahis marketleri (type ile kategorize)
app.get('/api/nosy/match/:matchId', auth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const r = await fetch(`${NOSY_BASE}/bettable-matches/details?matchID=${matchId}&apiKey=${NOSY_KEY}`);
    const data = await r.json();
    res.json(data);
  } catch(e) {
    console.error('[NOSY] match detail error:', e.message);
    res.status(500).json({ error: 'NosyAPI bağlantı hatası' });
  }
});

// ============================================
// SPORTMONKS ENTEGRASYONU
// ============================================

const SM_KEY = '2dRk24Pd23RiBlEnp7uxk9vkQYQg5FXDTYe3yzdLe6RJU6egrC51lucI8vhy';
const SM_BASE = 'https://api.sportmonks.com/v3/football';

// Sportmonks type_id → istatistik alanı eşleştirmesi (DOGRULANMIS)
const SM_TYPE_MAP = {
  41: 'appearances',     // Lineups (11'de başladığı)
  52: 'goals',           // Goals {total, goals, penalties}
  58: 'assists',         // Assists
  78: 'shots_on_target', // İsabetli şut
  79: 'shots_off_target',// İsabetsiz şut
  84: 'yellowcards',     // Sarı kart {total, home, away}
  86: 'fouls',           // Yapılan faul
  88: 'tackles',         // Top çalma
  97: 'redcards',        // Kırmızı kart
  119: 'minutes',        // Toplam dakika
  214: 'saves',          // Kaleci kurtarış
  321: 'shots_total',    // Toplam şut
};

// Sync edilecek 22 domestik lig
const SM_LEAGUES = [
  { id: 8, name: 'Premier League', seasonId: 25583 },
  { id: 9, name: 'Championship', seasonId: 25648 },
  { id: 72, name: 'Eredivisie', seasonId: 25597 },
  { id: 82, name: 'Bundesliga', seasonId: 25646 },
  { id: 85, name: '2. Bundesliga', seasonId: 25652 },
  { id: 181, name: 'Admiral Bundesliga', seasonId: 25653 },
  { id: 208, name: 'Pro League', seasonId: 25600 },
  { id: 271, name: 'Superliga', seasonId: 25536 },
  { id: 301, name: 'Ligue 1', seasonId: 25651 },
  { id: 384, name: 'Serie A', seasonId: 25533 },
  { id: 387, name: 'Serie B', seasonId: 26164 },
  { id: 444, name: 'Eliteserien', seasonId: 26781 },
  { id: 453, name: 'Ekstraklasa', seasonId: 25535 },
  { id: 462, name: 'Liga Portugal', seasonId: 25745 },
  { id: 501, name: 'Premiership', seasonId: 25598 },
  { id: 564, name: 'La Liga', seasonId: 25659 },
  { id: 567, name: 'La Liga 2', seasonId: 25673 },
  { id: 573, name: 'Allsvenskan', seasonId: 26806 },
  { id: 591, name: 'Super League', seasonId: 25607 },
  { id: 600, name: 'Super Lig', seasonId: 25682 },
  { id: 636, name: 'Liga Profesional', seasonId: 26808 },
  { id: 648, name: 'Serie A BR', seasonId: 26763 },
  { id: 779, name: 'MLS', seasonId: 26720 },
];

// Sportmonks API çağrısı
async function smFetch(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${SM_BASE}/${endpoint}${sep}api_token=${SM_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.errors) throw new Error(JSON.stringify(data.errors));
  return data;
}

// İstatistik detaylarını parse et
function parsePlayerStats(details) {
  const stats = { appearances: 0, minutes: 0, goals: 0, assists: 0, yellowcards: 0, redcards: 0, shots_total: 0, shots_on_target: 0, tackles: 0, saves: 0, fouls: 0 };
  if (!details) return stats;
  for (const d of details) {
    const field = SM_TYPE_MAP[d.type_id];
    if (!field) continue;
    const val = d.value?.total ?? d.value?.goals ?? 0;
    // assists alanı iki farklı type_id'den gelebilir, topla
    if (field === 'assists' && stats.assists > 0 && val > 0) continue;
    stats[field] = typeof val === 'number' ? val : parseInt(val) || 0;
  }
  // shots_total yoksa ongoal + offgoal
  if (stats.shots_total === 0 && stats.shots_on_target > 0) {
    const offTarget = details.find(d => d.type_id === 79)?.value?.total || 0;
    stats.shots_total = stats.shots_on_target + offTarget;
  }
  return stats;
}

// Oyuncuyu DB'ye kaydet/güncelle
const upsertPlayer = db.prepare(`
  INSERT INTO sm_players (id, name, common_name, firstname, lastname, team_id, team_name, league_id, league_name, season_id, position, image_url,
    appearances, minutes, goals, assists, yellowcards, redcards, shots_total, shots_on_target, tackles, saves, fouls,
    goals_per_game, assists_per_game, cards_per_game, shots_per_game, shots_on_target_pg, tackles_per_game, saves_per_game, synced_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  ON CONFLICT(id) DO UPDATE SET
    name=excluded.name, common_name=excluded.common_name, team_id=excluded.team_id, team_name=excluded.team_name,
    league_id=excluded.league_id, league_name=excluded.league_name, season_id=excluded.season_id,
    appearances=excluded.appearances, minutes=excluded.minutes, goals=excluded.goals, assists=excluded.assists,
    yellowcards=excluded.yellowcards, redcards=excluded.redcards, shots_total=excluded.shots_total,
    shots_on_target=excluded.shots_on_target, tackles=excluded.tackles, saves=excluded.saves, fouls=excluded.fouls,
    goals_per_game=excluded.goals_per_game, assists_per_game=excluded.assists_per_game, cards_per_game=excluded.cards_per_game,
    shots_per_game=excluded.shots_per_game, shots_on_target_pg=excluded.shots_on_target_pg,
    tackles_per_game=excluded.tackles_per_game, saves_per_game=excluded.saves_per_game, synced_at=datetime('now')
`);

// Lig bazlı sync — squads endpoint'i ile tüm oyuncuları çek (kaleciler dahil)
async function syncLeaguePlayers(league) {
  try {
    // Önce currentSeason'ı bul
    const leagueData = await smFetch(`leagues/${league.id}?include=currentSeason`);
    const season = leagueData.data?.currentseason;
    if (!season) { console.log(`[SM] ${league.name}: aktif sezon yok`); return 0; }

    // Takım listesini al
    const teamsData = await smFetch(`teams/seasons/${season.id}?per_page=50`);
    if (!teamsData.data || teamsData.data.length === 0) {
      console.log(`[SM] ${league.name}: takım bulunamadı`);
      return 0;
    }

    let totalSaved = 0;
    for (const team of teamsData.data) {
      try {
        const squadData = await smFetch(`squads/teams/${team.id}?include=player.statistics.details&filters=playerStatisticSeasons:${season.id}`);
        if (!squadData.data) continue;

        for (const entry of squadData.data) {
          const player = entry.player;
          if (!player) continue;

          const seasonStat = player.statistics?.find(s => s.season_id === season.id);
          const stats = parsePlayerStats(seasonStat?.details);
          const app = stats.appearances || 1;
          const isGK = entry.position_id === 24;
          // saves sadece kaleciler için geçerli
          const playerSaves = isGK ? stats.saves : 0;

          upsertPlayer.run(
            player.id, player.display_name || player.name, player.common_name,
            player.firstname, player.lastname,
            team.id, team.name,
            league.id, league.name, season.id,
            entry.position_id?.toString() || '', player.image_path || '',
            stats.appearances, stats.minutes, stats.goals, stats.assists,
            stats.yellowcards, stats.redcards, stats.shots_total, stats.shots_on_target,
            stats.tackles, playerSaves, stats.fouls,
            +(stats.goals / app).toFixed(2),
            +(stats.assists / app).toFixed(2),
            +((stats.yellowcards + stats.redcards) / app).toFixed(2),
            +(stats.shots_total / app).toFixed(2),
            +(stats.shots_on_target / app).toFixed(2),
            +(stats.tackles / app).toFixed(2),
            +(playerSaves / app).toFixed(2)
          );
          totalSaved++;
        }
        // Rate limit
        await new Promise(r => setTimeout(r, 300));
      } catch(e) {
        console.error(`[SM] ${league.name}/${team.name} squad error:`, e.message);
      }
    }

    console.log(`[SM] ${league.name}: ${totalSaved} oyuncu kaydedildi (${teamsData.data.length} takım)`);
    return totalSaved;
  } catch(e) {
    console.error(`[SM] ${league.name} sync error:`, e.message);
    return 0;
  }
}

// Tüm ligleri sync et
async function syncSportmonks() {
  console.log('[SM] Sportmonks sync başlıyor...');
  let total = 0;
  for (const league of SM_LEAGUES) {
    const count = await syncLeaguePlayers(league);
    total += count;
    // Rate limit — her lig arasında 500ms bekle
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`[SM] Sync tamamlandı: toplam ${total} oyuncu`);
  return total;
}

// Son maçları çek — takım form tablosu
async function syncTeamForm() {
  console.log('[SM-FORM] Takım formu sync başlıyor...');
  const upsert = db.prepare(`INSERT OR REPLACE INTO sm_team_form 
    (team_id, team_name, league_id, match_date, opponent, is_home, goals_for, goals_against, kg_var, over25, over35) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  
  let totalMatches = 0;
  for (const league of SM_LEAGUES) {
    try {
      // Son 50 maçı çek
      const data = await smFetch(`fixtures?filters=fixtureSeasons:${league.seasonId}&include=participants;scores&sort=-starting_at&per_page=50`);
      if (!data.data) continue;
      
      const insertMany = db.transaction((fixtures) => {
        for (const fix of fixtures) {
          const parts = fix.participants;
          if (!parts || parts.length < 2) continue;
          
          const home = parts.find(p => p.meta?.location === 'home');
          const away = parts.find(p => p.meta?.location === 'away');
          if (!home || !away) continue;
          
          // Skor bilgisini scores'tan al
          const ftScore = fix.scores?.find(s => s.description === 'CURRENT');
          const homeGoals = ftScore?.score?.participant === 'home' ? ftScore.score.goals 
            : fix.scores?.find(s => s.description === 'CURRENT' && s.score?.participant === 'home')?.score?.goals;
          const awayGoals = fix.scores?.find(s => s.description === 'CURRENT' && s.score?.participant === 'away')?.score?.goals;
          
          if (homeGoals == null || awayGoals == null) continue;
          
          const hg = parseInt(homeGoals);
          const ag = parseInt(awayGoals);
          const totalGoals = hg + ag;
          const kgVar = (hg > 0 && ag > 0) ? 1 : 0;
          const over25 = totalGoals >= 3 ? 1 : 0;
          const over35 = totalGoals >= 4 ? 1 : 0;
          const matchDate = fix.starting_at?.split(' ')[0] || fix.starting_at;
          
          // Ev sahibi kaydı
          upsert.run(home.id, home.name, league.id, matchDate, away.name, 1, hg, ag, kgVar, over25, over35);
          // Deplasman kaydı
          upsert.run(away.id, away.name, league.id, matchDate, home.name, 0, ag, hg, kgVar, over25, over35);
          totalMatches++;
        }
      });
      insertMany(data.data);
      console.log(`[SM-FORM] ${league.name}: ${data.data.length} maç`);
      await new Promise(r => setTimeout(r, 300));
    } catch(e) {
      console.error(`[SM-FORM] ${league.name} error:`, e.message);
    }
  }
  console.log(`[SM-FORM] Toplam ${totalMatches} maç kaydedildi`);
  return totalMatches;
}

// SPORTMONKS SYNC ENDPOINT
app.post('/api/sportmonks/sync', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    const total = await syncSportmonks();
    const formTotal = await syncTeamForm();
    res.json({ status: 'success', message: `${total} oyuncu, ${formTotal} maç senkronize edildi` });
  } catch(e) {
    console.error('[SM] sync error:', e.message);
    res.status(500).json({ error: 'Sportmonks sync hatası: ' + e.message });
  }
});

// TAKIM FORM — son 5 maçın KG VAR, 2.5Ü, 3.5Ü bilgisi
app.get('/api/sportmonks/team-form', auth, (req, res) => {
  try {
    const { team } = req.query;
    if (!team) return res.status(400).json({ error: 'team parametresi gerekli' });
    
    // Takım adını bul (accent-insensitive)
    const cleanTeam = removeAccents(team).toLowerCase();
    const allTeams = db.prepare('SELECT DISTINCT team_name, team_id FROM sm_team_form').all();
    let bestMatch = null;
    let bestScore = 0;
    for (const t of allTeams) {
      const cleanDB = removeAccents(t.team_name).toLowerCase();
      let score = 0;
      if (cleanDB === cleanTeam) score = 100;
      else if (cleanDB.startsWith(cleanTeam) || cleanTeam.startsWith(cleanDB)) score = 50;
      else if (cleanDB.includes(cleanTeam) || cleanTeam.includes(cleanDB)) score = 10;
      if (score > bestScore) { bestScore = score; bestMatch = t; }
    }
    
    if (!bestMatch) return res.json({ status: 'success', count: 0, data: [] });
    
    const rows = db.prepare('SELECT * FROM sm_team_form WHERE team_id = ? ORDER BY match_date DESC LIMIT 5')
      .all(bestMatch.team_id);
    
    res.json({ status: 'success', team: bestMatch.team_name, count: rows.length, data: rows });
  } catch(e) {
    console.error('[SM] team-form error:', e.message);
    res.status(500).json({ error: 'Form sorgulama hatası' });
  }
});

// TOPLU TAKIM FORMU — birden fazla takım (bülten listesi için)
app.post('/api/sportmonks/team-form-bulk', auth, (req, res) => {
  try {
    const { teams } = req.body; // ["Cordoba", "Mirandes", "Galatasaray", ...]
    if (!teams || !Array.isArray(teams)) return res.status(400).json({ error: 'teams dizisi gerekli' });
    
    const allTeams = db.prepare('SELECT DISTINCT team_name, team_id FROM sm_team_form').all();
    const result = {};
    
    for (const team of teams) {
      const cleanTeam = removeAccents(team).toLowerCase();
      let bestMatch = null, bestScore = 0;
      for (const t of allTeams) {
        const cleanDB = removeAccents(t.team_name).toLowerCase();
        let score = 0;
        if (cleanDB === cleanTeam) score = 100;
        else if (cleanDB.startsWith(cleanTeam) || cleanTeam.startsWith(cleanDB)) score = 50;
        else if (cleanDB.includes(cleanTeam) || cleanTeam.includes(cleanDB)) score = 10;
        if (score > bestScore) { bestScore = score; bestMatch = t; }
      }
      if (bestMatch) {
        result[team] = db.prepare('SELECT kg_var, over25, over35 FROM sm_team_form WHERE team_id = ? ORDER BY match_date DESC LIMIT 5').all(bestMatch.team_id);
      }
    }
    
    res.json({ status: 'success', data: result });
  } catch(e) {
    console.error('[SM] bulk form error:', e.message);
    res.status(500).json({ error: 'Form sorgulama hatası' });
  }
});

// Aksanları kaldır (Córdoba → Cordoba, Mirandés → Mirandes)
function removeAccents(str) {
  return str?.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
}

// OYUNCU İSTATİSTİK SORGULA — takım adına göre
app.get('/api/sportmonks/player-stats', auth, async (req, res) => {
  try {
    const { team, player } = req.query;
    let rows;
    if (player) {
      const clean = removeAccents(player);
      rows = db.prepare(`SELECT * FROM sm_players WHERE 
        name LIKE ? OR common_name LIKE ? OR firstname LIKE ? OR lastname LIKE ?
        ORDER BY goals DESC LIMIT 5`
      ).all(`%${player}%`, `%${player}%`, `%${player}%`, `%${player}%`);
      // Eğer bulamadıysa aksansız dene
      if (rows.length === 0 && clean !== player) {
        const allPlayers = db.prepare('SELECT * FROM sm_players ORDER BY goals DESC').all();
        rows = allPlayers.filter(p => {
          const names = [p.name, p.common_name, p.firstname, p.lastname].map(n => removeAccents(n || '').toLowerCase());
          return names.some(n => n.includes(clean.toLowerCase()));
        }).slice(0, 5);
      }
    } else if (team) {
      // Önce mapping'den bak
      const mapping = db.prepare('SELECT sm_team_id FROM sm_team_mapping WHERE nosy_name = ?').get(team);
      if (mapping) {
        rows = db.prepare('SELECT * FROM sm_players WHERE team_id = ? ORDER BY goals DESC').all(mapping.sm_team_id);
      } else {
        // Her zaman aksansız eşleştirme yap — en iyi eşleşmeyi bul
        const cleanTeam = removeAccents(team).toLowerCase();
        const allTeams = db.prepare('SELECT DISTINCT team_name, team_id, league_id FROM sm_players').all();
        
        // Skor tabanlı eşleştirme: tam eşleşme > başlangıç > içerme
        let bestMatch = null;
        let bestScore = 0;
        for (const t of allTeams) {
          const cleanDB = removeAccents(t.team_name).toLowerCase();
          let score = 0;
          if (cleanDB === cleanTeam) {
            score = 100; // tam eşleşme
          } else if (cleanDB.startsWith(cleanTeam) || cleanTeam.startsWith(cleanDB)) {
            score = 50; // baştan eşleşme
          } else if (cleanDB.includes(cleanTeam) || cleanTeam.includes(cleanDB)) {
            score = 10; // alt string eşleşme
          }
          if (score > bestScore) {
            bestScore = score;
            bestMatch = t;
          }
        }
        
        if (bestMatch) {
          rows = db.prepare('SELECT * FROM sm_players WHERE team_id = ? ORDER BY goals DESC').all(bestMatch.team_id);
          db.prepare('INSERT OR IGNORE INTO sm_team_mapping (nosy_name, sm_team_id, sm_team_name, league_id) VALUES (?, ?, ?, ?)')
            .run(team, bestMatch.team_id, bestMatch.team_name, bestMatch.league_id);
          console.log(`[SM] Mapping: "${team}" → "${bestMatch.team_name}" (score:${bestScore})`);
        }
      }
    } else {
      return res.status(400).json({ error: 'team veya player parametresi gerekli' });
    }

    res.json({ status: 'success', count: rows?.length || 0, data: rows || [] });
  } catch(e) {
    console.error('[SM] player-stats error:', e.message);
    res.status(500).json({ error: 'İstatistik sorgulama hatası' });
  }
});

// SM — DB özeti
app.get('/api/sportmonks/status', auth, (req, res) => {
  const playerCount = db.prepare('SELECT COUNT(*) as cnt FROM sm_players').get().cnt;
  const leagueCount = db.prepare('SELECT COUNT(DISTINCT league_id) as cnt FROM sm_players').get().cnt;
  const mappingCount = db.prepare('SELECT COUNT(*) as cnt FROM sm_team_mapping').get().cnt;
  const lastSync = db.prepare('SELECT MAX(synced_at) as ts FROM sm_players').get().ts;
  res.json({ status: 'success', players: playerCount, leagues: leagueCount, mappings: mappingCount, lastSync });
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log(`\n⚡ FutbolX Backend running on http://localhost:${PORT}\n`);
});
