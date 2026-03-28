import React, { useState, useEffect, createContext, useContext } from 'react';
import { Home, Zap, BarChart3, User, LogOut, X, Bell, Shield, LayoutDashboard, Trophy } from 'lucide-react';
import Login from './pages/Login';
import Bulten from './pages/Bulten';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Analiz from './pages/Analiz';

/* ============================================
   AUTH CONTEXT — Backend API
   ============================================ */
const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API = 'https://orananaliz.onrender.com/api';

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('futbolx_token'));
  const [loading, setLoading] = useState(true);

  // Check auth on mount & periodically
  useEffect(() => {
    if (token) {
      checkAuth();
      const interval = setInterval(checkAuth, 180000); // 3 min
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [token]);

  const checkAuth = async () => {
    try {
      const res = await fetch(`${API}/check-auth`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUser(data.user);
    } catch(e) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password) => {
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Giriş yapılamadı',
          details: data.details,
          expires_at: data.expires_at,
          ban_warning: data.ban_warning,
          permanent: data.permanent
        };
      }

      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('futbolx_token', data.token);
      return { success: true };
    } catch(e) {
      return { success: false, error: 'Sunucu bağlantı hatası! Backend çalıştığından emin olun.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('futbolx_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, API }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ============================================
   SIDEBAR
   ============================================ */
function Sidebar({ open, onClose, view, onNav, isAdmin }) {
  if (!open) return null;

  const items = [
    { id: 'bulten', label: 'Ana Sayfa', icon: <Home size={19} />, desc: 'Dashboard' },
    { id: 'canli', label: 'Bülten', icon: <Zap size={19} />, desc: 'Bahis oranları' },
    { id: 'sonuclar', label: 'Sonuçlar', icon: <Trophy size={19} />, desc: 'Maç sonuçları' },
    { id: 'analiz', label: 'Analizler', icon: <BarChart3 size={19} />, desc: 'İstatistik merkezi' },
    { id: 'bildirim', label: 'Bildirimler', icon: <Bell size={19} />, desc: 'Oran değişiklikleri' },
  ];

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside className="sidebar">
        <div className="sidebar-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="logo-icon">⚡</div>
            <span style={{ fontWeight: 800, fontSize: 15 }}>FutbolX</span>
          </div>
          <button className="sidebar-close" onClick={onClose}><X size={16} /></button>
        </div>
        <nav className="sidebar-body">
          {items.map(it => (
            <button key={it.id} className={`nav-item ${view === it.id ? 'active' : ''}`}
              onClick={() => { onNav(it.id); onClose(); }}>
              {it.icon}
              <div>
                <div>{it.label}</div>
                <div className="nav-item-desc">{it.desc}</div>
              </div>
            </button>
          ))}
          {isAdmin && (
            <>
              <div className="sidebar-sep" />
              <button className={`nav-item ${view === 'admin' ? 'active' : ''}`}
                onClick={() => { onNav('admin'); onClose(); }}>
                <Shield size={19} />
                <div>
                  <div>Admin Panel</div>
                  <div className="nav-item-desc">Üye yönetimi</div>
                </div>
              </button>
            </>
          )}
        </nav>
        <div className="sidebar-foot">
          FutbolX Analiz Merkezi<br />
          2 farklı API kaynağından canlı veri
        </div>
      </aside>
    </>
  );
}

/* ============================================
   BOTTOM NAV
   ============================================ */
function BottomNav({ view, onNav }) {
  const tabs = [
    { id: 'bulten', label: 'Ana Sayfa', icon: <Home size={21} /> },
    { id: 'canli', label: 'Bülten', icon: <Zap size={21} /> },
    { id: 'analiz', label: 'Analiz', icon: <BarChart3 size={21} /> },
    { id: 'profil', label: 'Profil', icon: <User size={21} /> },
  ];
  return (
    <nav className="bottomnav">
      {tabs.map(t => (
        <button key={t.id} className={`bnav-item ${view === t.id ? 'active' : ''}`}
          onClick={() => onNav(t.id)}>
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ============================================
   PROFIL
   ============================================ */
function Profil() {
  const { user, logout } = useAuth();
  return (
    <div className="profile-card">
      <div className="profile-avatar"><User size={26} color="#fff" /></div>
      <div className="profile-name">0{user.phone}</div>
      <div className="profile-role">{user.role === 'admin' ? 'Yönetici' : 'Standart Üye'}</div>
      <button className="profile-logout" onClick={logout}>
        <LogOut size={15} /> Çıkış Yap
      </button>
    </div>
  );
}

/* ============================================
   APP
   ============================================ */
function AppContent() {
  const [view, setView] = useState('bulten');
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  if (loading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div className="logo-icon" style={{ width: 48, height: 48, fontSize: 20 }}>⚡</div>
        <div style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600 }}>Yükleniyor...</div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="app">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} view={view} onNav={setView} isAdmin={user.role === 'admin'} />

      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <button className="burger" onClick={() => setMenuOpen(!menuOpen)}>
              <div className={`burger-lines ${menuOpen ? 'open' : ''}`}>
                <span /><span /><span />
              </div>
            </button>
            <div className="logo" onClick={() => setView('bulten')}>
              <div className="logo-icon">⚡</div>
              <span className="logo-text">FutbolX</span>
            </div>
          </div>
          <div className="header-right">
            {user.role === 'admin' && (
              <button
                onClick={() => setView(view === 'admin' ? 'bulten' : 'admin')}
                style={{
                  background: view === 'admin' ? 'rgba(139,92,246,.12)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${view === 'admin' ? 'rgba(139,92,246,.3)' : 'var(--border-subtle)'}`,
                  color: view === 'admin' ? 'var(--purple)' : 'var(--text-2)',
                  padding: '5px 12px', borderRadius: 'var(--radius-full)',
                  fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5
                }}
              >
                {view === 'admin' ? <LayoutDashboard size={14} /> : <Shield size={14} />}
                {view === 'admin' ? 'PANEL' : 'ADMİN'}
              </button>
            )}
            <div className="user-pill">
              <User size={13} />
              <span>0{user.phone}</span>
            </div>
            <button className="logout-btn" onClick={logout} title="Çıkış Yap">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {view === 'admin' && user.role === 'admin' ? (
          <Admin />
        ) : view === 'profil' ? (
          <Profil />
        ) : view === 'canli' ? (
          <Bulten />
        ) : view === 'analiz' ? (
          <Analiz />
        ) : (
          <Dashboard onNavigate={setView} />
        )}
      </main>

      <BottomNav view={view} onNav={setView} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
