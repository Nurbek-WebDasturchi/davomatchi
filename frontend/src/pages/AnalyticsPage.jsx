import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import NavBar from "../components/NavBar";

// Foizga qarab rang qaytaradi: >=70 yashil, 50-70 sariq, <50 qizil
const getBarColor = (foiz) => {
  if (foiz >= 70) return "#22c55e";
  if (foiz >= 50) return "#eab308";
  return "#ef4444";
};

export default function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("week");
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Deputy ko'ra olmasin — sahifaga kirgan bo'lsa qaytarib yuboramiz
  if (user?.role === "deputy") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-primary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          gap: "16px",
        }}>
        <p style={{ fontSize: "48px" }}>🚫</p>
        <h2 style={{ fontSize: "18px", fontWeight: 900 }}>Ruxsat yo'q</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
          Bu sahifani ko'rish huquqingiz mavjud emas.
        </p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "11px 24px",
            background: "var(--accent-blue)",
            color: "#fff",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 700,
          }}>
          ← Bosh sahifaga qaytish
        </button>
        <NavBar />
      </div>
    );
  }

  useEffect(() => {
    setLoading(true);
    api
      .get(`/attendance/analytics?period=${period}`)
      .then((res) => setAnalytics(res.data.analytics || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [period]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const days = period === "month" ? 30 : 7;
      const end = new Date().toISOString().split("T")[0];
      const start = new Date(Date.now() - days * 86400000)
        .toISOString()
        .split("T")[0];

      // Token olish (api instance dan)
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token") || "";

      // Backenddan to'g'ridan-to'g'ri Excel fayl yuklab olamiz
      // Bu usul Android, iOS va Telegram WebApp da ham ishlaydi
      const response = await fetch(
        `${api.defaults.baseURL}/attendance/export?startDate=${start}&endDate=${end}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Export xatosi");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = `davomat_${period}_${end}.xlsx`;

      // iOS / Telegram uchun alohida yechim
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isTelegram = !!window.Telegram?.WebApp?.initData;

      if (isIOS || isTelegram) {
        // iOS va Telegram da <a download> ishlamaydi — yangi tabda ochamiz
        window.open(url, "_blank");
      } else {
        // Android va Desktop
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      alert("Export xatosi. Qayta urinib ko'ring.");
    } finally {
      setExporting(false);
    }
  };

  // Grafik uchun ma'lumot
  const chartData = analytics.map((row) => ({
    date: new Date(row.date).toLocaleDateString("uz-UZ", {
      day: "numeric",
      month: "short",
    }),
    keldi: Number(row.present_count),
    jami: Number(row.total_students),
    foiz:
      row.total_students > 0
        ? Math.round((row.present_count / row.total_students) * 100)
        : 0,
  }));

  const avg = chartData.length
    ? Math.round(chartData.reduce((s, r) => s + r.foiz, 0) / chartData.length)
    : 0;
  const maxDay = chartData.reduce(
    (m, r) => (r.keldi > (m?.keldi || 0) ? r : m),
    null,
  );
  const minDay = chartData.reduce(
    (m, r) => (r.keldi < (m?.keldi ?? Infinity) ? r : m),
    null,
  );

  const tooltipStyle = {
    contentStyle: {
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      fontSize: "12px",
      color: "var(--text-primary)",
    },
    labelStyle: { fontWeight: 700 },
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
          alignItems: "center",
          justifyContent: "space-between",
        }}>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 900 }}>📊 Tahlil</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            Davomat statistikasi
          </p>
        </div>
        {user.role === "director" && (
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "var(--accent-green)",
              borderRadius: "8px",
              padding: "7px 12px",
              fontSize: "11px",
              fontWeight: 700,
              opacity: exporting ? 0.6 : 1,
            }}>
            {exporting ? "..." : "📥 Excel"}
          </button>
        )}
      </div>

      <div style={{ padding: "16px 20px" }}>
        {/* Davr tanlash */}
        <div
          style={{
            display: "flex",
            background: "var(--bg-card)",
            borderRadius: "var(--radius-md)",
            padding: "4px",
            border: "1px solid var(--border)",
            marginBottom: "16px",
          }}>
          {[
            { key: "week", label: "7 kun" },
            { key: "month", label: "30 kun" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              style={{
                flex: 1,
                padding: "9px",
                background:
                  period === key ? "var(--accent-blue)" : "transparent",
                color: period === key ? "#fff" : "var(--text-secondary)",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                transition: "all 0.2s",
              }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "60px",
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
        ) : chartData.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px",
              color: "var(--text-muted)",
            }}>
            <p style={{ fontSize: "40px", marginBottom: "12px" }}>📊</p>
            <p>Ma'lumot topilmadi</p>
          </div>
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Umumiy ko'rsatkichlar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "8px",
              }}>
              {[
                {
                  label: "O'rtacha",
                  value: `${avg}%`,
                  color: getBarColor(avg),
                },
                {
                  label: "Eng ko'p",
                  value: maxDay?.date || "—",
                  color: "var(--accent-green)",
                  sub: `${maxDay?.keldi || 0} kishi`,
                },
                {
                  label: "Eng kam",
                  value: minDay?.date || "—",
                  color: "var(--accent-red)",
                  sub: `${minDay?.keldi || 0} kishi`,
                },
              ].map(({ label, value, color, sub }) => (
                <div
                  key={label}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: "10px",
                    textAlign: "center",
                  }}>
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "9px",
                      fontWeight: 700,
                      marginBottom: "4px",
                    }}>
                    {label.toUpperCase()}
                  </p>
                  <p style={{ fontSize: "15px", fontWeight: 900, color }}>
                    {value}
                  </p>
                  {sub && (
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "9px",
                        marginTop: "2px",
                      }}>
                      {sub}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Rang izoh */}
            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}>
              {[
                { color: "#22c55e", label: "≥70% (yaxshi)" },
                { color: "#eab308", label: "50–70% (o'rta)" },
                { color: "#ef4444", label: "<50% (past)" },
              ].map(({ color, label }) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "2px",
                      background: color,
                    }}
                  />
                  <span
                    style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Kelganlar soni grafigi */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "14px",
              }}>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "var(--text-secondary)",
                  marginBottom: "14px",
                }}>
                Kelganlar soni
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 5, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.07)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v) => [`${v} talaba`, "Keldi"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="keldi"
                    stroke="#3b82f6"
                    fill="url(#grad1)"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Foiz grafigi — har bir bar rangli */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "14px",
              }}>
              <p
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  color: "var(--text-secondary)",
                  marginBottom: "14px",
                }}>
                Davomat foizi (%)
              </p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 5, bottom: 0, left: -24 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(148,163,184,0.07)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v) => [`${v}%`, "Davomat"]}
                  />
                  <Bar dataKey="foiz" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getBarColor(entry.foiz)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Kunlik jadval */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: "1px solid var(--border)",
                }}>
                <p style={{ fontSize: "12px", fontWeight: 800 }}>
                  Kunlik tafsilot
                </p>
              </div>
              {[...chartData].reverse().map((row, i) => {
                const color = getBarColor(row.foiz);
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderBottom:
                        i < chartData.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}>
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "11px",
                        width: "72px",
                        flexShrink: 0,
                      }}>
                      {row.date}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: "5px",
                        background: "var(--bg-input)",
                        borderRadius: "99px",
                        overflow: "hidden",
                        margin: "0 10px",
                      }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${row.foiz}%`,
                          background: color,
                          borderRadius: "99px",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 900,
                        color,
                        width: "38px",
                        textAlign: "right",
                      }}>
                      {row.foiz}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <NavBar />
    </div>
  );
}
