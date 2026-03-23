import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userId,   setUserId]   = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPw,   setShowPw]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim()) {
      setError("ID va parolni kiriting");
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(userId.trim(), password);
    if (result.success) {
      const role = result.user.role;
      if (role === 'student') {
        navigate('/profile', { replace: true });
      } else if (['master', 'curator'].includes(role)) {
        navigate('/my-groups', { replace: true });
      } else if (['director', 'deputy'].includes(role)) {
        navigate('/', { replace: true });
      } else if (role === 'attendance_manager') {
        navigate('/mark', { replace: true });
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px',
      background: 'var(--bg-primary)',
    }}>
      {/* Logo */}
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '32px', marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
      }}>🎓</div>

      <h1 style={{ fontSize: '24px', fontWeight: 900, marginBottom: '4px' }}>
        Davomat Tizimi
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '32px' }}>
        Tizimga kirish
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        width: '100%', maxWidth: '340px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        {/* ID */}
        <div>
          <label style={{
            display: 'block', fontSize: '12px',
            fontWeight: 700, color: 'var(--text-secondary)',
            marginBottom: '6px',
          }}>
            FOYDALANUVCHI ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value.toUpperCase())}
            placeholder="DR0001"
            maxLength={10}
            style={{
              width: '100%', padding: '12px 14px',
              background: 'var(--bg-secondary)',
              border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)', fontSize: '16px',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
            }}
          />
        </div>

        {/* Parol */}
        <div>
          <label style={{
            display: 'block', fontSize: '12px',
            fontWeight: 700, color: 'var(--text-secondary)',
            marginBottom: '6px',
          }}>
            PAROL
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '12px 44px 12px 14px',
                background: 'var(--bg-secondary)',
                border: `1px solid ${error ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)', fontSize: '15px',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: 'absolute', right: '12px', top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent', color: 'var(--text-muted)',
                fontSize: '16px', padding: '4px',
              }}
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Xato */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 14px',
            color: 'var(--accent-red)',
            fontSize: '13px', fontWeight: 600,
            textAlign: 'center',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Kirish tugmasi */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px',
            background: loading ? 'var(--bg-secondary)' : 'var(--accent-blue)',
            color: loading ? 'var(--text-muted)' : '#fff',
            borderRadius: 'var(--radius-md)',
            fontSize: '15px', fontWeight: 800,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '16px', height: '16px',
                border: '2px solid var(--border)',
                borderTop: '2px solid var(--accent-blue)',
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              Tekshirilmoqda...
            </>
          ) : '🔐 Kirish'}
        </button>
      </form>

      {/* Rol izohi */}
      <div style={{
        marginTop: '32px', width: '100%', maxWidth: '340px',
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px',
      }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '8px' }}>
          ID FORMATLARI
        </p>
        {[
          { id: 'DR****', label: 'Direktor' },
          { id: 'DP****', label: 'Direktor o\'rinbosari' },
          { id: 'AM****', label: 'Davomatchi' },
          { id: 'MA****', label: 'Usta o\'qituvchi' },
          { id: 'CU****', label: 'Kurator' },
          { id: 'ST****', label: "O'quvchi" },
        ].map(({ id, label }) => (
          <div key={id} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '4px 0', borderBottom: '1px solid var(--border)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-blue-light)' }}>
              {id}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
