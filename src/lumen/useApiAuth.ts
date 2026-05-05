import { useState, useCallback, useEffect } from "react";

const API_URL = "http://localhost:5001/api"; // Адрес нашего бэкенда
const TOKEN_KEY = "muravey_auth_token";

// Типизация для данных пользователя
interface User {
  id: number;
  email: string;
  tokens_balance: number;
}

export function useApiAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // При загрузке хука, пытаемся достать токен из localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      // TODO: Добавить логику валидации токена и получения данных о пользователе
      setToken(storedToken);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Ошибка входа");
      }

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Ошибка регистрации");
      }
      
      // После успешной регистрации можно сразу залогинить пользователя
      return login(email, password);
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, isLoading, error, login, register, logout };
}
