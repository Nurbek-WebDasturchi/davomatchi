import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage      from './pages/LoginPage';
import DashboardPage  from './pages/DashboardPage';
import GroupDetailPage from './pages/GroupDetailPage';
import QRScannerPage  from './pages/QRScannerPage';
import QRDisplayPage  from './pages/QRDisplayPage';
import AnalyticsPage  from './pages/AnalyticsPage';
import LoadingSpinner from './components/LoadingSpinner';

// Faqat kirgan foydalanuvchilar uchun
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  // Telegram WebApp sozlamalari
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0f172a');
      tg.setBackgroundColor('#0f172a');
    }
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route path="/" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />

      <Route path="/group/:id" element={
        <ProtectedRoute><GroupDetailPage /></ProtectedRoute>
      } />

      <Route path="/scan" element={
        <ProtectedRoute><QRScannerPage /></ProtectedRoute>
      } />

      <Route path="/qr/:id" element={
        <ProtectedRoute roles={['admin', 'teacher']}><QRDisplayPage /></ProtectedRoute>
      } />

      <Route path="/analytics" element={
        <ProtectedRoute roles={['admin', 'teacher']}><AnalyticsPage /></ProtectedRoute>
      } />

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
