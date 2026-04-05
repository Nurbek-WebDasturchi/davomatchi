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

  if (role === "director" || role === "deputy") {
    items = [
      { path: "/", icon: "🏠", label: "Bosh sahifa" },
      { path: "/groups-list", icon: "📋", label: "Guruhlar" },
      { path: "/analytics", icon: "📊", label: "Tahlil" },
    ];
  } else if (role === "master" || role === "curator") {
    items = [{ path: "/my-groups", icon: "🏠", label: "Guruhlar" }];
  } else if (role === "attendance_manager") {
    items = [
      { path: "/mark", icon: "📋", label: "Davomat" },
      { path: "/groups-list", icon: "👥", label: "Guruhlar" },
    ];
  } else if (role === "student") {
    items = [
      { path: "/profile", icon: "👤", label: "Profil" },
      { path: "/scan", icon: "📷", label: "Skaner" },
    ];
  }

  if (items.length === 0) return null;

  return (
    <>
      {/* 
        Bu spacer NavBar ning ustida turgan kontentni
        pastga itarmaydi — NavBar content ustida turadi.
        Spacer kontentning oxiriga qo'shiladi.
      */}
      <div style={{ height: "80px", flexShrink: 0 }} />

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--bg-secondary)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "stretch",
          height: "65px",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          zIndex: 100,
          boxShadow: "0 -2px 16px rgba(0,0,0,0.2)",
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
                justifyContent: "center",
                gap: "3px",
                padding: "8px 4px",
                background: "transparent",
                color: active
                  ? "var(--accent-blue-light)"
                  : "var(--text-muted)",
                fontSize: "10px",
                fontWeight: active ? 800 : 500,
                border: "none",
                cursor: "pointer",
                position: "relative",
                transition: "color 0.2s",
              }}>
              {/* Aktiv — yuqori chiziq */}
              {active && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: "25%",
                    right: "25%",
                    height: "2px",
                    background: "var(--accent-blue)",
                    borderRadius: "0 0 3px 3px",
                  }}
                />
              )}
              <span style={{ fontSize: "22px", lineHeight: 1 }}>{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
