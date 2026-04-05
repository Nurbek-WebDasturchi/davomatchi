import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { exportToExcel } from "../utils/export";
import NavBar from "../components/NavBar";

export default function MarkAttendancePage() {
  const { user, logout } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const handleMark = async (e) => {
    e.preventDefault();
    if (!studentId.trim()) {
      setError("Talaba ID sini kiriting");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/attendance/manual", {
        studentId: studentId.trim().toUpperCase(),
      });
      setResult(res.data);
      setStudentId("");
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get("/attendance/export");
      exportToExcel(res.data.data, "davomat");
    } catch (err) {
      alert("Export xatosi");
    } finally {
      setExporting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError("");
    setStudentId("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        paddingBottom: "0",
      }}>
      {/* Header */}
      <div
        style={{
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 900 }}>
            📋 Davomat Belgilash
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "var(--accent-green)",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "11px",
              fontWeight: 700,
              opacity: exporting ? 0.6 : 1,
            }}>
            {exporting ? "..." : "📥 Excel"}
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

      <div style={{ padding: "20px" }}>
        {/* Natija */}
        {result && (
          <div
            style={{
              background: result.alreadyMarked
                ? "rgba(245,158,11,0.08)"
                : "rgba(34,197,94,0.08)",
              border: `1px solid ${
                result.alreadyMarked
                  ? "rgba(245,158,11,0.3)"
                  : "rgba(34,197,94,0.3)"
              }`,
              borderRadius: "var(--radius-xl)",
              padding: "20px",
              textAlign: "center",
              marginBottom: "16px",
              animation: "slideUp 0.3s ease forwards",
            }}>
            <p style={{ fontSize: "40px", marginBottom: "10px" }}>
              {result.alreadyMarked ? "⚠️" : "✅"}
            </p>
            <h2
              style={{
                fontSize: "17px",
                fontWeight: 900,
                marginBottom: "6px",
              }}>
              {result.alreadyMarked
                ? "Allaqachon belgilangan!"
                : "Davomat belgilandi!"}
            </h2>
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "var(--radius-md)",
                padding: "12px",
                marginTop: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                textAlign: "left",
              }}>
              {[
                { label: "👤 Talaba", val: result.student?.name },
                { label: "🎫 ID", val: result.student?.id },
                { label: "📚 Guruh", val: result.student?.groupName },
                {
                  label: "🕐 Vaqt",
                  val: result.student?.scannedAt
                    ? new Date(result.student.scannedAt).toLocaleTimeString(
                        "uz-UZ",
                      )
                    : "—",
                },
              ].map(({ label, val }) => (
                <div
                  key={label}
                  style={{ display: "flex", justifyContent: "space-between" }}>
                  <span
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                    }}>
                    {label}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: "12px" }}>
                    {val || "—"}
                  </span>
                </div>
              ))}
            </div>
            <button
              onClick={reset}
              style={{
                marginTop: "14px",
                width: "100%",
                padding: "11px",
                background: "var(--accent-blue)",
                color: "#fff",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                fontWeight: 800,
              }}>
              ➕ Yangi talaba
            </button>
          </div>
        )}

        {/* Form */}
        {!result && (
          <form
            onSubmit={handleMark}
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div
              style={{
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.15)",
                borderRadius: "var(--radius-lg)",
                padding: "14px",
              }}>
              <p
                style={{
                  color: "var(--accent-blue-light)",
                  fontSize: "12px",
                  fontWeight: 800,
                  marginBottom: "6px",
                }}>
                📋 Qo'lda davomat belgilash
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                Talaba ID sini kiriting — tizim avtomatik topadi va belgilaydi
              </p>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}>
                TALABA ID
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                placeholder="ST0001"
                maxLength={10}
                autoFocus
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "var(--bg-secondary)",
                  border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "20px",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.15em",
                  textAlign: "center",
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 14px",
                  color: "var(--accent-red)",
                  fontSize: "13px",
                  textAlign: "center",
                }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !studentId.trim()}
              style={{
                width: "100%",
                padding: "14px",
                background:
                  loading || !studentId.trim()
                    ? "var(--bg-secondary)"
                    : "var(--accent-green)",
                color:
                  loading || !studentId.trim() ? "var(--text-muted)" : "#fff",
                borderRadius: "var(--radius-md)",
                fontSize: "15px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}>
              {loading ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid var(--border)",
                      borderTop: "2px solid var(--accent-blue)",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  Tekshirilmoqda...
                </>
              ) : (
                "✅ Davomatni belgilash"
              )}
            </button>
          </form>
        )}

        {/* Bugungi statistika */}
        <TodayStats />
      </div>
      <NavBar />
    </div>
  );
}

function TodayStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get("/attendance/analytics?period=week")
      .then((res) => {
        const today = res.data.analytics?.slice(-1)[0];
        setStats(today);
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <div
      style={{
        marginTop: "20px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "14px",
      }}>
      <p
        style={{
          fontSize: "12px",
          fontWeight: 800,
          color: "var(--text-secondary)",
          marginBottom: "12px",
        }}>
        📊 Bugungi holat
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
        }}>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "24px",
              fontWeight: 900,
              color: "var(--accent-green)",
            }}>
            {stats.present_count}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>Keldi</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "24px",
              fontWeight: 900,
              color: "var(--accent-blue)",
            }}>
            {stats.total_students}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>Jami</p>
        </div>
      </div>
    </div>
  );
}
