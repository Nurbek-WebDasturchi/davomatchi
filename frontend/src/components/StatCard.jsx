import React from 'react';

export default function StatCard({ icon, label, value, subtitle, color = 'var(--accent-blue)', onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.15s',
      }}
      onTouchStart={e => onClick && (e.currentTarget.style.transform = 'scale(0.97)')}
      onTouchEnd={e   => onClick && (e.currentTarget.style.transform = 'scale(1)')}
    >
      {/* Yuqori rangli chiziq */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: color,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>
            {label}
          </p>
          <p style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
            {value ?? '—'}
          </p>
          {subtitle && (
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
              {subtitle}
            </p>
          )}
        </div>
        <span style={{
          fontSize: '26px',
          background: `${color}20`,
          padding: '8px',
          borderRadius: 'var(--radius-md)',
        }}>
          {icon}
        </span>
      </div>
    </div>
  );
}
