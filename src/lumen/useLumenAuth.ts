import { useState, useCallback } from "react";

const LOGIN_KEY = "lumen_auth";
const ADMIN_KEY = "lumen_admin";
const LOGIN_PASSWORD = "Lumen2024";
const ADMIN_PASSWORD = "Admin2026";

function isLoggedIn(): boolean {
  try { return localStorage.getItem(LOGIN_KEY) === "1"; } catch { return false; }
}

function isAdmin(): boolean {
  try { return localStorage.getItem(ADMIN_KEY) === "1"; } catch { return false; }
}

export function useLumenAuth() {
  const [loggedIn, setLoggedIn] = useState<boolean>(isLoggedIn);
  const [authed, setAuthed] = useState<boolean>(isAdmin);

  // Вход в приложение (Lumen2024)
  const login = useCallback((password: string): boolean => {
    if (password === LOGIN_PASSWORD) {
      localStorage.setItem(LOGIN_KEY, "1");
      setLoggedIn(true);
      return true;
    }
    return false;
  }, []);

  // Вход в режим администратора (Admin2026)
  const adminLogin = useCallback((password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_KEY, "1");
      setAuthed(true);
      return true;
    }
    return false;
  }, []);

  // Выход из режима администратора
  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_KEY);
    setAuthed(false);
  }, []);

  return { loggedIn, authed, login, adminLogin, logout };
}
