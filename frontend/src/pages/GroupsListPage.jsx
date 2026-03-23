import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import NavBar from '../components/NavBar';

export default function GroupsListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups,  setGroups]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance/all-groups')
      .then(res => setGroups(res.data.groups || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTop: '3px solid var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '80px' }}>
      <div style={{
        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <button onClick={() => navigate(-1)} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '8px', padding: '7px 10px', color: 'var(--text-primary)', fontSize: '16px',
        }}>←</button>
        <div>
          <h1 style={{ fontSize: '17px', fontWeight: 800 }}>Barcha guruhlar</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{groups.length} ta guruh</p>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {groups.map(g => {
          const pct = g.total_students > 0
            ? Math.round(g.present_count / g.total_students * 100) : 0;
          const color = pct >= 80 ? 'var(--accent-green)'
                      : pct >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)';
          return (
            <div key={g.id}
              onClick={() => navigate(`/group/${g.id}`)}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '14px', cursor: 'pointer',
              }}
              onTouchStart={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
              onTouchEnd={e   => e.currentTarget.style.background = 'var(--bg-card)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '15px' }}>{g.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{g.course_name}</p>
                </div>
                <span style={{
                  fontSize: '14px', fontWeight: 900, color,
                  background: `${color}15`, padding: '4px 10px', borderRadius: '8px',
                }}>{pct}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {g.present_count} / {g.total_students} talaba
                </span>
              </div>
              <div style={{ height: '5px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px' }} />
              </div>
            </div>
          );
        })}
      </div>
      <NavBar />
    </div>
  );
}
