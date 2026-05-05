import { useState, useCallback, useEffect } from "react";

const API_URL = "http://localhost:5001/api"; // Адрес нашего бэкенда
const TOKEN_KEY = "muravey_auth_token";
const TESTER_MODE_KEY = "muravey_tester_mode";

// Типизация для данных пользователя
export interface User {
  id: number;
  email: string;
  tokens_balance: number;
  is_admin: boolean;
}

export function useApiAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Состояние "Режим Тестировщика" для админов
  const [isTester, setIsTester] = useState<boolean>(() => {
      const stored = localStorage.getItem(TESTER_MODE_KEY);
      return stored === "1";
  });

  // Функция для проверки токена и получения данных пользователя
  const validateTokenAndFetchUser = useCallback(async (authToken: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.status === 401) {
        // Токен недействителен
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
        return;
      }
      if (!response.ok) throw new Error("Ошибка получения данных пользователя");
      
      const data = await response.json();
      setUser(data.user);

    } catch (e: any) {
      console.error(e);
      // Если не удалось проверить, выходим из системы
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // При загрузке хука, если есть токен, проверяем его
  useEffect(() => {
    if (token) {
      validateTokenAndFetchUser(token);
    }
  }, [token, validateTokenAndFetchUser]);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка входа");

      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return true;
    } catch (e: any) {
      setAuthError(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Ошибка регистрации");
      return login(email, password);
    } catch (e: any) {
      setAuthError(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TESTER_MODE_KEY);
    setToken(null);
    setUser(null);
    setIsTester(false);
  }, []);
  
  const clearError = useCallback(() => {
      setAuthError(null);
  }, []);

  const resetBalance = useCallback(async () => {
      if (!token) return;
      try {
          const response = await fetch(`${API_URL}/balance/reset`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Ошибка сброса баланса");
          setUser(data.user); // Обновляем данные пользователя
      } catch (e: any) {
          console.error("Balance reset error:", e.message);
      }
  }, [token]);

  const toggleTesterMode = useCallback(() => {
    if (user && user.is_admin) {
        const newTesterState = !isTester;
        setIsTester(newTesterState);
        localStorage.setItem(TESTER_MODE_KEY, newTesterState ? "1" : "0");
    }
  }, [user, isTester]);

  // Вычисляемое свойство для отображения баланса
  const displayBalance = user ? (user.is_admin && !isTester ? "∞" : user.tokens_balance) : 0;

  return { user, token, isLoading, authError, login, register, logout, clearError, isTester, toggleTesterMode, resetBalance, displayBalance };
}
