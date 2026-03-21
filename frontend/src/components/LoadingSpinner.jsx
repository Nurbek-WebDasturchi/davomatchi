import React from 'react';

export default function LoadingSpinner({ message = 'Yuklanmoqda...' }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      gap: '16px',
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        border: '3px solid var(--border)',
        borderTop: '3px solid var(--accent-blue)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        {message}
      </p>
    </div>
  );
}
