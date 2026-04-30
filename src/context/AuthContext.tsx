import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const AUTH_URL = "https://functions.poehali.dev/eeb54226-78fa-4f8b-b19f-8d5caf9b202f";

export interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  bio: string;
  avatar_emoji: string;
  favorite_sports: string[];
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<{ error?: string }>;
  register: (data: { username: string; email: string; password: string; display_name: string }) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("moto_token");
    if (saved) {
      setToken(saved);
      fetchMe(saved).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async (t: string) => {
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "me", token: t }),
      });
      const text = await res.text();
      const data = JSON.parse(typeof JSON.parse(text) === "string" ? JSON.parse(text) : text);
      if (data.user) setUser(data.user);
      else {
        localStorage.removeItem("moto_token");
        setToken(null);
      }
    } catch {
      localStorage.removeItem("moto_token");
      setToken(null);
    }
  };

  const login = async (loginVal: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", login: loginVal, password }),
      });
      const text = await res.text();
      const raw = JSON.parse(text);
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (data.error) return { error: data.error };
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("moto_token", data.token);
      return {};
    } catch {
      return { error: "Ошибка соединения" };
    }
  };

  const register = async (form: { username: string; email: string; password: string; display_name: string }): Promise<{ error?: string }> => {
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", ...form }),
      });
      const text = await res.text();
      const raw = JSON.parse(text);
      const data = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (data.error) return { error: data.error };
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("moto_token", data.token);
      return {};
    } catch {
      return { error: "Ошибка соединения" };
    }
  };

  const logout = () => {
    if (token) {
      fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout", token }),
      }).catch(() => {});
    }
    localStorage.removeItem("moto_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
