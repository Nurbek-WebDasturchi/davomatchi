import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Telegram orqali kirish
  const login = useCallback(async (tgUser, initData) => {
    try {
      setError(null);
      const res = await api.post('/auth/telegram', {
        telegramId: tgUser.id,
        fullName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
        username:  tgUser.username,
        initData,
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user',  JSON.stringify(res.data.user));
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Xatolik yuz berdi';
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  // Chiqish
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Ilovani ochganda avtomatik kirish
  useEffect(() => {
    const init = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        const storedUser  = localStorage.getItem('user');

        if (storedToken && storedUser) {
          setUser(JSON.parse(storedUser));
          // Token hali ham amal qilishini tekshirish
          try {
            const res = await api.get('/auth/me');
            setUser(res.data.user);
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
          setLoading(false);
          return;
        }

        // Telegram WebApp orqali avtomatik kirish
        const tg = window.Telegram?.WebApp;
        if (tg?.initDataUnsafe?.user) {
          await login(tg.initDataUnsafe.user, tg.initData);
        }
      } catch (err) {
        console.error('Auth init xatosi:', err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [login]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
