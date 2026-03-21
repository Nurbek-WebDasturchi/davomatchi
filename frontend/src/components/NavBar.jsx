import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/',          icon: '🏠', label: 'Bosh sahifa' },
  { path: '/scan',      icon: '📷', label: 'Skaner'      },
  { path: '/analytics', icon: '📊', label: 'Tahlil'      },
];

export default function NavBar() {
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0, left: 0, right: 0,
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      display: 'flex',
      padding: '6px 0 env(safe-area-inset-bottom, 6px)',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map(({ path, icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              padding: '8px 4px',
              background: 'transparent',
              color: active ? 'var(--accent-blue-light)' : 'var(--text-muted)',
              fontSize: '10px',
              fontWeight: active ? 800 : 500,
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
            {active && (
              <span style={{
                width: '4px', height: '4px',
                borderRadius: '50%',
                background: 'var(--accent-blue)',
                marginTop: '1px',
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
