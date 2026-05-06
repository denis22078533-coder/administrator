import { useState, useCallback } from "react";

const API_URL = "https://югазин.рф/api";
const TOKEN_KEY = "muravey_auth_token";
const TESTER_MODE_KEY = "muravey_tester_mode";

export interface User {
  id: number;
  email: string;
  tokens_balance: number;
  is_admin: boolean;
}

export function useApiAuth() {
  const defaultUser: User = {
    id: 1,
    email: "dev@muravey.com",
    tokens_balance: 9999,
    is_admin: true,
  };

  const [user, setUser] = useState<User | null>(defaultUser);
  const [token, setToken] = useState<string | null>("fake-dev-token");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isTester, setIsTester] = useState<boolean>(true);

  const login = useCallback(async (email, password) => {
    console.log("Login disabled");
    return true;
  }, []);

  const register = useCallback(async (email, password) => {
    console.log("Register disabled");
    return true;
  }, []);

  const logout = useCallback(() => {
    console.log("Logout disabled");
  }, []);

  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  const resetBalance = useCallback(async () => {
    console.log("Balance reset disabled");
  }, []);

  const toggleTesterMode = useCallback(() => {
    setIsTester(prev => !prev);
  }, []);

  const spendBalance = useCallback(async (amount: number) => {
    console.log(`Spending ${amount} tokens (disabled)`);
    return;
  }, []);

  const displayBalance = user ? (user.is_admin && !isTester ? "∞" : user.tokens_balance) : 0;

  return {
    user,
    token,
    isLoading,
    authError,
    login,
    register,
    logout,
    clearError,
    isTester,
    toggleTesterMode,
    resetBalance,
    displayBalance,
    spendBalance,
  };
}
