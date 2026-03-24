import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import NavBar from "../components/NavBar";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setInfo(res.data.user))
      .catch(console.error);
  }, []);

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
        paddingBottom: "100px",
      }}>
      {/* Avatar */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3b82f6, #a855f7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "32px",
          marginBottom: "20px",
          boxShadow: "0 8px 24px rgba(59,130,246,0.3)",
        }}>
        👨‍🎓
      </div>

      <h1 style={{ fontSize: "22px", fontWeight: 900, marginBottom: "4px" }}>
        {user?.firstName} {user?.lastName}
      </h1>
      <p
        style={{
          background: "rgba(59,130,246,0.15)",
          color: "var(--accent-blue-light)",
          padding: "4px 14px",
          borderRadius: "99px",
          fontSize: "12px",
          fontWeight: 700,
          marginBottom: "32px",
        }}>
        O'quvchi
      </p>

      {/* Ma'lumotlar */}
      <div
        style={{
          width: "100%",
          maxWidth: "340px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          overflow: "hidden",
          marginBottom: "20px",
        }}>
        {[
          { label: "ID", value: user?.id, mono: true },
          { label: "Ism", value: info?.firstName },
          { label: "Familiya", value: info?.lastName },
          { label: "Guruh", value: info?.groupInfo?.name || "—" },
          { label: "Kurs", value: info?.groupInfo?.course_name || "—" },
        ].map(({ label, value, mono }, i, arr) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 18px",
              borderBottom:
                i < arr.length - 1 ? "1px solid var(--border)" : "none",
            }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
              {label}
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: "13px",
                fontFamily: mono ? "var(--font-mono)" : "inherit",
                color: mono
                  ? "var(--accent-blue-light)"
                  : "var(--text-primary)",
              }}>
              {value || "—"}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={logout}
        style={{
          width: "100%",
          maxWidth: "340px",
          padding: "13px",
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)",
          color: "var(--accent-red)",
          borderRadius: "var(--radius-md)",
          fontSize: "14px",
          fontWeight: 700,
        }}>
        🚪 Chiqish
      </button>

      {/* NAVBAR — eng muhim qism */}
      <NavBar />
    </div>
  );
}
