import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import NavBar from "../components/NavBar";

export default function GroupDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isCourse = searchParams.get("type") === "course";
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchData();
  }, [id, date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isCourse) {
        const res = await api.get(`/attendance/course/${id}/groups`);
        setGroups(res.data.groups);
      } else {
        const res = await api.get(`/attendance/group/${id}?date=${date}`);
        console.log("API response:", res.data);
        setData(res.data);
      }
    } catch (err) {
      console.error("GroupDetail xatosi:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Talaba ismini xavfsiz olish
  const getFullName = (s) =>
    s?.full_name || s?.name || s?.student_name || "Noma'lum";

  const filtered = data?.students?.filter((s) => {
    if (filter === "present") return s.is_present;
    if (filter === "absent") return !s.is_present;
    return true;
  });

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
            width: 36,
            height: 36,
            border: "3px solid var(--border)",
            borderTop: "3px solid var(--accent-blue)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        paddingBottom: "80px",
      }}>
      {/* Header */}
      <div
        style={{
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border)",
          padding: "14px 20px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px 10px",
            color: "var(--text-primary)",
            fontSize: "16px",
          }}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontSize: "17px",
              fontWeight: 800,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
            {isCourse ? "Guruhlar" : data?.group?.name || "Guruh"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {isCourse
              ? `${groups?.length || 0} guruh`
              : data?.group?.course_name}
          </p>
        </div>
        {!isCourse && user.role === "admin" && (
          <button
            onClick={() => navigate(`/qr/${id}`)}
            style={{
              background: "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              borderRadius: "8px",
              padding: "7px 12px",
              color: "var(--accent-purple)",
              fontSize: "11px",
              fontWeight: 700,
            }}>
            🔲 QR
          </button>
        )}
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* ─── Kurs ko'rinishi ─── */}
        {isCourse ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {groups?.map((g) => {
              const p =
                g.total_students > 0
                  ? Math.round((g.present_count / g.total_students) * 100)
                  : 0;
              const color =
                p >= 80
                  ? "var(--accent-green)"
                  : p >= 60
                    ? "var(--accent-amber)"
                    : "var(--accent-red)";
              return (
                <div
                  key={g.id}
                  onClick={() => navigate(`/group/${g.id}`)}
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
                      alignItems: "flex-start",
                      marginBottom: "10px",
                    }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: "15px" }}>
                        {g.name}
                      </p>
                      <p
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "11px",
                          marginTop: "2px",
                        }}>
                        👨‍🏫 {g.teacher_name || "Belgilanmagan"}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 900,
                        color,
                        background: `${color}15`,
                        padding: "3px 10px",
                        borderRadius: "8px",
                      }}>
                      {p}%
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                    }}>
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "11px",
                      }}>
                      {g.present_count} / {g.total_students} talaba
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
                </div>
              );
            })}
          </div>
        ) : (
          /* ─── Guruh ko'rinishi ─── */
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Sana tanlash */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "16px" }}>📅</span>
              <input
                type="date"
                value={date}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  flex: 1,
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "8px 12px",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                }}
              />
            </div>

            {/* Statistika */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "8px",
              }}>
              {[
                {
                  label: "Jami",
                  val: data?.totalStudents,
                  color: "var(--accent-blue)",
                },
                {
                  label: "Keldi",
                  val: data?.presentCount,
                  color: "var(--accent-green)",
                },
                {
                  label: "Kelmadi",
                  val: (data?.totalStudents || 0) - (data?.presentCount || 0),
                  color: "var(--accent-red)",
                },
              ].map(({ label, val, color }) => (
                <div
                  key={label}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px",
                    textAlign: "center",
                  }}>
                  <p style={{ fontSize: "20px", fontWeight: 900, color }}>
                    {val}
                  </p>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "10px",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "4px",
              }}>
              {[
                { key: "all", label: "Barchasi" },
                { key: "present", label: "✅ Keldi" },
                { key: "absent", label: "❌ Kelmadi" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    flex: 1,
                    padding: "7px 4px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 700,
                    background:
                      filter === key ? "var(--accent-blue)" : "transparent",
                    color: filter === key ? "#fff" : "var(--text-secondary)",
                    transition: "all 0.2s",
                  }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Talabalar ro'yxati */}
            {filtered?.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px",
                  color: "var(--text-muted)",
                }}>
                <p style={{ fontSize: "32px", marginBottom: "8px" }}>📭</p>
                <p>Talaba topilmadi</p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "7px",
                }}>
                {filtered?.map((s, i) => {
                  const fullName = getFullName(s);
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "var(--bg-card)",
                        border: `1px solid ${s.is_present ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
                        borderRadius: "var(--radius-md)",
                        padding: "10px 12px",
                        animation: "fadeIn 0.25s ease forwards",
                        animationDelay: `${i * 0.035}s`,
                        opacity: 0,
                      }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          background: s.is_present
                            ? "rgba(34,197,94,0.12)"
                            : "rgba(100,116,139,0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "13px",
                          color: s.is_present
                            ? "var(--accent-green)"
                            : "var(--text-muted)",
                          flexShrink: 0,
                        }}>
                        {fullName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontWeight: 700,
                            fontSize: "13px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}>
                          {fullName}
                        </p>
                        <p
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "10px",
                          }}>
                          {s.student_code || "Kod yo'q"}
                        </p>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {s.is_present ? (
                          <>
                            <p
                              style={{
                                color: "var(--accent-green)",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}>
                              ✅ Keldi
                            </p>
                            {s.scanned_at && (
                              <p
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: "10px",
                                }}>
                                {new Date(s.scanned_at).toLocaleTimeString(
                                  "uz-UZ",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </p>
                            )}
                          </>
                        ) : (
                          <p
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "10px",
                              fontWeight: 700,
                            }}>
                            ❌ Kelmadi
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <NavBar />
    </div>
  );
}
