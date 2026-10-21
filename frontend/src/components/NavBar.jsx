import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { downloadAttendanceExcel } from "../utils/export";

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);

  if (!user) return null;

  const role = user.role;
  let items = [];

  if (role === "director") {
    // Director: hamma 3 ta tab ko'radi
    items = [
      { path: "/", icon: "fi fi-rr-home", label: "Bosh sahifa" },
      { path: "/groups-list", icon: "fi fi-rr-users", label: "Guruhlar" },
      { path: "/analytics", icon: "fi fi-rr-chart-histogram", label: "Tahlil" },
    ];
  } else if (role === "deputy") {
    // Deputy: Analytics ko'rmaydi
    items = [
      { path: "/", icon: "fi fi-rr-home", label: "Bosh sahifa" },
      { path: "/groups-list", icon: "fi fi-rr-users", label: "Guruhlar" },
    ];
  } else if (role === "master" || role === "curator") {
    items = [{ path: "/my-groups", icon: "fi fi-rr-users", label: "Guruhlar" }];
  } else if (role === "attendance_manager") {
    items = [
      { path: "/mark", icon: "fi fi-rr-clipboard-check", label: "Davomat" },
      { path: "/groups-list", icon: "fi fi-rr-users", label: "Guruhlar" },
    ];
  } else if (role === "student") {
    items = [
      { path: "/profile", icon: "fi fi-rr-user", label: "Profil" },
      { path: "/scan", icon: "fi fi-rr-camera", label: "Skaner" },
    ];
  }

  if (items.length === 0) return null;

  const canExport = ["director", "deputy", "attendance_manager"].includes(role);
  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAttendanceExcel();
    } catch {
      alert("Excel yuklanmadi. Internet yoki server ulanishini tekshiring.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="navbar-spacer" />

      <nav
        className="app-nav">
        {items.map(({ path, icon, label }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`app-nav-item${active ? " active" : ""}`}>
              {active && (
                <span
                  className="app-nav-indicator"
                />
              )}
              <i className={`app-nav-icon ${icon}`} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
        <div className="app-nav-actions">
          {canExport && (
            <button className="app-nav-action export" onClick={handleExport} disabled={exporting}>
              <i className="fi fi-rr-file-excel" aria-hidden="true" />
              <span>{exporting ? "Yuklanmoqda..." : "Excel yuklab olish"}</span>
            </button>
          )}
          <button className="app-nav-action logout" onClick={logout}>
            <i className="fi fi-rr-sign-out-alt" aria-hidden="true" />
            <span>Chiqish</span>
          </button>
        </div>
      </nav>
    </>
  );
}
