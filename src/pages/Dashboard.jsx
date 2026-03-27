import React from 'react';
import { useAuth } from '../App';
import { Zap, BarChart3, TrendingUp, Users, Shield, ArrowRight, Trophy, Target, Clock, Star } from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const { user } = useAuth();

  const menuItems = [
    {
      id: 'canli',
      icon: <Zap size={22} />,
      title: 'Canlı Bülten',
      desc: 'Bahis oranları ve maç listesi',
      color: '#3b82f6',
      bg: 'rgba(59,130,246,.1)',
      border: 'rgba(59,130,246,.2)',
      badge: 'CANLI'
    },
    {
      id: 'sonuclar',
      icon: <Trophy size={22} />,
      title: 'Maç Sonuçları',
      desc: 'Bitmiş maçlar ve skorlar',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,.1)',
      border: 'rgba(245,158,11,.2)',
      badge: 'AKTİF'
    },
    {
      id: 'analiz',
      icon: <BarChart3 size={22} />,
      title: 'Analizler',
      desc: 'Maç istatistikleri ve öngörüler',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,.1)',
      border: 'rgba(139,92,246,.2)',
      badge: 'YAKINDA'
    },
    {
      id: 'trend',
      icon: <TrendingUp size={22} />,
      title: 'Oran Trendleri',
      desc: 'Oran değişim takibi',
      color: '#22c55e',
      bg: 'rgba(34,197,94,.1)',
      border: 'rgba(34,197,94,.2)',
      badge: 'YAKINDA'
    },
    {
      id: 'favori',
      icon: <Star size={22} />,
      title: 'Favorilerim',
      desc: 'Takip ettiğin maçlar ve bahisler',
      color: '#f59e0b',
      bg: 'rgba(245,158,11,.1)',
      border: 'rgba(245,158,11,.2)',
      badge: 'YAKINDA'
    },
  ];

  return (
    <div style={{ padding: '16px', maxWidth: 600, margin: '0 auto', animation: 'fadeIn .3s ease-out' }}>

      {/* Welcome */}
      <div style={{
        padding: '24px 20px',
        background: 'linear-gradient(135deg, rgba(59,130,246,.08), rgba(139,92,246,.06))',
        border: '1px solid rgba(59,130,246,.12)',
        borderRadius: 'var(--radius-xl)',
        marginBottom: 20,
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,.08) 0%, transparent 70%)'
        }} />
        <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 4 }}>Hoş geldin 👋</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          <span style={{
            background: 'linear-gradient(135deg, #fff, var(--accent))',
            WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>FutbolX Dashboard</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Profesyonel futbol analiz ve oran takip platformu
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
        marginBottom: 20
      }}>
        {[
          { label: 'API Durum', value: 'AKTİF', icon: <Zap size={14} />, color: 'var(--green)' },
          { label: 'Veri Kaynağı', value: '2 API', icon: <Target size={14} />, color: 'var(--accent)' },
          { label: 'Üye', value: user.role === 'admin' ? 'Admin' : 'Üye', icon: <Users size={14} />, color: 'var(--purple)' },
        ].map(s => (
          <div key={s.label} style={{
            padding: '12px', background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
            textAlign: 'center'
          }}>
            <div style={{ color: s.color, marginBottom: 4, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: 'var(--text-4)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {menuItems.map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px', width: '100%', textAlign: 'left',
            background: 'var(--bg-card)', border: `1px solid ${item.border}`,
            borderRadius: 'var(--radius-lg)',
            transition: 'all .15s', cursor: 'pointer',
            position: 'relative', overflow: 'hidden'
          }}>
            {/* Icon */}
            <div style={{
              width: 46, height: 46, borderRadius: 'var(--radius-md)',
              background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: item.color, flexShrink: 0
            }}>
              {item.icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{item.desc}</div>
            </div>

            {/* Badge + Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 8, fontWeight: 800, padding: '3px 7px',
                borderRadius: 'var(--radius-full)', letterSpacing: '.04em',
                background: item.badge === 'CANLI' ? 'var(--green-dim)' : item.badge === 'AKTİF' ? 'rgba(245,158,11,.1)' : 'rgba(255,255,255,.04)',
                color: item.badge === 'CANLI' ? 'var(--green)' : item.badge === 'AKTİF' ? 'var(--amber)' : 'var(--text-4)',
                border: `1px solid ${item.badge === 'CANLI' ? 'rgba(34,197,94,.2)' : item.badge === 'AKTİF' ? 'rgba(245,158,11,.2)' : 'var(--border-subtle)'}`
              }}>{item.badge}</span>
              <ArrowRight size={16} color="var(--text-4)" />
            </div>
          </button>
        ))}
      </div>

      {/* Admin Quick Access */}
      {user.role === 'admin' && (
        <button onClick={() => onNavigate('admin')} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', width: '100%', textAlign: 'left',
          marginTop: 16,
          background: 'rgba(139,92,246,.05)', border: '1px solid rgba(139,92,246,.15)',
          borderRadius: 'var(--radius-lg)', cursor: 'pointer'
        }}>
          <Shield size={18} color="var(--purple)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--purple)' }}>Admin Panel</div>
            <div style={{ fontSize: 10, color: 'var(--text-4)' }}>Üye yönetimi ve istatistikler</div>
          </div>
          <ArrowRight size={14} color="var(--purple)" />
        </button>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 24, padding: '12px', textAlign: 'center',
        fontSize: 10, color: 'var(--text-4)', lineHeight: 1.6
      }}>
        FutbolX Analiz Merkezi v1.0<br />
        2 farklı API kaynağından profesyonel veri
      </div>
    </div>
  );
}
