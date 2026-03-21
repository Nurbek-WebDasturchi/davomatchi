import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { exportToExcel } from '../utils/export';
import NavBar from '../components/NavBar';
import StatCard from '../components/StatCard';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toLocaleDateString('uz-UZ', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const fetchData = async (quiet = false) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      if (user.role === 'admin') {
        const res = await api.get('/attendance/today');
        setData(res.data);
      } else {
        const res = await api.get(`/attendance/group/${user.group_id}`);
        setData(res.data);
      }
    } catch (err) {
      console.error('Dashboard xatosi:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Har 30 soniyada yangilash
    const timer = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.get('/attendance/export');
      exportToExcel(res.data.data, 'davomat');
    } catch {
      alert('Export xatosi yuz berdi');
    }
  };

  // ─── Yuklash ───────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--border)',
          borderTop: '3px solid var(--accent-blue)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '80px' }}>

      {/* Header */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 20px',
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 900 }}>
            {user.role === 'admin' ? '👨‍💼 Admin Panel' : '👨‍🏫 O\'qituvchi'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '1px' }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {refreshing && (
            <div style={{
              width: 14, height: 14,
              border: '2px solid var(--border)',
              borderTop: '2px solid var(--accent-blue)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
          )}
          {user.role === 'admin' && (
            <button onClick={handleExport} style={{
              background: 'rgba(34,197,94,0.12)',
              color: 'var(--accent-green)',
              border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px', fontWeight: 700,
            }}>
              📥 Excel
            </button>
          )}
          <button onClick={logout} style={{
            background: 'rgba(239,68,68,0.1)',
            color: 'var(--accent-red)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px',
            padding: '6px 10px',
            fontSize: '11px',
          }}>
            Chiqish
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {/* Xush kelibsiz kartasi */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.1))',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 'var(--radius-xl)',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--accent-blue-light)', fontWeight: 700, marginBottom: '2px' }}>
            Xush kelibsiz 👋
          </p>
          <p style={{ fontSize: '18px', fontWeight: 900 }}>{user.full_name}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
            {user.role === 'admin' ? 'Administrator' : "O'qituvchi"}
          </p>
        </div>

        {user.role === 'admin'
          ? <AdminView   data={data} navigate={navigate} />
          : <TeacherView data={data} navigate={navigate} user={user} />
        }
      </div>

      <NavBar />
    </div>
  );
}

// ─── Admin ko'rinishi ─────────────────────────────────────
function AdminView({ data, navigate }) {
  if (!data) return null;
  const { totals, byCourse } = data;
  const pct = totals?.total_students > 0
    ? Math.round(totals.present_today / totals.total_students * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Umumiy raqamlar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <StatCard icon="👨‍🎓" label="JAMI TALABALAR"  value={totals?.total_students} color="var(--accent-blue)" />
        <StatCard icon="✅"    label="BUGUN KELDI"    value={totals?.present_today}  color="var(--accent-green)" />
      </div>

      {/* Progress */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            Bugungi davomat
          </span>
          <span style={{
            fontSize: '18px', fontWeight: 900,
            color: pct >= 80 ? 'var(--accent-green)' : pct >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)',
          }}>{pct}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: pct >= 80 ? 'var(--accent-green)' : pct >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)',
            borderRadius: '99px', transition: 'width 0.8s ease',
          }} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px' }}>
          {totals?.present_today} / {totals?.total_students} talaba
        </p>
      </div>

      {/* Kurslar bo'yicha */}
      <h2 style={{ fontSize: '15px', fontWeight: 800 }}>Kurslar bo'yicha</h2>
      {byCourse?.map(course => {
        const p = course.total_students > 0
          ? Math.round(course.present_count / course.total_students * 100)
          : 0;
        const color = p >= 80 ? 'var(--accent-green)' : p >= 60 ? 'var(--accent-amber)' : 'var(--accent-red)';

        return (
          <div
            key={course.course_id}
            onClick={() => navigate(`/group/${course.course_id}?type=course`)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '14px', cursor: 'pointer',
            }}
            onTouchStart={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
            onTouchEnd={e   => e.currentTarget.style.background = 'var(--bg-card)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <p style={{ fontWeight: 800, fontSize: '14px' }}>{course.course_name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                  {course.present_count} / {course.total_students} talaba
                </p>
              </div>
              <span style={{
                fontSize: '18px', fontWeight: 900, color,
                background: `${color}15`,
                padding: '4px 10px', borderRadius: '8px',
              }}>{p}%</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${p}%`,
                background: color, borderRadius: '99px',
              }} />
            </div>
            <p style={{ color: 'var(--accent-blue-light)', fontSize: '11px', marginTop: '8px', fontWeight: 700 }}>
              Guruhlarni ko'rish →
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ─── O'qituvchi ko'rinishi ────────────────────────────────
function TeacherView({ data, navigate, user }) {
  if (!data) return null;
  const { group, totalStudents, presentCount, students } = data;
  const pct = totalStudents > 0 ? Math.round(presentCount / totalStudents * 100) : 0;
  const presentStudents = students?.filter(s => s.is_present) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Guruh kartasi */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(59,130,246,0.05))',
        border: '1px solid rgba(59,130,246,0.25)',
        borderRadius: 'var(--radius-xl)', padding: '16px',
      }}>
        <p style={{ fontSize: '11px', color: 'var(--accent-blue-light)', fontWeight: 700, marginBottom: '2px' }}>
          Guruhingiz
        </p>
        <p style={{ fontSize: '22px', fontWeight: 900 }}>{group?.name}</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>{group?.course_name}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <StatCard icon="👨‍🎓" label="JAMI" value={totalStudents} color="var(--accent-blue)" />
        <StatCard icon="✅"    label="KELDI" value={presentCount} color="var(--accent-green)" />
      </div>

      {/* Progress */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '14px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>Davomat</span>
          <span style={{ fontSize: '18px', fontWeight: 900, color: pct >= 70 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
            {pct}%
          </span>
        </div>
        <div style={{ height: '8px', background: 'var(--bg-input)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: 'var(--accent-green)', borderRadius: '99px', transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {/* Tezkor tugmalar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button onClick={() => navigate(`/group/${user.group_id}`)} style={{
          background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)',
          borderRadius: 'var(--radius-md)', padding: '12px',
          color: 'var(--accent-blue-light)', fontWeight: 700, fontSize: '12px',
        }}>📋 Ro'yxat</button>
        <button onClick={() => navigate(`/qr/${user.group_id}`)} style={{
          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
          borderRadius: 'var(--radius-md)', padding: '12px',
          color: 'var(--accent-purple)', fontWeight: 700, fontSize: '12px',
        }}>🔲 QR Kod</button>
      </div>

      {/* Kelgan talabalar */}
      <h2 style={{ fontSize: '14px', fontWeight: 800 }}>
        Kelgan talabalar ({presentCount})
      </h2>

      {presentStudents.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '28px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)',
        }}>
          <p style={{ fontSize: '28px', marginBottom: '8px' }}>📭</p>
          <p style={{ fontSize: '13px' }}>Hali hech kim kelmagan</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {presentStudents.map((s, i) => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(34,197,94,0.2)',
              borderRadius: 'var(--radius-md)', padding: '10px 12px',
              animation: 'fadeIn 0.3s ease forwards',
              animationDelay: `${i * 0.04}s`,
              opacity: 0,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '13px', color: 'var(--accent-green)',
                flexShrink: 0,
              }}>
                {s.full_name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.full_name}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{s.student_code}</p>
              </div>
              <div style={{ color: 'var(--accent-green)', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                ✅ {s.scanned_at
                  ? new Date(s.scanned_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                  : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
