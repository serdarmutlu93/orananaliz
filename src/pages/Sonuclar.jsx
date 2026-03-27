import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { Search, Trophy, ChevronDown, ChevronRight, ChevronLeft, Clock, RefreshCw, AlertCircle } from 'lucide-react';

const toDateStr = (d) => d.toISOString().split('T')[0]; // YYYY-MM-DD
const formatTR = (d) => d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });

export default function Sonuclar() {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('tumu');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const today = new Date();
  const isToday = toDateStr(selectedDate) === toDateStr(today);

  const changeDate = (days) => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + days);
      if (d > today) return today;
      return d;
    });
    setCollapsed({});
  };

  const fetchResults = async () => {
    setLoading(true);
    setError('');
    try {
      const dateParam = isToday ? '' : `?date=${toDateStr(selectedDate)}`;
      const sep = dateParam ? '&' : '?';
      const res = await fetch(`http://localhost:3001/api/nosy/matches${dateParam ? '?date=' + toDateStr(selectedDate) : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMatches(data.data || []);
      } else {
        setError(data.messageTR || 'Veri alınamadı');
      }
    } catch(e) {
      setError('Sunucu bağlantı hatası');
    }
    setLoading(false);
  };

  useEffect(() => { fetchResults(); }, [token, selectedDate]);

  // Helpers
  const getScore = (m) => {
    const mr = m.matchResult || [];
    return {
      home: mr.find(r => r.metaName === 'msHomeScore')?.value ?? '-',
      away: mr.find(r => r.metaName === 'msAwayScore')?.value ?? '-'
    };
  };
  const getHT = (m) => {
    const mr = m.matchResult || [];
    const h = mr.find(r => r.metaName === 'htHomeScore')?.value;
    const a = mr.find(r => r.metaName === 'htAwayScore')?.value;
    return (h && a) ? `${h}-${a}` : null;
  };
  const getCorners = (m) => {
    const mr = m.matchResult || [];
    const h = mr.find(r => r.metaName === 'homeCorner')?.value;
    const a = mr.find(r => r.metaName === 'awayCorner')?.value;
    return (h && a && h !== '-') ? { home: h, away: a, total: parseInt(h) + parseInt(a) } : null;
  };
  const getCards = (m) => {
    const mr = m.matchResult || [];
    const hy = mr.find(r => r.metaName === 'homeyellowCard')?.value;
    const ay = mr.find(r => r.metaName === 'awayyellowCard')?.value;
    const hr = mr.find(r => r.metaName === 'homeredCard')?.value;
    const ar = mr.find(r => r.metaName === 'awayredCard')?.value;
    const hasYellow = hy && hy !== '-';
    const hasRed = hr && hr !== '-';
    if (!hasYellow && !hasRed) return null;
    return {
      homeYellow: hasYellow ? hy : '0', awayYellow: hasYellow ? ay : '0',
      homeRed: hasRed ? hr : '0', awayRed: hasRed ? ar : '0',
      totalYellow: hasYellow ? parseInt(hy) + parseInt(ay) : 0,
      totalRed: hasRed ? parseInt(hr) + parseInt(ar) : 0
    };
  };

  const POPULAR = ['Premier Lig','La Liga','Bundesliga','Serie A','Ligue 1','Süper Lig','Champions League','Şampiyonlar Ligi','Eredivisie','Premier Liga','Championship'];

  // Filtreleme + gruplama
  const leagues = useMemo(() => {
    const q = search.toLowerCase();
    let filtered = q
      ? matches.filter(m => m.Teams?.toLowerCase().includes(q) || m.League?.toLowerCase().includes(q))
      : [...matches];

    if (filter === 'saate') {
      filtered.sort((a, b) => (a.Time || '').localeCompare(b.Time || ''));
      const grouped = {};
      filtered.forEach(m => {
        const hour = m.Time ? m.Time.slice(0, 2) + ':00' : 'Bilinmiyor';
        if (!grouped[hour]) grouped[hour] = { name: `⏰ ${hour}`, flag: null, matches: [] };
        grouped[hour].matches.push(m);
      });
      return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
    }

    // Default: lige göre, popüler ligler önce
    const grouped = {};
    filtered.forEach(m => {
      const key = m.League || 'Diğer';
      if (!grouped[key]) grouped[key] = { name: key, flag: m.LeagueFlag, matches: [] };
      grouped[key].matches.push(m);
    });
    const groups = Object.values(grouped);
    groups.sort((a, b) => {
      const aPopular = POPULAR.some(p => a.name.includes(p)) ? 0 : 1;
      const bPopular = POPULAR.some(p => b.name.includes(p)) ? 0 : 1;
      if (aPopular !== bPopular) return aPopular - bPopular;
      return a.name.localeCompare(b.name);
    });
    return groups;
  }, [matches, search, filter]);

  const toggle = id => setCollapsed(p => ({ ...p, [id]: !p[id] }));

  const filters = [
    { id: 'tumu', label: 'Tümü' },
    { id: 'saate', label: 'Saate Göre' },
  ];

  return (
    <div className="bulten">
      {/* Üst Bar */}
      <div className="bulten-bar" style={{ flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
          <Trophy size={16} color="var(--amber)" />
          <div style={{ flex: 1 }}>
            <h2>MAÇ SONUÇLARI</h2>
            <div className="bulten-bar-sub">{matches.length} maç · {isToday ? 'Bugün' : formatTR(selectedDate)}</div>
          </div>
          <div className="search-wrap">
            <Search size={13} />
            <input
              id="result-search"
              className="search-box"
              type="text"
              placeholder="Maç ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Filtreler + Tarih — tek satır */}
        <div style={{ display: 'flex', gap: 6, width: '100%', alignItems: 'center' }}>
          {/* Sol: Filtreler */}
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {filters.map(f => (
              <button key={f.id} onClick={() => { setFilter(prev => prev === f.id ? 'tumu' : f.id); setCollapsed({}); }} style={{
                flex: 1, padding: '6px 0', borderRadius: 'var(--radius-sm)',
                background: filter === f.id ? 'var(--amber)' : 'rgba(255,255,255,.04)',
                border: `1px solid ${filter === f.id ? 'var(--amber)' : 'var(--border-subtle)'}`,
                color: filter === f.id ? '#000' : 'var(--text-3)',
                fontSize: 10, fontWeight: 700
              }}>{f.label}</button>
            ))}
          </div>

          {/* Sağ: Tarih */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button onClick={() => changeDate(-1)} style={{
              width: 26, height: 26, borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}><ChevronLeft size={14} /></button>
            <button onClick={() => setSelectedDate(new Date())} style={{
              padding: '4px 10px', borderRadius: 'var(--radius-sm)',
              background: isToday ? 'var(--amber)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${isToday ? 'var(--amber)' : 'var(--border-subtle)'}`,
              color: isToday ? '#000' : 'var(--text-1)',
              fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap'
            }}>{isToday ? 'Bugün' : formatTR(selectedDate)}</button>
            <button onClick={() => changeDate(1)} disabled={isToday} style={{
              width: 26, height: 26, borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-subtle)',
              color: isToday ? 'var(--text-4)' : 'var(--text-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: isToday ? 0.4 : 1
            }}><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* Maç Listesi */}
      {loading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr auto', gap: 10, alignItems: 'center' }}>
                <div className="skeleton" style={{ height: 14, width: 36 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div className="skeleton" style={{ height: 12, width: '55%' }} />
                  <div className="skeleton" style={{ height: 12, width: '45%' }} />
                </div>
                <div className="skeleton" style={{ height: 28, width: 50 }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="league-block" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: 40, textAlign: 'center' }}>
          <AlertCircle size={28} color="var(--red)" style={{ margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</p>
          <button onClick={fetchResults} style={{
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
        leagues.map((lg, idx) => (
          <div key={lg.name} className="league-block"
            style={idx === leagues.length - 1 ? { borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' } : undefined}>

            {/* Liga Başlığı */}
            <div className="league-bar" onClick={() => toggle(lg.name)}>
              {lg.flag ? (
                <img src={lg.flag} className="league-flag" alt="" onError={e => e.target.style.display='none'} />
              ) : (
                <div className="league-flag-placeholder" />
              )}
              <span className="league-label">{lg.name}</span>
              <span className="league-cnt">{lg.matches.length}</span>
              {collapsed[lg.name] ? <ChevronRight size={13} color="var(--text-4)" /> : <ChevronDown size={13} color="var(--text-4)" />}
            </div>

            {/* Maçlar */}
            {!collapsed[lg.name] && lg.matches.map(m => {
              const score = getScore(m);
              const ht = getHT(m);
              const corners = getCorners(m);
              const cards = getCards(m);
              const isLive = m.LiveStatus === 2;
              const isFinished = m.GameResult === 1;

              return (
                <div key={m.MatchID} style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  padding: '8px 10px', borderBottom: '1px solid var(--border-subtle)',
                  fontSize: 12, cursor: 'default'
                }}>
                  {/* Ev kart + korner */}
                  <span style={{ minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    {cards && cards.totalYellow > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: 3,
                        background: '#f5c518', color: '#000',
                        fontSize: 12, fontWeight: 900, lineHeight: 1
                      }}>{cards.homeYellow}</span>
                    )}
                    {cards && parseInt(cards.homeRed) > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: 3,
                        background: '#ef4444', color: '#fff',
                        fontSize: 12, fontWeight: 900, lineHeight: 1
                      }}>{cards.homeRed}</span>
                    )}
                    {corners && (
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>🚩{corners.home}</span>
                    )}
                  </span>

                  {/* Takım 1 */}
                  <span style={{
                    flex: 1, textAlign: 'right', fontWeight: 600, fontSize: 12,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: isFinished && parseInt(score.home) > parseInt(score.away) ? 'var(--green)' : 'var(--text-1)',
                    paddingRight: 6
                  }}>{m.Team1}</span>

                  {/* Skor Kutusu */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    flexShrink: 0
                  }}>
                    {ht && (
                      <span style={{
                        fontSize: 8, fontWeight: 700, color: 'var(--text-4)',
                        background: 'rgba(255,255,255,.06)', padding: '1px 5px',
                        borderRadius: 3, marginBottom: 1, whiteSpace: 'nowrap'
                      }}>İY:{ht}</span>
                    )}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'rgba(255,255,255,.06)', padding: '3px 10px',
                      borderRadius: 4, fontWeight: 900, fontSize: 15
                    }}>
                      <span style={{ color: isFinished && parseInt(score.home) > parseInt(score.away) ? 'var(--green)' : 'var(--text-1)' }}>{score.home}</span>
                      <span style={{ color: 'var(--text-4)', fontSize: 12 }}>-</span>
                      <span style={{ color: isFinished && parseInt(score.away) > parseInt(score.home) ? 'var(--green)' : 'var(--text-1)' }}>{score.away}</span>
                    </div>
                  </div>

                  {/* Takım 2 */}
                  <span style={{
                    flex: 1, textAlign: 'left', fontWeight: 600, fontSize: 12,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: isFinished && parseInt(score.away) > parseInt(score.home) ? 'var(--green)' : 'var(--text-1)',
                    paddingLeft: 6
                  }}>{m.Team2}</span>

                  {/* Deplasman kart + korner */}
                  <span style={{ minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 4 }}>
                    {corners && (
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}>🚩{corners.away}</span>
                    )}
                    {cards && cards.totalYellow > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: 3,
                        background: '#f5c518', color: '#000',
                        fontSize: 12, fontWeight: 900, lineHeight: 1
                      }}>{cards.awayYellow}</span>
                    )}
                    {cards && parseInt(cards.awayRed) > 0 && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: 3,
                        background: '#ef4444', color: '#fff',
                        fontSize: 12, fontWeight: 900, lineHeight: 1
                      }}>{cards.awayRed}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
