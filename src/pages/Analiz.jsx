import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../App';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronRight, AlertCircle, Clock } from 'lucide-react';

/* ============================================
   6+ GOL ANALİZ SAYFASI
   — opening-odds Bets yapısı:
   bets[].gameName, bets[].type, bets[].odds[].odd, bets[].odds[].value
   ============================================ */
function GolAlti({ onBack }) {
  const { token } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedMatch, setExpandedMatch] = useState(null);
  const [dayFilter, setDayFilter] = useState(5);
  const [syncing, setSyncing] = useState(false);

  const dayOptions = [
    { label: '5 Gün', value: 5 },
    { label: '10 Gün', value: 10 },
    { label: '30 Gün', value: 30 },
  ];

  const fetchData = async (days) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://orananaliz.onrender.com/api/nosy/gol6?days=${days || dayFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMatches(data.data || []);
      } else {
        setError('Veri alınamadı');
      }
    } catch(e) {
      setError('Sunucu bağlantı hatası');
    }
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch('https://orananaliz.onrender.com/api/nosy/gol6/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 })
      });
      await fetchData();
    } catch(e) { /* ignore */ }
    setSyncing(false);
  };

  useEffect(() => { fetchData(); }, [token, dayFilter]);

  const [similarData, setSimilarData] = useState({});
  const [similarLoading, setSimilarLoading] = useState({});

  const toggleMatch = async (id) => {
    if (expandedMatch === id) {
      setExpandedMatch(null);
      return;
    }
    setExpandedMatch(id);
    if (similarData[id]) return; // zaten çekilmiş

    setSimilarLoading(p => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`https://orananaliz.onrender.com/api/nosy/gol6/similar/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSimilarData(p => ({ ...p, [id]: data }));
    } catch(e) {
      setSimilarData(p => ({ ...p, [id]: { status: 'error' } }));
    }
    setSimilarLoading(p => ({ ...p, [id]: false }));
  };

  const sorted = useMemo(() => {
    return [...matches].sort((a, b) => b.totalGoals - a.totalGoals);
  }, [matches]);

  // Oran badge'i — eşleşen oranları vurgula
  const OddBadge = ({ label, refVal, curVal, matched, color }) => (
    <div style={{
      padding: '3px 7px', borderRadius: 4, textAlign: 'center', minWidth: 38,
      background: matched ? `${color}15` : 'rgba(255,255,255,.03)',
      border: `1px solid ${matched ? `${color}40` : 'var(--border-subtle)'}`
    }}>
      <div style={{ fontSize: 7, fontWeight: 700, color: matched ? color : 'var(--text-4)' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 900, color: matched ? color : 'var(--text-3)' }}>{curVal ?? '-'}</div>
    </div>
  );

  return (
    <div className="bulten fade-in">
      {/* Üst Bar */}
      <div className="bulten-bar" style={{ flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 8 }}>
          <button onClick={onBack} style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            background: 'rgba(255,255,255,.04)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}><ArrowLeft size={16} /></button>
          <div style={{ flex: 1 }}>
            <h2>⚽ 6+ GOL ANALİZİ</h2>
            <div className="bulten-bar-sub">{matches.length} maç · Son {dayFilter} gün</div>
          </div>
          <button onClick={handleSync} disabled={syncing} style={{
            padding: '5px 10px', borderRadius: 'var(--radius-sm)',
            background: syncing ? 'rgba(59,130,246,.15)' : 'rgba(59,130,246,.08)',
            border: '1px solid rgba(59,130,246,.2)',
            color: 'var(--accent)', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4
          }}>
            <RefreshCw size={11} className={syncing ? 'spinner' : ''} />
            {syncing ? 'Güncelleniyor...' : 'Güncelle'}
          </button>
        </div>

        {/* Gün Filtreleri */}
        <div style={{ display: 'flex', gap: 4, width: '100%' }}>
          {dayOptions.map(d => (
            <button key={d.value} onClick={() => setDayFilter(d.value)} style={{
              flex: 1, padding: '6px 0', borderRadius: 'var(--radius-sm)',
              background: dayFilter === d.value ? 'var(--accent)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${dayFilter === d.value ? 'var(--accent)' : 'var(--border-subtle)'}`,
              color: dayFilter === d.value ? '#fff' : 'var(--text-3)',
              fontSize: 11, fontWeight: 700
            }}>{d.label}</button>
          ))}
        </div>

        {/* Açıklama */}
        <div style={{
          width: '100%', padding: '6px 10px', borderRadius: 'var(--radius-sm)',
          background: 'rgba(139,92,246,.06)', border: '1px solid rgba(139,92,246,.1)',
          fontSize: 10, color: 'var(--text-3)', lineHeight: 1.4
        }}>
          👆 Maça tıkla → Bültende benzer açılış oranlarına sahip başlamamış maçları göster
        </div>
      </div>

      {/* Maç Listesi */}
      {loading ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="skeleton" style={{ height: 18, width: '60%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 12, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="league-block" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: 40, textAlign: 'center' }}>
          <AlertCircle size={28} color="var(--red)" style={{ margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</p>
          <button onClick={fetchData} style={{
            marginTop: 12, padding: '8px 16px', background: 'rgba(59,130,246,.1)',
            border: '1px solid rgba(59,130,246,.2)', borderRadius: 'var(--radius-md)',
            color: 'var(--accent)', fontWeight: 700, fontSize: 12
          }}>Tekrar Dene</button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="league-block" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: 40, textAlign: 'center' }}>
          <Clock size={36} style={{ opacity: .3, marginBottom: 8 }} />
          <p style={{ fontWeight: 600 }}>Son 3 günde 6+ gol maç bulunamadı</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderTop: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)' }}>
          {/* Başlık Satırı */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0,
            padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(255,255,255,.02)', fontSize: 9, fontWeight: 700, color: 'var(--text-4)'
          }}>
            <span style={{ flex: 1 }}>MAÇ</span>
            <span style={{ width: 42, textAlign: 'center', flexShrink: 0 }}>SKOR</span>
            <span style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>3.5Ü</span>
            <span style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>İY1.5</span>
            <span style={{ width: 40, textAlign: 'center', flexShrink: 0 }}>İYKG</span>
          </div>

          {sorted.map(m => {
            const isExpanded = expandedMatch === m.matchID;
            const iy15 = m.iy15Ust;
            const iykg = m.iyKGVar;
            const ms35 = m.ms35Ust;

            return (
              <div key={m.matchID}>
                {/* Maç Satırı */}
                <div onClick={() => toggleMatch(m.matchID)} style={{
                  display: 'flex', alignItems: 'center', gap: 0,
                  padding: '9px 14px', borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer', transition: 'background .12s'
                }}>
                  {/* Takımlar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.team1} - {m.team2}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 1 }}>{m.league}</div>
                  </div>

                  {/* Skor */}
                  <div style={{
                    width: 42, textAlign: 'center', flexShrink: 0,
                    fontWeight: 900, fontSize: 13
                  }}>
                    <span style={{ color: m.homeScore > m.awayScore ? 'var(--green)' : 'var(--text-1)' }}>{m.homeScore}</span>
                    <span style={{ color: 'var(--text-4)', fontSize: 10 }}>-</span>
                    <span style={{ color: m.awayScore > m.homeScore ? 'var(--green)' : 'var(--text-1)' }}>{m.awayScore}</span>
                  </div>

                  {/* 3.5 Üst */}
                  <div style={{
                    width: 40, textAlign: 'center', flexShrink: 0,
                    fontSize: 12, fontWeight: 900,
                    color: ms35 ? 'var(--accent)' : 'var(--text-4)'
                  }}>{ms35 || '-'}</div>

                  {/* İY 1.5 Üst */}
                  <div style={{
                    width: 40, textAlign: 'center', flexShrink: 0,
                    fontSize: 12, fontWeight: 900,
                    color: iy15 ? 'var(--green)' : 'var(--text-4)'
                  }}>{iy15 || '-'}</div>

                  {/* İY KG Var */}
                  <div style={{
                    width: 40, textAlign: 'center', flexShrink: 0,
                    fontSize: 12, fontWeight: 900,
                    color: iykg ? 'var(--amber)' : 'var(--text-4)'
                  }}>{iykg || '-'}</div>
                </div>

                {/* Benzerlik Paneli */}
                {isExpanded && (
                  <div style={{
                    padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)',
                    background: 'rgba(139,92,246,.03)'
                  }}>
                    {similarLoading[m.matchID] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                        <RefreshCw size={13} className="spinner" color="var(--accent)" />
                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Bültende benzer oranlar aranıyor...</span>
                      </div>
                    ) : similarData[m.matchID]?.status === 'success' ? (
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--purple)', marginBottom: 6, letterSpacing: '.03em' }}>
                          🔍 BENZER ORANLI MAÇLAR ({similarData[m.matchID].count})
                        </div>

                        {similarData[m.matchID].count === 0 ? (
                          <div style={{ fontSize: 11, color: 'var(--text-4)', padding: '8px 0' }}>
                            Bültende benzer oranlı maç bulunamadı
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {similarData[m.matchID].data.map(s => (
                              <div key={s.matchID} style={{
                                padding: '8px 10px', borderRadius: 6,
                                background: s.matchCount >= 3 ? 'rgba(34,197,94,.06)' : 'rgba(139,92,246,.04)',
                                border: `1px solid ${s.matchCount >= 3 ? 'rgba(34,197,94,.15)' : 'rgba(139,92,246,.1)'}`
                              }}>
                                {/* Maç Başlığı */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {s.team1} - {s.team2}
                                    </div>
                                    <div style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 1 }}>
                                      {s.league} · {s.date} {s.time}
                                    </div>
                                  </div>
                                  <span style={{
                                    padding: '2px 6px', borderRadius: 3,
                                    background: s.matchCount >= 3 ? 'rgba(34,197,94,.12)' : 'rgba(139,92,246,.1)',
                                    color: s.matchCount >= 3 ? 'var(--green)' : 'var(--purple)',
                                    fontSize: 9, fontWeight: 900
                                  }}>{s.matchCount}/3</span>
                                </div>

                                {/* Oranlar */}
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <OddBadge label="3.5Ü" curVal={s.ms35Ust} matched={!!s.matches.ms35} color="#3b82f6" />
                                  <OddBadge label="İY1.5" curVal={s.iy15Ust} matched={!!s.matches.iy15} color="#22c55e" />
                                  <OddBadge label="İYKG" curVal={s.iyKGVar} matched={!!s.matches.iykg} color="#f59e0b" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'var(--red)', padding: '8px 0' }}>
                        Benzerlik analizi başarısız
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================
   ANALİZ DASHBOARD
   ============================================ */
export default function Analiz() {
  const [subView, setSubView] = useState(null);

  const menuItems = [
    { id: 'gol6', icon: '⚽', title: '6+ Gol', desc: 'Yüksek gollü maç analizi', color: '#22c55e', bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.2)' },
    { id: 'altust', icon: '📊', title: 'Alt/Üst', desc: 'Alt/Üst oran istatistikleri', color: '#3b82f6', bg: 'rgba(59,130,246,.1)', border: 'rgba(59,130,246,.2)' },
    { id: 'korner', icon: '🚩', title: 'Korner Analizi', desc: 'Korner sayı ortalamaları', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.2)' },
    { id: 'kart', icon: '🟨', title: 'Kart Analizi', desc: 'Sarı/kırmızı kart istatistikleri', color: '#ef4444', bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.2)' },
    { id: 'takim', icon: '🏟️', title: 'Takım İstatistikleri', desc: 'Takım bazlı performans verileri', color: '#8b5cf6', bg: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.2)' },
    { id: 'trend', icon: '📈', title: 'Oran Trendleri', desc: 'Oran değişim takibi', color: '#06b6d4', bg: 'rgba(6,182,212,.1)', border: 'rgba(6,182,212,.2)' },
  ];

  if (subView === 'gol6') return <GolAlti onBack={() => setSubView(null)} />;

  return (
    <div className="fade-in" style={{ padding: 14, maxWidth: 600, margin: '0 auto' }}>
      <div style={{
        padding: '20px', marginBottom: 14,
        background: 'linear-gradient(135deg, rgba(139,92,246,.08), rgba(59,130,246,.06))',
        border: '1px solid rgba(139,92,246,.12)', borderRadius: 'var(--radius-xl)',
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,.08) 0%, transparent 70%)' }} />
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          <span style={{ background: 'linear-gradient(135deg, #fff, var(--purple))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analiz Merkezi</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Maç sonuçlarından istatistiksel analizler</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        {menuItems.map(item => (
          <button key={item.id} onClick={() => setSubView(item.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '20px 12px', width: '100%',
            background: 'var(--bg-card)', border: `1px solid ${item.border}`,
            borderRadius: 'var(--radius-lg)', transition: 'all .15s', cursor: 'pointer', textAlign: 'center'
          }}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{item.title}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.3 }}>{item.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: '10px', textAlign: 'center', fontSize: 10, color: 'var(--text-4)' }}>
        NosyAPI maç sonuçlarından otomatik analiz
      </div>
    </div>
  );
}
