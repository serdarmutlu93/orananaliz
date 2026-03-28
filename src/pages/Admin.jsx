import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { UserPlus, Trash2, RefreshCw, Activity, Phone, Lock, ChevronDown, ChevronRight, Shield, Ban, CheckCircle, Clock, Eye } from 'lucide-react';

export default function Admin() {
  const { token, API } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [addError, setAddError] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [userStats, setUserStats] = useState({});

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/users`, { headers });
      if (res.ok) setUsers(await res.json());
    } catch(e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const addUser = async (e) => {
    e.preventDefault();
    setAddError('');
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST', headers,
        body: JSON.stringify({ phone: newPhone, password: newPassword, role: 'user' })
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error); return; }
      setNewPhone('');
      setNewPassword('');
      fetchUsers();
    } catch(e) { setAddError('Sunucu hatası'); }
  };

  const deleteUser = async (id, phone) => {
    if (!confirm(`${phone} numaralı üyeyi silmek istediğinize emin misiniz?`)) return;
    try {
      await fetch(`${API}/users/${id}`, { method: 'DELETE', headers });
      fetchUsers();
    } catch(e) { /* ignore */ }
  };

  const reactivateUser = async (id) => {
    try {
      await fetch(`${API}/users/${id}/reactivate`, { method: 'POST', headers });
      fetchUsers();
    } catch(e) { /* ignore */ }
  };

  const loadStats = async (userId) => {
    if (expandedUser === userId) { setExpandedUser(null); return; }
    setExpandedUser(userId);
    try {
      const res = await fetch(`${API}/users/${userId}/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUserStats(prev => ({ ...prev, [userId]: data }));
      }
    } catch(e) { /* ignore */ }
  };

  const activeCount = users.filter(u => u.is_active).length;
  const bannedCount = users.filter(u => !u.is_active).length;

  return (
    <div style={{ padding: '16px', maxWidth: 800, margin: '0 auto', animation: 'fadeIn .3s ease-out' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '16px 18px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <Shield size={22} color="var(--purple)" />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>Admin Panel</h2>
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Üye yönetimi ve istatistikler</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--green-dim)', color: 'var(--green)', fontSize: 11, fontWeight: 700 }}>
            {activeCount} Aktif
          </div>
          <div style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 11, fontWeight: 700 }}>
            {bannedCount} Yasaklı
          </div>
        </div>
      </div>

      {/* API SYNC SECTION */}
      <div style={{ marginBottom: 20, padding: '16px 18px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 10, color: 'var(--text-1)' }}>Veritabanı Senkronizasyonu (API)</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={async (e) => {
            const btn = e.currentTarget;
            const originalText = btn.innerText;
            btn.innerText = 'Senkronize Ediliyor... (Lütfen bekleyin)';
            btn.disabled = true;
            try {
              const res = await fetch(`${API}/sportmonks/sync`, { method: 'POST', headers });
              const data = await res.json();
              alert(data.message || data.error || 'İşlem bitti');
            } catch(e) { alert('Hata oluştu'); }
            btn.innerText = originalText;
            btn.disabled = false;
          }} style={{ padding: '10px 16px', background: 'rgba(59,130,246,.1)', color: 'var(--accent)', border: '1px solid rgba(59,130,246,.3)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={16} /> Sportmonks & Form Senkronize Et
          </button>
          
          <button onClick={async (e) => {
            const btn = e.currentTarget;
            const originalText = btn.innerText;
            btn.innerText = 'Çekiliyor...';
            btn.disabled = true;
            try {
              const res = await fetch(`${API}/nosy/gol6/sync`, { method: 'POST', headers, body: JSON.stringify({ days: 30 }) });
              const data = await res.json();
              alert(`İşlem bitti. Veritabanına yeni eklenen: ${data.saved} maç. Toplam kayıt: ${data.total}`);
            } catch(e) { alert('Hata oluştu'); }
            btn.innerText = originalText;
            btn.disabled = false;
          }} style={{ padding: '10px 16px', background: 'rgba(16,185,129,.1)', color: 'var(--green)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={16} /> 6+ Gol Maçlarını Çek
          </button>
        </div>
      </div>

      {/* ADD USER FORM */}
      <form onSubmit={addUser} style={{
        display: 'flex', gap: 8, marginBottom: 16, padding: '14px 16px',
        background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)', flexWrap: 'wrap', alignItems: 'center'
      }}>
        <UserPlus size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
        <input
          type="tel" placeholder="Tel (5XXXXXXXXX)" value={newPhone}
          onChange={e => setNewPhone(e.target.value.replace(/[^0-9]/g, ''))}
          required
          style={{
            flex: '1 1 140px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px', color: 'var(--text-1)',
            fontSize: 13, outline: 'none'
          }}
        />
        <input
          type="text" placeholder="Şifre" value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
          style={{
            flex: '1 1 100px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px', color: 'var(--text-1)',
            fontSize: 13, outline: 'none'
          }}
        />
        <button type="submit" style={{
          padding: '8px 16px', background: 'var(--accent)', color: '#fff',
          borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 5
        }}>
          <UserPlus size={14} /> EKLE
        </button>
        {addError && <div style={{ width: '100%', fontSize: 11, color: 'var(--red)', fontWeight: 600, marginTop: 4 }}>{addError}</div>}
      </form>

      {/* USER LIST */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>

        {/* Table Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px',
          padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
          fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '.04em'
        }}>
          <span>TELEFON</span>
          <span style={{ textAlign: 'center' }}>DURUM</span>
          <span style={{ textAlign: 'center' }}>MULTI</span>
          <span style={{ textAlign: 'right' }}>İŞLEM</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            <RefreshCw size={20} className="spinner" style={{ margin: '0 auto 10px' }} />
            Yükleniyor...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Henüz üye yok</div>
        ) : (
          users.map(u => (
            <div key={u.id}>
              {/* User Row */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 100px 80px 100px',
                padding: '11px 16px', borderBottom: '1px solid var(--border-subtle)',
                alignItems: 'center', fontSize: 13,
                opacity: u.is_active ? 1 : 0.5
              }}>
                {/* Phone + Role */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: u.role === 'admin' ? 'rgba(139,92,246,.15)' : 'rgba(59,130,246,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    color: u.role === 'admin' ? 'var(--purple)' : 'var(--accent)'
                  }}>
                    {u.role === 'admin' ? '👑' : 'U'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>0{u.phone}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-4)' }}>
                      {u.role === 'admin' ? 'Admin' : 'Üye'} · Şifre: {u.password}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                  {u.is_active ? (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                      AKTİF
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'var(--red-dim)', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                      YASAKLI
                    </span>
                  )}
                </div>

                {/* Multi Login Count */}
                <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 12 }}>
                  <span style={{
                    color: u.multi_login_count > 0 ? 'var(--red)' : 'var(--text-4)',
                    background: u.multi_login_count > 0 ? 'var(--red-dim)' : 'transparent',
                    padding: '2px 6px', borderRadius: 'var(--radius-full)'
                  }}>
                    {u.multi_login_count || 0}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button onClick={() => loadStats(u.id)} title="İstatistik"
                    style={{
                      width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                      background: expandedUser === u.id ? 'rgba(59,130,246,.15)' : 'rgba(255,255,255,.04)',
                      border: '1px solid var(--border-subtle)',
                      color: expandedUser === u.id ? 'var(--accent)' : 'var(--text-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                  >
                    <Eye size={13} />
                  </button>

                  {!u.is_active && (
                    <button onClick={() => reactivateUser(u.id)} title="Aktifleştir"
                      style={{
                        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                        background: 'var(--green-dim)', border: '1px solid rgba(34,197,94,.2)',
                        color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <CheckCircle size={13} />
                    </button>
                  )}

                  {u.role !== 'admin' && (
                    <button onClick={() => deleteUser(u.id, u.phone)} title="Sil"
                      style={{
                        width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                        background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,.2)',
                        color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Stats */}
              {expandedUser === u.id && (
                <div style={{
                  padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)',
                  background: 'rgba(59,130,246,.02)', animation: 'slideUp .25s ease-out'
                }}>
                  {userStats[u.id] ? (
                    <>
                      {/* Stats Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 12 }}>
                        {[
                          { label: 'Giriş', value: userStats[u.id].stats?.total_logins || 0, color: 'var(--accent)' },
                          { label: 'Sayfa', value: userStats[u.id].stats?.total_pages || 0, color: 'var(--green)' },
                          { label: 'Ban', value: userStats[u.id].stats?.total_bans || 0, color: 'var(--red)' },
                          { label: 'Toplam', value: userStats[u.id].stats?.total_actions || 0, color: 'var(--amber)' },
                        ].map(s => (
                          <div key={s.label} style={{
                            padding: '8px 12px', background: 'rgba(255,255,255,.02)',
                            borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)'
                          }}>
                            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '.04em' }}>{s.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                          </div>
                        ))}
                      </div>

                      {/* IP & Dates */}
                      <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', flexWrap: 'wrap', gap: '6px 16px', marginBottom: 10 }}>
                        <span>🌐 IP: <strong>{u.current_ip || 'Yok'}</strong></span>
                        <span>📅 Kayıt: <strong>{u.created_at ? new Date(u.created_at).toLocaleDateString('tr-TR') : '-'}</strong></span>
                        <span>🕐 Son Giriş: <strong>{u.last_login ? new Date(u.last_login).toLocaleString('tr-TR') : '-'}</strong></span>
                      </div>

                      {/* Recent Activity */}
                      {userStats[u.id].recentActivity?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', marginBottom: 6, letterSpacing: '.04em' }}>SON AKTİVİTELER</div>
                          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                            {userStats[u.id].recentActivity.map((a, i) => (
                              <div key={i} style={{
                                display: 'flex', gap: 8, padding: '4px 0',
                                fontSize: 11, color: 'var(--text-3)', borderBottom: '1px solid var(--border-subtle)'
                              }}>
                                <span style={{
                                  fontWeight: 700, fontSize: 9, padding: '1px 5px', borderRadius: 'var(--radius-full)',
                                  background: a.type.includes('ban') ? 'var(--red-dim)' : a.type === 'login' ? 'rgba(59,130,246,.1)' : 'rgba(255,255,255,.04)',
                                  color: a.type.includes('ban') ? 'var(--red)' : a.type === 'login' ? 'var(--accent)' : 'var(--text-4)',
                                  flexShrink: 0, alignSelf: 'center'
                                }}>
                                  {a.type.toUpperCase()}
                                </span>
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.action}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-4)', flexShrink: 0 }}>
                                  {new Date(a.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-3)', fontSize: 12 }}>
                      <RefreshCw size={16} className="spinner" style={{ margin: '0 auto 6px' }} /> Yükleniyor...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
