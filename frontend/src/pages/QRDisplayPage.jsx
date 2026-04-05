import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import NavBar from "../components/NavBar";

export default function QRDisplayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/groups/${id}/qr`)
      .then((res) => setQr(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = () => {
    if (!qr?.qrCode) return;
    const a = document.createElement("a");
    a.href = qr.qrCode;
    a.download = `${qr.groupName}-QR.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!navigator.share || !qr?.qrCode) return;
    try {
      const blob = await (await fetch(qr.qrCode)).blob();
      const file = new File([blob], `${qr.groupName}-QR.png`, {
        type: "image/png",
      });
      await navigator.share({
        title: `${qr.groupName} QR Kodi`,
        files: [file],
      });
    } catch {}
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
          <h1 style={{ fontSize: "17px", fontWeight: 800 }}>QR Kod</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "11px" }}>
            {qr?.groupName}
          </p>
        </div>
      </div>

      <div
        style={{
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}>
        {/* QR rasm */}
        <div
          style={{
            background: "#fff",
            borderRadius: "var(--radius-xl)",
            padding: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            animation: "slideUp 0.4s ease forwards",
          }}>
          {qr?.qrCode && (
            <img
              src={qr.qrCode}
              alt="QR Code"
              style={{ width: "220px", height: "220px", display: "block" }}
            />
          )}
        </div>

        {/* Guruh nomi */}
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 900 }}>{qr?.groupName}</h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "13px",
              marginTop: "4px",
            }}>
            Talabalar bu kodni skanerlaydi
          </p>
        </div>

        {/* Token */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "14px",
            width: "100%",
          }}>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "10px",
              fontWeight: 700,
              marginBottom: "6px",
            }}>
            QR TOKEN
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--accent-blue-light)",
              wordBreak: "break-all",
            }}>
            {qr?.qrToken}
          </p>
        </div>

        {/* Tugmalar */}
        <div style={{ display: "flex", gap: "10px", width: "100%" }}>
          <button
            onClick={handleDownload}
            style={{
              flex: 1,
              padding: "13px",
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "var(--accent-blue-light)",
              borderRadius: "var(--radius-lg)",
              fontSize: "13px",
              fontWeight: 800,
            }}>
            ⬇️ Yuklab olish
          </button>
          {typeof navigator.share !== "undefined" && (
            <button
              onClick={handleShare}
              style={{
                flex: 1,
                padding: "13px",
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "var(--accent-green)",
                borderRadius: "var(--radius-lg)",
                fontSize: "13px",
                fontWeight: 800,
              }}>
              📤 Ulashish
            </button>
          )}
        </div>

        {/* Yo'riqnoma */}
        <div
          style={{
            background: "rgba(59,130,246,0.07)",
            border: "1px solid rgba(59,130,246,0.15)",
            borderRadius: "var(--radius-lg)",
            padding: "14px",
            width: "100%",
          }}>
          <p
            style={{
              color: "var(--accent-blue-light)",
              fontSize: "12px",
              fontWeight: 800,
              marginBottom: "10px",
            }}>
            ℹ️ Qanday ishlaydi?
          </p>
          {[
            "1. Bu QR kodni sinfda ko'rinadigan joyga ilib qo'ying",
            "2. Talabalar kelganda Telegram botni oching",
            "3. QR Skaner tugmasini bosing",
            "4. QR kodni skanerlang — davomat avtomatik belgilanadi",
          ].map((t) => (
            <p
              key={t}
              style={{
                color: "var(--text-secondary)",
                fontSize: "12px",
                marginBottom: "5px",
              }}>
              {t}
            </p>
          ))}
        </div>
      </div>

      <NavBar />
    </div>
  );
}
