import React, { useState } from 'react';
import { Phone, Lock, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAuth } from '../App';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [banInfo, setBanInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBanInfo(null);
    setLoading(true);

    const result = await login(phone, password);
    if (!result.success) {
      setError(result.error);
      if (result.details || result.expires_at) {
        setBanInfo({
          details: result.details,
          expires_at: result.expires_at ? new Date(result.expires_at).toLocaleString('tr-TR') : null,
          isWarning: result.ban_warning,
          isPermanent: result.permanent
        });
      }
    }
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <h1 className="login-title">FutbolX</h1>
        <p className="login-sub">Profesyonel Futbol Analiz Platformu</p>

        {/* ERROR / BAN WARNING */}
        {error && (
          <div style={{ marginBottom: 14, animation: 'slideUp .3s ease-out' }}>
            <div className="login-error">{error}</div>

            {banInfo && (
              <div style={{
                marginTop: 10,
                padding: 16,
                background: banInfo.isPermanent ? 'linear-gradient(135deg, #991b1b, #7f1d1d)' : banInfo.isWarning ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'var(--red-dim)',
                borderRadius: 'var(--radius-md)',
                border: '2px solid rgba(239,68,68,0.5)',
                boxShadow: '0 0 30px rgba(239,68,68,0.3)',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                  <AlertTriangle size={22} color="#fbbf24" />
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '.02em' }}>
                    {banInfo.isPermanent ? '🚫 HESAP KAPATILDI' : '⚠️ DİKKAT!'}
                  </span>
                </div>

                {banInfo.details && (
                  <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 600, lineHeight: 1.6, marginBottom: 10 }}>
                    {banInfo.details}
                  </p>
                )}

                {banInfo.isWarning && (
                  <div style={{
                    marginTop: 8, padding: '10px 14px',
                    background: 'rgba(0,0,0,.4)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(251,191,36,.3)'
                  }}>
                    <p style={{ color: '#fbbf24', fontSize: 12, fontWeight: 800 }}>
                      ⚡ TEKRARI HALİNDE HESAP KALICI SİLİNİR!
                    </p>
                  </div>
                )}

                {banInfo.expires_at && (
                  <div style={{
                    marginTop: 10, padding: '6px 14px',
                    background: 'rgba(0,0,0,.3)', borderRadius: 'var(--radius-full)',
                    display: 'inline-block', fontSize: 11, color: '#94a3b8', fontWeight: 600
                  }}>
                    Yasak Bitiş: {banInfo.expires_at}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <div className="field-icon">
              <Phone size={16} />
              <span style={{ fontWeight: 700, color: 'var(--text-2)', fontSize: 13 }}>+90</span>
            </div>
            <input
              id="phone"
              type="tel"
              placeholder="5XX XXX XX XX"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              required
              autoComplete="tel"
              style={{ paddingLeft: 76 }}
            />
          </div>

          <div className="field">
            <div className="field-icon"><Lock size={16} /></div>
            <input
              id="password"
              type="password"
              inputMode="numeric"
              placeholder="Şifre"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Giriş Yapılıyor...' : <><span>GİRİŞ YAP</span><ArrowRight size={17} /></>}
          </button>
        </form>

        <div className="login-footer">
          SİSTEME ERİŞİM SADECE YETKİLİ ÜYELER İÇİNDİR
        </div>
      </div>
    </div>
  );
}
