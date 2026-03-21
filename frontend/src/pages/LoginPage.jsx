import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState('');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      handleLogin(tg.initDataUnsafe.user, tg.initData);
    }
  }, []);

  const handleLogin = async (tgUser, initData) => {
    setLoading(true);
    setStatus("Telegram ma'lumotlari tekshirilmoqda...");
    const result = await login(tgUser, initData);
    if (result.success) {
      navigate('/', { replace: true });
    }
    setLoading(false);
    setStatus('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-primary)',
    }}>
      {/* Logo */}
      <div style={{
        width: '80px', height: '80px',
        borderRadius: '24px',
        background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px',
        marginBottom: '24px',
        boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
      }}>
        🎓
      </div>

      <h1 style={{ fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>
        Davomat Bot
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginBottom: '40px' }}>
        Talabalar davomatini kuzatish tizimi
      </p>

      {/* Holat */}
      {loading ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px', height: '40px',
            border: '3px solid var(--border)',
            borderTop: '3px solid var(--accent-blue)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{status}</p>
        </div>
      ) : error ? (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          textAlign: 'center',
          maxWidth: '320px',
          width: '100%',
        }}>
          <p style={{ fontSize: '24px', marginBottom: '10px' }}>⚠️</p>
          <p style={{ color: 'var(--accent-red)', fontWeight: 700, marginBottom: '8px' }}>
            Kirish mumkin emas
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{error}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '12px' }}>
            Iltimos, administrator bilan bog'laning.
          </p>
        </div>
      ) : (
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center' }}>
          Bu ilovani Telegram orqali oching.<br />
          <span style={{ color: 'var(--accent-blue-light)', fontWeight: 700 }}>
            @{import.meta.env.VITE_BOT_USERNAME || 'davomat_bot'}
          </span>
        </p>
      )}

      {/* Xususiyatlar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '10px',
        marginTop: '48px',
        width: '100%',
        maxWidth: '320px',
      }}>
        {[
          { icon: '📱', text: 'QR Skaner' },
          { icon: '📊', text: 'Tahlil' },
          { icon: '🔐', text: 'Xavfsiz' },
        ].map(({ icon, text }) => (
          <div key={text} style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
