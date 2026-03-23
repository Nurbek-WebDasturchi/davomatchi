import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role;
  let items = [];

  if (["director", "deputy"].includes(role)) {
    items = [
      { path: "/", icon: "🏠", label: "Bosh sahifa" },
      { path: "/groups-list", icon: "📋", label: "Guruhlar" },
      { path: "/analytics", icon: "📊", label: "Tahlil" },
    ];
  } else if (["master", "curator"].includes(role)) {
    items = [
      { path: "/my-groups", icon: "🏠", label: "Guruhlar" },
      { path: "/scan", icon: "📷", label: "Skaner" },
    ];
  } else if (role === "attendance_manager") {
    items = [
      { path: "/mark", icon: "📋", label: "Davomat" },
      { path: "/groups-list", icon: "👥", label: "Guruhlar" },
      { path: "/scan", icon: "📷", label: "Skaner" },
    ];
  } else if (role === "student") {
    items = [
      { path: "/profile", icon: "👤", label: "Profil" },
      { path: "/scan", icon: "📷", label: "Skaner" },
    ];
  } else {
    return null;
  }

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        padding: "6px 0 env(safe-area-inset-bottom, 6px)",
        zIndex: 100,
      }}>
      {items.map(({ path, icon, label }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "2px",
              padding: "6px 4px",
              background: "transparent",
              color: active ? "var(--accent-blue-light)" : "var(--text-muted)",
              fontSize: "10px",
              fontWeight: active ? 800 : 500,
              transition: "color 0.2s",
            }}>
            <span style={{ fontSize: "20px", lineHeight: 1 }}>{icon}</span>
            <span>{label}</span>
            {active && (
              <span
                style={{
                  width: "4px",
                  height: "4px",
                  borderRadius: "50%",
                  background: "var(--accent-blue)",
                  marginTop: "1px",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
