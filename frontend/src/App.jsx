import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import MyGroupsPage from "./pages/MyGroupsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import GroupsListPage from "./pages/GroupsListPage";
import QRScannerPage from "./pages/QRScannerPage";
import QRDisplayPage from "./pages/QRDisplayPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import MarkAttendance from "./pages/MarkAttendancePage";
import ProfilePage from "./pages/ProfilePage";
import LoadingSpinner from "./components/LoadingSpinner";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.role;
  if (role === "student") return <Navigate to="/profile" replace />;
  if (["master", "curator"].includes(role))
    return <Navigate to="/my-groups" replace />;
  if (["director", "deputy"].includes(role)) return <DashboardPage />;
  if (role === "attendance_manager") return <Navigate to="/mark" replace />;
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Bosh sahifa — rolga qarab yo'naltiradi */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      {/* Director / Deputy — faqat ko'rish, skaner YO'Q */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roles={["director", "deputy"]}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute roles={["director", "deputy"]}>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/qr/:id"
        element={
          <ProtectedRoute roles={["director", "deputy", "master", "curator"]}>
            <QRDisplayPage />
          </ProtectedRoute>
        }
      />

      {/* Barcha guruhlar — director, deputy, attendance_manager */}
      <Route
        path="/groups-list"
        element={
          <ProtectedRoute roles={["director", "deputy", "attendance_manager"]}>
            <GroupsListPage />
          </ProtectedRoute>
        }
      />

      {/* Guruh tafsiloti */}
      <Route
        path="/group/:id"
        element={
          <ProtectedRoute
            roles={[
              "director",
              "deputy",
              "master",
              "curator",
              "attendance_manager",
            ]}>
            <GroupDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Master / Curator */}
      <Route
        path="/my-groups"
        element={
          <ProtectedRoute roles={["master", "curator"]}>
            <MyGroupsPage />
          </ProtectedRoute>
        }
      />

      {/* Davomatchi — faqat attendance_manager */}
      <Route
        path="/mark"
        element={
          <ProtectedRoute roles={["attendance_manager"]}>
            <MarkAttendance />
          </ProtectedRoute>
        }
      />

      {/* QR Scanner — director/deputy EMAS, qolganlar ha */}
      <Route
        path="/scan"
        element={
          <ProtectedRoute
            roles={["student", "master", "curator", "attendance_manager"]}>
            <QRScannerPage />
          </ProtectedRoute>
        }
      />

      {/* Student profili */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute roles={["student"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
