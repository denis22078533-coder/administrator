import { useState, useCallback } from "react";

const STORAGE_KEY = "lumen_auth";
const PASSWORD = "Lumen2024";

function isAuthed(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}

export function useLumenAuth() {
  const [authed, setAuthed] = useState<boolean>(isAuthed);

  const login = useCallback((password: string): boolean => {
    if (password === PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "1");
      setAuthed(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAuthed(false);
  }, []);

  return { authed, login, logout };
}
