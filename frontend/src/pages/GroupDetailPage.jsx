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
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showQr, setShowQr] = useState(false);

  const canSeeQr = ["director", "deputy", "master", "curator"].includes(
    user?.role,
  );

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
        setData(res.data);
      }
    } catch (err) {
      console.error("GroupDetail xatosi:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQr = async () => {
    if (qr) {
      setShowQr(!showQr);
      return;
    }
    setQrLoading(true);
    try {
      const res = await api.get(`/groups/${id}/qr`);
      setQr(res.data);
      setShowQr(true);
    } catch (err) {
      console.error("QR xatosi:", err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const getFullName = (s) => s?.full_name || s?.name || "Noma'lum";

  // O'zbekiston vaqti (UTC+5)
  const getUzTime = () => new Date(Date.now() + 5 * 60 * 60 * 1000);

  const getAttendanceStatus = () => {
    const t = getUzTime();
    const total = t.getUTCHours() * 60 + t.getUTCMinutes();
    const start = 8 * 60 + 30;
    const end = 13 * 60 + 20;
    if (total < start) return "before";
    if (total <= end) return "open";
    return "closed";
  };

  const attendanceStatus = getAttendanceStatus();
  const isToday = date === new Date().toISOString().split("T")[0];

  // Talaba statusini aniqlash
  const getStudentStatus = (s) => {
    if (s.is_present) return "present"; // ✅
    if (!isToday) return "absent"; // ❌ o'tgan kun
    if (attendanceStatus === "open" || attendanceStatus === "before")
      return "waiting"; // 🟡
    return "absent"; // ❌ vaqt o'tdi
  };

  const filtered = data?.students?.filter((s) => {
    const st = getStudentStatus(s);
    if (filter === "present") return st === "present";
    if (filter === "absent") return st === "absent" || st === "waiting";
    return true;
  });

  const presentCount =
    data?.students?.filter((s) => getStudentStatus(s) === "present").length ||
    0;
  const waitingCount =
    data?.students?.filter((s) => getStudentStatus(s) === "waiting").length ||
    0;
  const absentCount =
    data?.students?.filter((s) => getStudentStatus(s) === "absent").length || 0;

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
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)" }}>
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

        {!isCourse && canSeeQr && (
          <button
            onClick={loadQr}
            disabled={qrLoading}
            style={{
              background: showQr
                ? "rgba(168,85,247,0.2)"
                : "rgba(168,85,247,0.12)",
              border: "1px solid rgba(168,85,247,0.3)",
              borderRadius: "8px",
              padding: "7px 12px",
              color: "#a855f7",
              fontSize: "11px",
              fontWeight: 700,
              opacity: qrLoading ? 0.6 : 1,
            }}>
            {qrLoading ? "..." : "🔲 QR"}
          </button>
        )}
      </div>

      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}>
        {/* ── Kurs ko'rinishi ── */}
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
                  }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "10px",
                    }}>
                    <p style={{ fontWeight: 800, fontSize: "15px" }}>
                      {g.name}
                    </p>
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
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "11px",
                      marginBottom: "8px",
                    }}>
                    {g.present_count} / {g.total_students} talaba
                  </p>
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
          /* ── Guruh ko'rinishi ── */
          <>
            {/* QR bloki */}
            {showQr && qr && (
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid rgba(168,85,247,0.3)",
                  borderRadius: "var(--radius-xl)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                  animation: "slideUp 0.3s ease forwards",
                }}>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 800,
                    color: "#a855f7",
                  }}>
                  🔲 {qr.groupName} — QR Kod
                </p>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "12px",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                  }}>
                  <img
                    src={qr.qrCode}
                    alt="QR"
                    style={{
                      width: "180px",
                      height: "180px",
                      display: "block",
                    }}
                  />
                </div>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "11px",
                    textAlign: "center",
                  }}>
                  Talabalar bu kodni Telegram bot orqali skanerlaydi
                </p>
                <button
                  onClick={() => setShowQr(false)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "red",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    color: "white",
                    fontSize: "12px",
                  }}>
                  Yopish
                </button>
              </div>
            )}

            {/* Sana */}
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

            {/* Davomat vaqti ko'rsatkichi */}
            {isToday && (
              <div
                style={{
                  background:
                    attendanceStatus === "open"
                      ? "rgba(34,197,94,0.08)"
                      : attendanceStatus === "before"
                        ? "rgba(245,158,11,0.08)"
                        : "rgba(100,116,139,0.08)",
                  border: `1px solid ${
                    attendanceStatus === "open"
                      ? "rgba(34,197,94,0.25)"
                      : attendanceStatus === "before"
                        ? "rgba(245,158,11,0.25)"
                        : "rgba(100,116,139,0.2)"
                  }`,
                  borderRadius: "var(--radius-md)",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                <span style={{ fontSize: "16px" }}>
                  {attendanceStatus === "open"
                    ? "🟢"
                    : attendanceStatus === "before"
                      ? "🟡"
                      : "🔴"}
                </span>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    color:
                      attendanceStatus === "open"
                        ? "var(--accent-green)"
                        : attendanceStatus === "before"
                          ? "var(--accent-amber)"
                          : "var(--text-muted)",
                  }}>
                  {attendanceStatus === "open"
                    ? "Davomat ochiq: 08:30 – 13:20"
                    : attendanceStatus === "before"
                      ? "Davomat 08:30 da boshlanadi"
                      : "Davomat yopildi (13:20 dan keyin)"}
                </p>
              </div>
            )}

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
                  val: presentCount,
                  color: "var(--accent-green)",
                },
                isToday && attendanceStatus !== "closed"
                  ? {
                      label: "Kutilmoqda",
                      val: waitingCount,
                      color: "var(--accent-amber)",
                    }
                  : {
                      label: "Kelmadi",
                      val: absentCount,
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
                    {val ?? "—"}
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
                {
                  key: "all",
                  label: `Barchasi (${data?.students?.length || 0})`,
                },
                { key: "present", label: `✅ Keldi (${presentCount})` },
                {
                  key: "absent",
                  label:
                    isToday && attendanceStatus !== "closed"
                      ? `🟡/❌ Qolgan (${waitingCount + absentCount})`
                      : `❌ Kelmadi (${absentCount})`,
                },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{
                    flex: 1,
                    padding: "7px 4px",
                    borderRadius: "8px",
                    fontSize: "10px",
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
                  gap: "6px",
                }}>
                {filtered?.map((s, i) => {
                  const fullName = getFullName(s);
                  const st = getStudentStatus(s);

                  const bgColor =
                    st === "present"
                      ? "rgba(34,197,94,0.08)"
                      : st === "waiting"
                        ? "rgba(245,158,11,0.07)"
                        : "rgba(239,68,68,0.06)";
                  const borderColor =
                    st === "present"
                      ? "rgba(34,197,94,0.25)"
                      : st === "waiting"
                        ? "rgba(245,158,11,0.25)"
                        : "rgba(239,68,68,0.2)";
                  const numColor =
                    st === "present"
                      ? "var(--accent-green)"
                      : st === "waiting"
                        ? "var(--accent-amber)"
                        : "var(--accent-red)";
                  const numBg =
                    st === "present"
                      ? "rgba(34,197,94,0.15)"
                      : st === "waiting"
                        ? "rgba(245,158,11,0.15)"
                        : "rgba(239,68,68,0.12)";

                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: bgColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: "var(--radius-md)",
                        padding: "10px 12px",
                        animation: "fadeIn 0.25s ease forwards",
                        animationDelay: `${i * 0.03}s`,
                        opacity: 0,
                      }}>
                      {/* Raqam */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: numBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: "13px",
                          color: numColor,
                          flexShrink: 0,
                        }}>
                        {i + 1}
                      </div>

                      {/* Ism */}
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
                          {s.student_code || s.id || "—"}
                        </p>
                      </div>

                      {/* Status badge */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {st === "present" ? (
                          <>
                            <div
                              style={{
                                background: "rgba(34,197,94,0.15)",
                                border: "1px solid rgba(34,197,94,0.3)",
                                borderRadius: "99px",
                                padding: "3px 10px",
                                display: "inline-block",
                              }}>
                              <p
                                style={{
                                  color: "var(--accent-green)",
                                  fontSize: "11px",
                                  fontWeight: 800,
                                }}>
                                ✅ Keldi
                              </p>
                            </div>
                            {s.scanned_at && (
                              <p
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: "10px",
                                  marginTop: "3px",
                                }}>
                                {new Date(s.scanned_at).toLocaleTimeString(
                                  "uz-UZ",
                                  { hour: "2-digit", minute: "2-digit" },
                                )}
                              </p>
                            )}
                          </>
                        ) : st === "waiting" ? (
                          <div
                            style={{
                              background: "rgba(245,158,11,0.12)",
                              border: "1px solid rgba(245,158,11,0.3)",
                              borderRadius: "99px",
                              padding: "3px 10px",
                              display: "inline-block",
                            }}>
                            <p
                              style={{
                                color: "var(--accent-amber)",
                                fontSize: "11px",
                                fontWeight: 800,
                              }}>
                              🟡 Kelishi mumkin
                            </p>
                          </div>
                        ) : (
                          <div
                            style={{
                              background: "rgba(239,68,68,0.12)",
                              border: "1px solid rgba(239,68,68,0.25)",
                              borderRadius: "99px",
                              padding: "3px 10px",
                              display: "inline-block",
                            }}>
                            <p
                              style={{
                                color: "var(--accent-red)",
                                fontSize: "11px",
                                fontWeight: 800,
                              }}>
                              ❌ Kelmadi
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <NavBar />
    </div>
  );
}
