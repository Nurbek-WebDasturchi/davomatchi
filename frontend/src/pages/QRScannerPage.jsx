import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import NavBar from "../components/NavBar";

export default function QRScannerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scannerRef = useRef(null);
  const lastScan = useRef(null);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setError(null);

    // Avvalgi instanceni tozalaymiz
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }

    try {
      const html5QrCode = new Html5Qrcode("qr-reader-container");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, // Android orqa kamera uchun muhim
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        async (decodedText) => {
          // 3 soniyada bir marta ishlasin
          const now = Date.now();
          if (lastScan.current && now - lastScan.current < 3000) return;
          lastScan.current = now;

          try {
            const data = JSON.parse(decodedText);
            if (data.qrToken) {
              await processAttendance(data.qrToken);
            }
          } catch {
            // JSON emas — ignore
          }
        },
        () => {
          // Har frame da chaqiriladi agar QR topilmasa — ignore
        },
      );

      setScanning(true);
    } catch (err) {
      console.error("Scanner xatosi:", err);
      const errStr = String(err?.message || err);

      if (
        errStr.includes("NotAllowedError") ||
        errStr.includes("Permission") ||
        errStr.includes("permission")
      ) {
        setError(
          "Kameraga ruxsat berilmadi. Brauzer sozlamalarida kamera ruxsatini yoqing.",
        );
      } else if (
        errStr.includes("NotFound") ||
        errStr.includes("no camera") ||
        errStr.includes("Requested device not found")
      ) {
        setError(
          "Kamera topilmadi. Qurilmangizda kamera borligini tekshiring.",
        );
      } else if (errStr.includes("NotReadableError")) {
        setError(
          "Kamera boshqa ilova tomonidan ishlatilmoqda. Boshqa ilovalarni yoping.",
        );
      } else {
        setError(
          "Kamerani ochib bo'lmadi. Sahifani yangilang va qayta urinib ko'ring.",
        );
      }
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const processAttendance = async (qrToken) => {
    // Natija ko'rsatish oldidan scannerni to'xtatamiz
    await stopScanner();
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post("/attendance/scan", {
        qrToken,
        studentId: user.id,
      });
      setResult(res.data);

      // Telegram WebApp ga yuborish
      window.Telegram?.WebApp?.sendData(
        JSON.stringify({
          type: res.data.alreadyMarked ? "already_marked" : "attendance_marked",
          ...res.data.attendance,
        }),
      );
    } catch (err) {
      setError(err.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setResult(null);
    setError(null);
    lastScan.current = null;
    await startScanner();
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
          gap: "10px",
        }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "7px 10px",
            color: "var(--text-primary)",
            fontSize: "16px",
          }}>
          ←
        </button>
        <div>
          <h1 style={{ fontSize: "17px", fontWeight: 800 }}>📷 QR Skaner</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {user?.role === "student"
              ? `${user?.firstName} ${user?.lastName} — davomat belgilash`
              : "Davomat belgilash"}
          </p>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Natija ekrani */}
        {result ? (
          <div style={{ animation: "slideUp 0.35s ease forwards" }}>
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
                padding: "28px 20px",
                textAlign: "center",
                marginBottom: "16px",
              }}>
              <p style={{ fontSize: "52px", marginBottom: "12px" }}>
                {result.alreadyMarked ? "⚠️" : "✅"}
              </p>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 900,
                  marginBottom: "6px",
                }}>
                {result.alreadyMarked
                  ? "Allaqachon belgilangan!"
                  : "Davomat belgilandi!"}
              </h2>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "13px",
                  marginBottom: "20px",
                }}>
                {result.message}
              </p>
              <div
                style={{
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-lg)",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  textAlign: "left",
                }}>
                {[
                  { label: "👤 Talaba", val: result.attendance?.studentName },
                  { label: "📚 Guruh", val: result.attendance?.groupName },
                  {
                    label: "🕐 Vaqt",
                    val: result.attendance?.scannedAt
                      ? new Date(result.attendance.scannedAt).toLocaleString(
                          "uz-UZ",
                        )
                      : "—",
                  },
                ].map(({ label, val }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}>
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
            </div>
            <button
              onClick={reset}
              style={{
                width: "100%",
                padding: "14px",
                background: "var(--accent-blue)",
                color: "#fff",
                borderRadius: "var(--radius-lg)",
                fontSize: "14px",
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
              }}>
              📷 Yana skanerlash
            </button>
          </div>
        ) : (
          /* Skaner ekrani */
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Kamera container — html5-qrcode shu div ichiga render qiladi */}
            <div
              style={{
                position: "relative",
                borderRadius: "var(--radius-xl)",
                overflow: "hidden",
                background: "#000",
                aspectRatio: "1",
                border: "1px solid var(--border)",
              }}>
              {/* html5-qrcode shu id ga render qiladi */}
              <div
                id="qr-reader-container"
                style={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  inset: 0,
                }}
              />

              {/* Skaner burchak chiziqlari — faqat scanning va xato yo'q paytda */}
              {scanning && !loading && !error && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                  }}>
                  {[
                    {
                      top: "18%",
                      left: "18%",
                      borderTop: "3px solid",
                      borderLeft: "3px solid",
                    },
                    {
                      top: "18%",
                      right: "18%",
                      borderTop: "3px solid",
                      borderRight: "3px solid",
                    },
                    {
                      bottom: "18%",
                      left: "18%",
                      borderBottom: "3px solid",
                      borderLeft: "3px solid",
                    },
                    {
                      bottom: "18%",
                      right: "18%",
                      borderBottom: "3px solid",
                      borderRight: "3px solid",
                    },
                  ].map((style, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        width: 40,
                        height: 40,
                        borderColor: "var(--accent-blue)",
                        ...style,
                      }}
                    />
                  ))}
                  <div
                    style={{
                      position: "absolute",
                      left: "18%",
                      right: "18%",
                      height: "2px",
                      background:
                        "linear-gradient(90deg, transparent, var(--accent-blue), transparent)",
                      animation: "scanLine 2s ease-in-out infinite",
                      boxShadow: "0 0 8px var(--accent-blue)",
                    }}
                  />
                </div>
              )}

              {/* Xato overlay */}
              {error && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(15,23,42,0.92)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "20px",
                    textAlign: "center",
                    zIndex: 10,
                  }}>
                  <p style={{ fontSize: "36px", marginBottom: "10px" }}>📷</p>
                  <p
                    style={{
                      color: "var(--accent-red)",
                      fontWeight: 700,
                      marginBottom: "6px",
                    }}>
                    Kamera xatosi
                  </p>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                    }}>
                    {error}
                  </p>
                </div>
              )}

              {/* Yuklanmoqda overlay */}
              {loading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "rgba(15,23,42,0.85)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 10,
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
              )}
            </div>

            {/* Holat matni / tugma */}
            {scanning && !loading ? (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: "12px",
                  animation: "pulse 1.5s ease infinite",
                }}>
                📷 Guruh QR kodini kameraga tutib turing...
              </p>
            ) : !error && !loading ? (
              <button
                onClick={startScanner}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "var(--accent-blue)",
                  color: "#fff",
                  borderRadius: "var(--radius-lg)",
                  fontSize: "14px",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                }}>
                ▶️ Kamerani yoqish
              </button>
            ) : error ? (
              <button
                onClick={startScanner}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "var(--accent-blue)",
                  color: "#fff",
                  borderRadius: "var(--radius-lg)",
                  fontSize: "14px",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                }}>
                🔄 Qayta urinish
              </button>
            ) : null}

            {/* Ko'rsatmalar */}
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
                  marginBottom: "8px",
                }}>
                📋 Ko'rsatmalar
              </p>
              {[
                "1. Sinfxonadagi guruh QR kodini toping",
                "2. Kamerani QR kodga to'g'rilang",
                "3. Tizim avtomatik davomatni belgilaydi",
              ].map((t) => (
                <p
                  key={t}
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    marginBottom: "5px",
                  }}>
                  {t}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      <NavBar />
    </div>
  );
}
