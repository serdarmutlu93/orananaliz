import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Search, Zap, ChevronDown, ChevronRight, ArrowRight, Clock, RefreshCw, ArrowLeft, ChevronLeft, AlertCircle } from 'lucide-react';

/* ============================================
   SKELETON
   ============================================ */
function MatchSkeleton() {
  return (
    <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: 10, alignItems: 'center' }}>
        <div className="skeleton" style={{ height: 14, width: 36 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div className="skeleton" style={{ height: 12, width: '55%' }} />
          <div className="skeleton" style={{ height: 12, width: '45%' }} />
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          <div className="skeleton" style={{ height: 30, width: 42 }} />
          <div className="skeleton" style={{ height: 30, width: 42 }} />
          <div className="skeleton" style={{ height: 30, width: 42 }} />
        </div>
      </div>
    </div>
  );
}

/* ============================================
   ODD BADGE
   ============================================ */
function OddBadge({ label, value }) {
  const v = parseFloat(value);
  let cls = 'odd';
  if (v <= 1.5) cls += ' fav';
  else if (v >= 4.5) cls += ' high';
  return (
    <div className={cls}>
      <span className="odd-lbl">{label}</span>
      <span className="odd-val">{isNaN(v) ? value : v.toFixed(2)}</span>
    </div>
  );
}

/* ============================================
   MATCH DETAIL — Bahis Marketleri + Kategori Menü
   ============================================ */
function MatchDetail({ match, onBack }) {
  const { token } = useAuth();
  const [bets, setBets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Tümü');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openGroups, setOpenGroups] = useState({});
  const [teamPlayers, setTeamPlayers] = useState({});  // { playerName: statsObj }
  const [teamForm, setTeamForm] = useState({ team1: [], team2: [] });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`http://localhost:3001/api/nosy/match/${match.MatchID}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.status === 'success' && data.data?.[0]) {
          const m = data.data[0];
          const gt = m.gameType || [];
          // Özel ve Oyuncu en başa
          const priority = ['Özel', 'Oyuncu'];
          const sorted = [
            ...priority.filter(p => gt.includes(p)),
            ...gt.filter(g => !priority.includes(g))
          ];
          setCategories(['Tümü', ...sorted]);
          setBets(m.Bets || []);
        } else {
          setError('Bahis verileri yüklenemedi');
        }
      } catch(e) {
        setError('Sunucu bağlantı hatası');
      }
      setLoading(false);
    };
    load();

    // Sportmonks: her iki takımın oyuncularını yükle
    const loadPlayerStats = async () => {
      try {
        const all = {};
        for (const team of [match.Team1, match.Team2]) {
          console.log('[SM] Loading team:', team);
          const res = await fetch(`http://localhost:3001/api/sportmonks/player-stats?team=${encodeURIComponent(team)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          console.log(`[SM] ${team}: ${data.count || 0} oyuncu`);
          if (data.data) {
            data.data.forEach(p => {
              const keys = [p.name, p.common_name, p.firstname + ' ' + p.lastname, p.lastname].filter(Boolean);
              keys.forEach(k => { if (k) all[k.toLowerCase()] = p; });
            });
          }
        }
        console.log('[SM] Total keys:', Object.keys(all).length);
        setTeamPlayers(all);
      } catch(e) { console.error('[SM] Error:', e); }
    };
    loadPlayerStats();

    // Takım formu yükle
    const loadForm = async () => {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`http://localhost:3001/api/sportmonks/team-form?team=${encodeURIComponent(match.Team1)}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:3001/api/sportmonks/team-form?team=${encodeURIComponent(match.Team2)}`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
        setTeamForm({ team1: d1.data || [], team2: d2.data || [] });
      } catch(e) { /* */ }
    };
    loadForm();
  }, [match.MatchID, token]);

  const filteredBets = useMemo(() => {
    if (activeCategory !== 'Tümü') return bets.filter(b => b.type?.includes(activeCategory));

    // Tümü → popüler kategoriler önce, Özel en sona
    const order = ['Kim Kazanır', 'Alt/Üst', 'Oyuncu', 'Kombo', 'Goller', 'Skor', 'Korner/Kart', 'Diğer', 'Özel'];
    return [...bets].sort((a, b) => {
      const ai = order.indexOf(a.type);
      const bi = order.indexOf(b.type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  }, [bets, activeCategory]);

  return (
    <div className="fade-in" style={{ padding: '14px' }}>

      {/* Maç Başlığı */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
        marginBottom: 12
      }}>
        <button onClick={onBack} style={{
          width: 32, height: 32, borderRadius: 'var(--radius-sm)',
          background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-subtle)',
          color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}><ArrowLeft size={16} /></button>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: 'var(--text-4)', fontWeight: 700, letterSpacing: '.02em', marginBottom: 2 }}>
            {match.League}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {match.Team1Logo && <img src={match.Team1Logo} style={{ width: 18, height: 18, borderRadius: '50%' }} />}
            <span style={{ fontWeight: 700, fontSize: 14 }}>{match.Team1}</span>
            <span style={{ color: 'var(--text-4)', fontWeight: 600 }}>vs</span>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{match.Team2}</span>
            {match.Team2Logo && <img src={match.Team2Logo} style={{ width: 18, height: 18, borderRadius: '50%' }} />}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{match.Time?.slice(0, 5)}</div>
          <div style={{ fontSize: 10, color: 'var(--text-4)' }}>{match.BetCount} bahis</div>
        </div>
      </div>

      {/* Takım Form Göstergesi */}
      {(teamForm.team1.length > 0 || teamForm.team2.length > 0) && (
        <div style={{
          display: 'flex', gap: 12, padding: '8px 12px', marginBottom: 8,
          background: 'rgba(255,255,255,.02)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)', fontSize: 11
        }}>
          {[{ name: match.Team1, data: teamForm.team1 }, { name: match.Team2, data: teamForm.team2 }].map((t, ti) => (
            <div key={ti} style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>{t.name}</div>
              {['KG', '2.5Ü', '3.5Ü'].map(label => {
                const field = label === 'KG' ? 'kg_var' : label === '2.5Ü' ? 'over25' : 'over35';
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ width: 32, fontSize: 10, color: 'var(--text-4)', fontWeight: 600 }}>{label}</span>
                    {t.data.slice(0, 5).map((m, i) => (
                      <div key={i} style={{
                        width: 14, height: 14, borderRadius: '50%', fontSize: 8, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: m[field] ? 'var(--green)' : 'var(--red)',
                        color: '#fff'
                      }}>{m[field] ? '✓' : '✗'}</div>
                    ))}
                    <span style={{ fontSize: 9, color: 'var(--text-4)', marginLeft: 2 }}>
                      {t.data.length > 0 ? `${t.data.filter(m => m[field]).length}/${t.data.length}` : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Kategori Menüsü — Yatay Kaydırılabilir */}
      {categories.length > 0 && (
        <div style={{
          display: 'flex', gap: 6, overflowX: 'auto', padding: '0 0 10px',
          WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none'
        }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} style={{
              whiteSpace: 'nowrap', flexShrink: 0,
              padding: '7px 14px', borderRadius: 'var(--radius-full)',
              fontWeight: 700, fontSize: 12,
              background: activeCategory === cat
                ? 'var(--accent)'
                : 'var(--bg-card)',
              color: activeCategory === cat ? '#fff' : 'var(--text-2)',
              border: `1px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border-subtle)'}`,
              transition: 'all .15s'
            }}>
              {cat}
              {activeCategory !== cat && bets.filter(b => cat === 'Tümü' || b.type?.includes(cat)).length > 0 && (
                <span style={{ marginLeft: 5, fontSize: 10, opacity: .5 }}>
                  {cat === 'Tümü' ? bets.length : bets.filter(b => b.type?.includes(cat)).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Bahis Listesi */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
            <RefreshCw size={20} className="spinner" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 12 }}>Bahisler yükleniyor...</p>
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--red)' }}>
            <AlertCircle size={24} style={{ margin: '0 auto 10px', opacity: .5 }} />
            <p style={{ fontSize: 12, fontWeight: 600 }}>{error}</p>
          </div>
        ) : filteredBets.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 12, fontWeight: 600 }}>Bu kategoride bahis yok</p>
          </div>
        ) : (
          filteredBets.map((bet, idx) => {
            const isOyuncu = bet.type?.includes('Oyuncu');
            const isRowLayout = bet.type?.includes('Özel') || bet.type?.includes('Goller') || (!isOyuncu && bet.odds && bet.odds.length <= 3 && bet.gameName.length > 25);
            const groupKey = bet.gameID || idx;
            const isOpen = openGroups[groupKey];

            // Oyuncu bahislerinde oranları sırala (düşükten yükseğe)
            const sortedOdds = isOyuncu && bet.odds
              ? [...bet.odds].filter(o => o.value !== '-' && o.odd != null).sort((a, b) => parseFloat(a.odd) - parseFloat(b.odd))
              : bet.odds;

            return (
              <div key={groupKey} style={{
                borderBottom: '1px solid var(--border-subtle)',
                animation: `slideUp ${Math.min(0.15 + idx * 0.015, 0.5)}s ease-out`
              }}>
                {/* Bahis Başlığı */}
                <div
                  onClick={isOyuncu ? () => setOpenGroups(p => ({ ...p, [groupKey]: !p[groupKey] })) : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 14px',
                    cursor: isOyuncu ? 'pointer' : 'default',
                    transition: 'background .12s',
                    background: isOyuncu && isOpen ? 'rgba(139,92,246,.03)' : 'transparent'
                  }}
                >
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: isOyuncu ? 'rgba(139,92,246,.12)'
                      : bet.type === 'Özel' ? 'rgba(245,158,11,.12)'
                      : 'rgba(59,130,246,.1)',
                    color: isOyuncu ? 'var(--purple)'
                      : bet.type === 'Özel' ? 'var(--amber)'
                      : 'var(--accent)',
                    letterSpacing: '.02em', flexShrink: 0
                  }}>{bet.type}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', flex: 1 }}>{bet.gameName}</span>

                  {isOyuncu && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--text-4)',
                        background: 'rgba(255,255,255,.04)', padding: '2px 8px',
                        borderRadius: 'var(--radius-full)'
                      }}>{sortedOdds?.length || 0} oran</span>
                      {isOpen
                        ? <ChevronDown size={14} color="var(--purple)" />
                        : <ChevronRight size={14} color="var(--text-4)" />
                      }
                    </div>
                  )}
                </div>

                {/* Oyuncu bets: collapsible list */}
                {isOyuncu && isOpen && sortedOdds && (
                  <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {sortedOdds.map((o, i) => {
                      const v = parseFloat(o.odd);
                      let oddColor = 'var(--text-2)';
                      let oddBg = 'rgba(255,255,255,.04)';
                      if (v <= 1.5) { oddColor = 'var(--green)'; oddBg = 'var(--green-dim)'; }
                      else if (v >= 5.0) { oddColor = 'var(--amber)'; oddBg = 'var(--amber-dim)'; }

                      // Sportmonks: oyuncu istatistik eşleştirme
                      const playerName = o.value?.replace(/\s*\d[+-].*/, '').replace(/\s*(Alt|Üst|Evet|Hayır|Gol|Asist|Şut|İlk|Son).*$/i, '').trim();
                      const norm = s => s?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || '';
                      const pKey = norm(playerName);
                      const pStats = pKey && Object.entries(teamPlayers).find(([k]) => {
                        const nk = norm(k);
                        return nk.includes(pKey) || pKey.includes(nk);
                      })?.[1];

                      // Market tipine göre gösterilecek stat
                      const gameLower = bet.gameName?.toLowerCase() || '';
                      let statLine = null;
                      if (pStats && pStats.appearances > 0) {
                        if (gameLower.includes('ilk gol')) {
                          const golYuzde = ((pStats.goals / pStats.appearances) * 100).toFixed(0);
                          statLine = `⚽ ${pStats.goals} gol / ${pStats.appearances} maç · %${golYuzde} gol ort. · ${pStats.goals_per_game}/maç`;
                        } else if (gameLower.includes('gol') && gameLower.includes('asist')) {
                          const ga = pStats.goals + pStats.assists;
                          const gaPerGame = (ga / pStats.appearances).toFixed(2);
                          statLine = `${gaPerGame} G+A ort. · ${pStats.goals}G ${pStats.assists}A · ${pStats.appearances} maç`;
                        } else if (gameLower.includes('gol')) {
                          statLine = `${pStats.goals_per_game} gol ort. · ${pStats.goals} gol · ${pStats.appearances} maç`;
                        } else if (gameLower.includes('asist')) {
                          statLine = `${pStats.assists_per_game} asist ort. · ${pStats.assists} asist · ${pStats.appearances} maç`;
                        } else if (gameLower.includes('kart')) {
                          statLine = `${pStats.cards_per_game} kart ort. · ${pStats.yellowcards}S ${pStats.redcards}K · ${pStats.appearances} maç`;
                        } else if (gameLower.includes('kaleyi bulan')) {
                          statLine = `${pStats.shots_on_target_pg} i.şut ort. · ${pStats.shots_on_target} i.şut · ${pStats.appearances} maç`;
                        } else if (gameLower.includes('şut')) {
                          statLine = `${pStats.shots_per_game} şut ort. · ${pStats.shots_total} şut · ${pStats.appearances} maç`;
                        } else if (gameLower.includes('top çal') || gameLower.includes('tackle')) {
                          statLine = `${pStats.tackles_per_game} t.çalma ort. · ${pStats.tackles} · ${pStats.appearances} maç`;
                        } else if (gameLower.includes('kurtar')) {
                          statLine = `${pStats.saves_per_game} kurtarış ort. · ${pStats.saves} · ${pStats.appearances} maç`;
                        } else {
                          statLine = `${pStats.goals}G ${pStats.assists}A · ${pStats.appearances} maç`;
                        }
                      }
                      // DEBUG: neden eşleşmedi
                      if (!statLine && i === 0) {
                        console.log('[SM-DBG] playerName:', playerName, 'pKey:', pKey, 'teamPlayers keys:', Object.keys(teamPlayers).length);
                        // İlk 5 key'i göster
                        const entries = Object.entries(teamPlayers);
                        entries.slice(0, 5).forEach(([k]) => {
                          const nk = norm(k);
                          console.log(`  key: "${k}" → norm: "${nk}" includes pKey: ${nk.includes(pKey)}, pKey includes nk: ${pKey.includes(nk)}`);
                        });
                        // Adrián Fuentes'i bul
                        const fuentes = entries.find(([k]) => k.includes('fuentes') || k.includes('Fuentes'));
                        if (fuentes) console.log('  FUENTES key found:', fuentes[0], '→ norm:', norm(fuentes[0]));
                      }

                      return (
                        <div key={i}>
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '7px 10px', borderRadius: statLine ? '6px 6px 0 0' : 6,
                            background: 'rgba(255,255,255,.015)',
                            border: '1px solid var(--border-subtle)',
                            borderBottom: statLine ? 'none' : '1px solid var(--border-subtle)',
                            cursor: 'pointer', transition: 'background .12s'
                          }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>
                              {o.value}
                            </span>
                            <span style={{
                              fontSize: 13, fontWeight: 800, color: oddColor,
                              background: oddBg, padding: '2px 10px',
                              borderRadius: 'var(--radius-full)', minWidth: 50, textAlign: 'center'
                            }}>
                              {v.toFixed(2)}
                            </span>
                          </div>
                          {statLine && (
                            <div style={{
                              padding: '5px 10px', fontSize: 11, fontWeight: 700,
                              color: 'var(--accent)', background: 'rgba(59,130,246,.06)',
                              border: '1px solid rgba(59,130,246,.1)',
                              borderTop: 'none', borderRadius: '0 0 6px 6px',
                              marginBottom: 2
                            }}>
                              📊 {statLine}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Non-Oyuncu bets: row or grid layout */}
                {!isOyuncu && sortedOdds && (
                  <div style={{ padding: '0 14px 12px' }}>
                    {isRowLayout ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {sortedOdds.map((o, i) => {
                          const v = parseFloat(o.odd);
                          let oddColor = 'var(--text-2)';
                          if (v <= 1.5) oddColor = 'var(--green)';
                          else if (v >= 5.0) oddColor = 'var(--amber)';

                          return (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '6px 10px', borderRadius: 6,
                              background: 'rgba(255,255,255,.02)',
                              border: '1px solid var(--border-subtle)',
                              cursor: 'pointer'
                            }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>
                                {o.value}
                              </span>
                              <span style={{
                                fontSize: 13, fontWeight: 800, color: oddColor,
                                background: v <= 1.5 ? 'var(--green-dim)' : v >= 5.0 ? 'var(--amber-dim)' : 'rgba(255,255,255,.04)',
                                padding: '2px 10px', borderRadius: 'var(--radius-full)', minWidth: 50, textAlign: 'center'
                              }}>
                                {v.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {sortedOdds.map((o, i) => {
                          const v = parseFloat(o.odd);
                          let bg = 'rgba(255,255,255,.035)';
                          let color = 'var(--text-2)';
                          let border = 'var(--border-subtle)';
                          if (v <= 1.5) { bg = 'var(--green-dim)'; color = 'var(--green)'; border = 'rgba(34,197,94,.2)'; }
                          else if (v >= 5.0) { bg = 'var(--amber-dim)'; color = 'var(--amber)'; border = 'rgba(245,158,11,.2)'; }

                          return (
                            <div key={i} style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              minWidth: 52, padding: '5px 8px', borderRadius: 6,
                              background: bg, border: `1px solid ${border}`,
                              cursor: 'pointer'
                            }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-4)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                {o.value}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 800, color }}>{v.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ============================================
   BÜLTEN (Ana Sayfa)
   ============================================ */
export default function Bulten() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [filter, setFilter] = useState('all'); // all, popular, time, single
  const [formMetric, setFormMetric] = useState('over25'); // kg_var, over25, over35
  const [teamForms, setTeamForms] = useState({}); // { teamName: [{kg_var,over25,over35},...] }
  const [selectedDate, setSelectedDate] = useState(''); // '' = bugün

  // Gün listesi: bugün + 3 gün
  const dayOptions = useMemo(() => {
    const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const result = [];
    for (let i = 0; i < 4; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const label = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : `${days[d.getDay()]} ${d.getDate()}`;
      result.push({ date: i === 0 ? '' : dateStr, label });
    }
    return result;
  }, []);

  const POPULAR_LEAGUES = [
    'Premier Lig', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1',
    'Süper Lig', 'Champions League', 'Şampiyonlar Ligi',
    'Eredivisie', 'Primeira Liga', 'Premier Liga',
    'Championship', '2. Bundesliga', 'Serie B'
  ];

  // NosyAPI'den bülten çek
  const fetchBulten = async (date) => {
    setLoading(true);
    setError('');
    try {
      const dateParam = date ? `?date=${date}` : '';
      const res = await fetch(`http://localhost:3001/api/nosy/bulten${dateParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.status === 'success') {
        setMatches(data.data || []);
      } else {
        setMatches([]);
        setError(data.messageTR || 'Veri alınamadı');
      }
    } catch(e) {
      setError('Sunucu bağlantı hatası');
    }
    setLoading(false);
  };

  useEffect(() => { fetchBulten(selectedDate); }, [token, selectedDate]);

  // Maçlar yüklenince tüm takımların formunu toplu çek
  useEffect(() => {
    if (matches.length === 0) return;
    const allTeams = [...new Set(matches.flatMap(m => [m.Team1, m.Team2]).filter(Boolean))];
    fetch('http://localhost:3001/api/sportmonks/team-form-bulk', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ teams: allTeams })
    }).then(r => r.json()).then(d => {
      if (d.data) setTeamForms(d.data);
    }).catch(() => {});
  }, [matches, token]);

  // Liga bazılı gruplama + filtre
  const leagues = useMemo(() => {
    const q = search.toLowerCase();
    let filtered = q
      ? matches.filter(m => m.Teams?.toLowerCase().includes(q) || m.League?.toLowerCase().includes(q))
      : [...matches];

    // Filtre uygula
    if (filter === 'popular') {
      filtered = filtered.filter(m => POPULAR_LEAGUES.some(pl => m.League?.includes(pl)));
    } else if (filter === 'time') {
      filtered.sort((a, b) => (a.Time || '').localeCompare(b.Time || ''));
    } else if (filter === 'single') {
      // MBS 1 olan maçlar, saate göre sıralı
      filtered = filtered.filter(m => m.MB === 1);
      filtered.sort((a, b) => (a.Time || '').localeCompare(b.Time || ''));
    }

    if (filter === 'time') {
      // Saate göre gruplama
      const grouped = {};
      filtered.forEach(m => {
        const hour = m.Time ? m.Time.slice(0, 2) + ':00' : 'Diğer';
        if (!grouped[hour]) grouped[hour] = { name: '⏰ ' + hour, flag: null, country: '', matches: [] };
        grouped[hour].matches.push(m);
      });
      return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
    }

    if (filter === 'single') {
      // Saate göre sırala, ardışık aynı lig = tek başlık
      filtered.sort((a, b) => (a.Time || '').localeCompare(b.Time || ''));
      const groups = [];
      let current = null;
      filtered.forEach(m => {
        const league = m.League || 'Diğer';
        if (!current || current.name !== league) {
          current = { name: league, flag: m.LeagueFlag, country: m.Country, matches: [] };
          groups.push(current);
        }
        current.matches.push(m);
      });
      return groups;
    }

    const grouped = {};
    filtered.forEach(m => {
      const key = m.League || 'Diğer';
      if (!grouped[key]) grouped[key] = { name: key, flag: m.LeagueFlag, country: m.Country, matches: [] };
      grouped[key].matches.push(m);
    });
    return Object.values(grouped);
  }, [matches, search, filter]);

  const toggle = id => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  // Maç detay görünümü
  if (selectedMatch) {
    return <MatchDetail match={selectedMatch} onBack={() => setSelectedMatch(null)} />;
  }

  return (
    <div className="bulten">
      {/* Üst Bar */}
      <div className="bulten-bar" style={{ flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
          <Zap size={16} color="var(--accent)" fill="var(--accent)" />
          <div style={{ flex: 1 }}>
            <h2>BÜLTEN</h2>
            <div className="bulten-bar-sub">{matches.length} maç</div>
          </div>

          {/* Gün Seçici */}
          <div style={{ display: 'flex', gap: 3 }}>
            {dayOptions.map(d => (
              <button key={d.date} onClick={() => setSelectedDate(d.date)} style={{
                padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                background: selectedDate === d.date ? 'var(--accent)' : 'rgba(255,255,255,.04)',
                border: `1px solid ${selectedDate === d.date ? 'var(--accent)' : 'var(--border-subtle)'}`,
                color: selectedDate === d.date ? '#fff' : 'var(--text-3)',
                fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap'
              }}>{d.label}</button>
            ))}
          </div>
        </div>

        {/* Filtreler */}
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {[
            { id: 'all', label: 'Tümü' },
            { id: 'popular', label: 'Popüler' },
            { id: 'time', label: 'Saate Göre' },
            { id: 'single', label: 'Tek Maç' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(prev => prev === f.id ? 'all' : f.id)} style={{
              flex: 1, padding: '6px 0', borderRadius: 'var(--radius-sm)',
              background: filter === f.id ? 'var(--accent)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${filter === f.id ? 'var(--accent)' : 'var(--border-subtle)'}`,
              color: filter === f.id ? '#fff' : 'var(--text-3)',
              fontSize: 10, fontWeight: 700
            }}>{f.label}</button>
          ))}
        </div>

        {/* Form Metrik Toggle */}
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {[{ id: 'over25', label: '2.5 Ü' }, { id: 'over35', label: '3.5 Ü' }, { id: 'kg_var', label: 'KG VAR' }].map(f => (
            <button key={f.id} onClick={() => setFormMetric(f.id)} style={{
              flex: 1, padding: '5px 0', borderRadius: 'var(--radius-sm)',
              background: formMetric === f.id ? 'rgba(16,185,129,.15)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${formMetric === f.id ? 'rgba(16,185,129,.4)' : 'var(--border-subtle)'}`,
              color: formMetric === f.id ? 'var(--green)' : 'var(--text-4)',
              fontSize: 10, fontWeight: 700
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Maç Listesi */}
      {loading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
          {Array.from({ length: 6 }).map((_, i) => <MatchSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="league-block" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: 40, textAlign: 'center' }}>
          <AlertCircle size={28} color="var(--red)" style={{ margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</p>
          <button onClick={fetchBulten} style={{
            marginTop: 12, padding: '8px 16px', background: 'rgba(59,130,246,.1)',
            border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-md)',
            color: 'var(--accent)', fontWeight: 700, fontSize: 12
          }}>Tekrar Dene</button>
        </div>
      ) : leagues.length === 0 ? (
        <div className="league-block" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
          <div className="empty">
            <Clock size={36} />
            <p style={{ fontWeight: 600, marginTop: 8 }}>Sonuç bulunamadı</p>
          </div>
        </div>
      ) : (
        leagues.map((lg, idx) => {
          const collapseKey = `${filter}-${idx}-${lg.name}`;
          return (
          <div key={collapseKey} className="league-block"
            style={idx === leagues.length - 1 ? { borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' } : undefined}>

            {/* Liga Başlığı */}
            <div className="league-bar" onClick={() => toggle(collapseKey)}>
              {lg.flag ? (
                <img src={lg.flag} className="league-flag" alt="" onError={e => e.target.style.display='none'} />
              ) : (
                <div className="league-flag-placeholder" />
              )}
              <span className="league-label">{lg.name}</span>
              <span className="league-cnt">{lg.matches.length}</span>
              {collapsed[collapseKey] ? <ChevronRight size={13} color="var(--text-4)" /> : <ChevronDown size={13} color="var(--text-4)" />}
            </div>

            {/* Maçlar */}
            {!collapsed[collapseKey] && lg.matches.map(m => (
              <div key={m.MatchID} className="match" onClick={() => setSelectedMatch(m)}>
                <div className={`match-time ${m.LiveStatus === 2 ? 'live' : ''}`}>
                  {m.LiveStatus === 2 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <div className="live-dot" />
                      <span style={{ fontSize: 9 }}>CANLI</span>
                    </div>
                  ) : m.Time?.slice(0, 5)}
                </div>

                <div className="match-teams">
                  <div className="team-row">
                    {m.Team1Logo && <img src={m.Team1Logo} style={{ width: 16, height: 16, borderRadius: '50%' }} onError={e => e.target.style.display='none'} />}
                    {!m.Team1Logo && <div className="team-logo">{m.Team1?.[0]}</div>}
                    <span>{m.Team1}</span>
                    {teamForms[m.Team1] && <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
                      {Array.from({length: 5}).map((_, fi) => {
                        const f = teamForms[m.Team1][fi];
                        return <div key={fi} style={{ width: 10, height: 10, borderRadius: '50%', background: f ? (f[formMetric] ? 'var(--green)' : 'var(--red)') : 'rgba(255,255,255,.08)' }} />;
                      })}
                    </div>}
                  </div>
                  <div className="team-row">
                    {m.Team2Logo && <img src={m.Team2Logo} style={{ width: 16, height: 16, borderRadius: '50%' }} onError={e => e.target.style.display='none'} />}
                    {!m.Team2Logo && <div className="team-logo">{m.Team2?.[0]}</div>}
                    <span>{m.Team2}</span>
                    {teamForms[m.Team2] && <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
                      {Array.from({length: 5}).map((_, fi) => {
                        const f = teamForms[m.Team2][fi];
                        return <div key={fi} style={{ width: 10, height: 10, borderRadius: '50%', background: f ? (f[formMetric] ? 'var(--green)' : 'var(--red)') : 'rgba(255,255,255,.08)' }} />;
                      })}
                    </div>}
                  </div>
                </div>

                <div style={{
                  fontSize: 12, fontWeight: 800, color: '#fff',
                  background: 'var(--accent)', padding: '6px 12px',
                  borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
                  minWidth: 44, textAlign: 'center', flexShrink: 0
                }}>+{m.BetCount}</div>
              </div>
            ))}
          </div>
          );
        })
      )}
    </div>
  );
}
