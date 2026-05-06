import { useState, useCallback } from "react";

// Ключи для хранения состояния входа в localStorage
const LOGIN_KEY = "lumen_auth"; 
const ADMIN_KEY = "lumen_admin_auth";

// Пароли
const LOGIN_PASSWORD = "Lumen2024";
const ADMIN_PASSWORD = "admin2026";

// Проверяет, вошел ли пользователь на сайт
function isLoggedIn(): boolean {
  try { return localStorage.getItem(LOGIN_KEY) === "1"; } catch { return false; }
}

// Проверяет, вошел ли пользователь в админ-панель
function isAdmin(): boolean {
  try { return localStorage.getItem(ADMIN_KEY) === "1"; } catch { return false; }
}

// Хук для управления аутентификацией
export function useLumenAuth() {
  const [loggedIn, setLoggedIn] = useState<boolean>(isLoggedIn);
  const [adminMode, setAdminMode] = useState<boolean>(isAdmin);

  // Вход на сайт (пароль: Lumen2024)
  const login = useCallback((password: string): boolean => {
    if (password === LOGIN_PASSWORD) {
      localStorage.setItem(LOGIN_KEY, "1");
      setLoggedIn(true);
      return true;
    }
    return false;
  }, []);

  // Вход в админ-панель (пароль: admin2026)
  const adminLogin = useCallback((password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_KEY, "1");
      setAdminMode(true);
      return true;
    }
    return false;
  }, []);

  // Выход из админ-панели
  const adminLogout = useCallback(() => {
    localStorage.removeItem(ADMIN_KEY);
    setAdminMode(false);
  }, []);

  return { loggedIn, adminMode, login, adminLogin, adminLogout };
}

