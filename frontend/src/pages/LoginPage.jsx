import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleSubmit = async () => {
    if (!userId.trim() || !password.trim()) {
      setError("ID va parolni kiriting");
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(userId.trim(), password);
    if (result.success) {
      const role = result.user.role;
      if (role === "student") navigate("/profile", { replace: true });
      else if (["master", "curator"].includes(role))
        navigate("/my-groups", { replace: true });
      else if (["director", "deputy"].includes(role))
        navigate("/", { replace: true });
      else if (role === "attendance_manager")
        navigate("/mark", { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-primary)",
      }}>
      {/* Logo */}
      <div
        style={{
          width: "72px",
          height: "72px",
          borderRadius: "20px",
          background: "linear-gradient(135deg, #3b82f6, #a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(59,130,246,0.3)",
        }}>
        🎓
      </div>

      <h1 style={{ fontSize: "24px", fontWeight: 900, marginBottom: "4px" }}>
        DavomatGo tizimi
      </h1>
      <p
        style={{
          color: "var(--text-secondary)",
          fontSize: "13px",
          marginBottom: "32px",
        }}>
        Tizimga kiring.
      </p>

      {/* Form */}
      <div
        style={{
          width: "100%",
          maxWidth: "340px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}>
        {/* ID */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}>
            FOYDALANUVCHI ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="ID ni kiriting"
            maxLength={10}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "var(--bg-secondary)",
              border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "16px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.1em",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Parol */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 700,
              color: "var(--text-secondary)",
              marginBottom: "6px",
            }}>
            PAROL
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 44px 12px 14px",
                background: "var(--bg-secondary)",
                border: `1px solid ${error ? "rgba(239,68,68,0.5)" : "var(--border)"}`,
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "15px",
                boxSizing: "border-box",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                color: "var(--text-muted)",
                fontSize: "16px",
                padding: "4px",
              }}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Xato */}
        {error && (
          <div
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-sm)",
              padding: "10px 14px",
              color: "var(--accent-red)",
              fontSize: "13px",
              fontWeight: 600,
              textAlign: "center",
            }}>
            ⚠️ {error}
          </div>
        )}

        {/* Kirish tugmasi */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: loading ? "var(--bg-secondary)" : "var(--accent-blue)",
            color: loading ? "var(--text-muted)" : "#fff",
            borderRadius: "var(--radius-md)",
            fontSize: "15px",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: loading ? "not-allowed" : "pointer",
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
            "Kirish"
          )}
        </button>
      </div>

      {/* Brending */}
      <div
        style={{
          marginTop: "32px",
          width: "100%",
          maxWidth: "340px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "18px",
          textAlign: "center",
        }}>
        <p
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            marginBottom: "6px",
          }}>
          🚀 <strong>DavomatGo</strong> bilan endi davomat qilish yanada
          osonroq.
        </p>
        <p
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            textDecoration: "none",
          }}>
          Dastur{" "}
          <a href="https://t.me/N_2984" target="_blank" className="ceo_name">
            Akhmedov Provides
          </a>{" "}
          tomonidan yaratilgan. <br />© 2026 DavomatGo. Barcha huquqlar
          himoyalangan.
        </p>
      </div>
    </div>
  );
}
