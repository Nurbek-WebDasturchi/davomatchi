import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { exportToExcel } from "../utils/export";
import NavBar from "../components/NavBar";
import StatCard from "../components/StatCard";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toLocaleDateString("uz-UZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    api
      .get("/attendance/today")
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    const timer = setInterval(() => {
      api
        .get("/attendance/today")
        .then((res) => setData(res.data))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleExport = async () => {
    try {
      const res = await api.get("/attendance/export");
      exportToExcel(res.data.data, "davomat");
    } catch {
      alert("Export xatosi");
    }
  };

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
        }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid var(--border)",
            borderTop: "3px solid var(--accent-blue)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );

  const { totals, byCourse } = data || {};
  const pct =
    totals?.total_students > 0
      ? Math.round((totals.present_today / totals.total_students) * 100)
      : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        paddingBottom: "0",
      }}>
      <div
        style={{
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 900 }}>
            {user?.role === "director"
              ? "👨‍💼 Direktor"
              : "👨‍💼 Direktor o'rinbosari"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {today}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleExport}
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "var(--accent-green)",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "11px",
              fontWeight: 700,
            }}>
            📥 Excel
          </button>
          <button
            onClick={logout}
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "var(--accent-red)",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "11px",
            }}>
            Chiqish
          </button>
        </div>
      </div>

      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}>
        {/* Xush kelibsiz */}
        <div
          style={{
            background:
              "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(168,85,247,0.1))",
            border: "1px solid rgba(59,130,246,0.2)",
            borderRadius: "var(--radius-xl)",
            padding: "14px",
          }}>
          <p
            style={{
              fontSize: "11px",
              color: "var(--accent-blue-light)",
              fontWeight: 700,
              marginBottom: "2px",
            }}>
            Xush kelibsiz 👋
          </p>
          <p style={{ fontSize: "18px", fontWeight: 900 }}>
            {user?.firstName} {user?.lastName}
          </p>
        </div>

        {/* Statistika */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
          }}>
          <StatCard
            icon="👨‍🎓"
            label="JAMI TALABALAR"
            value={totals?.total_students}
            color="var(--accent-blue)"
          />
          <StatCard
            icon="✅"
            label="BUGUN KELDI"
            value={totals?.present_today}
            color="var(--accent-green)"
          />
        </div>

        {/* Progress */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "14px",
          }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}>
              Bugungi davomat
            </span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 900,
                color:
                  pct >= 80
                    ? "var(--accent-green)"
                    : pct >= 60
                      ? "var(--accent-amber)"
                      : "var(--accent-red)",
              }}>
              {pct}%
            </span>
          </div>
          <div
            style={{
              height: "8px",
              background: "var(--bg-input)",
              borderRadius: "99px",
              overflow: "hidden",
            }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background:
                  pct >= 80
                    ? "var(--accent-green)"
                    : pct >= 60
                      ? "var(--accent-amber)"
                      : "var(--accent-red)",
                borderRadius: "99px",
                transition: "width 0.8s ease",
              }}
            />
          </div>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "11px",
              marginTop: "6px",
            }}>
            {totals?.present_today} / {totals?.total_students} talaba
          </p>
        </div>

        {/* Kurslar */}
        <h2 style={{ fontSize: "14px", fontWeight: 800 }}>Kurslar bo'yicha</h2>
        {byCourse?.map((course) => {
          const p =
            course.total_students > 0
              ? Math.round((course.present_count / course.total_students) * 100)
              : 0;
          const color =
            p >= 80
              ? "var(--accent-green)"
              : p >= 60
                ? "var(--accent-amber)"
                : "var(--accent-red)";
          return (
            <div
              key={course.course_id}
              onClick={() => navigate(`/group/${course.course_id}?type=course`)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "14px",
                cursor: "pointer",
              }}
              onTouchStart={(e) =>
                (e.currentTarget.style.background = "var(--bg-card-hover)")
              }
              onTouchEnd={(e) =>
                (e.currentTarget.style.background = "var(--bg-card)")
              }>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: "14px" }}>
                    {course.course_name}
                  </p>
                  <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                    {course.present_count} / {course.total_students} talaba
                  </p>
                </div>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 900,
                    color,
                    background: `${color}15`,
                    padding: "4px 10px",
                    borderRadius: "8px",
                  }}>
                  {p}%
                </span>
              </div>
              <div
                style={{
                  height: "5px",
                  background: "var(--bg-input)",
                  borderRadius: "99px",
                  overflow: "hidden",
                }}>
                <div
                  style={{
                    height: "100%",
                    width: `${p}%`,
                    background: color,
                    borderRadius: "99px",
                  }}
                />
              </div>
              <p
                style={{
                  color: "var(--accent-blue-light)",
                  fontSize: "11px",
                  marginTop: "8px",
                  fontWeight: 700,
                }}>
                Guruhlarni ko'rish →
              </p>
            </div>
          );
        })}
      </div>
      <NavBar />
    </div>
  );
}
