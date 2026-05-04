import { useState, useEffect, useCallback } from "react";

const AUTH_URL = import.meta.env.VITE_AUTH_URL || "";
const DEVICE_ID_KEY = "muravey_device_id";

export interface MuraveyBalance {
  free_requests_left: number;
  paid_requests_balance: number;
  total_requests_left: number;
  can_send: boolean;
  email: string | null;
}

export interface PaymentResult {
  ok: boolean;
  test_mode: boolean;
  payment_id: string;
  db_payment_id: number;
  package: string;
  amount_rub: number;
  requests_count: number;
  sop_payload: string | null;
}

export function useMuraveyBalance(isAdmin: boolean) {
  const [balance, setBalance] = useState<MuraveyBalance | null>(null);

  const refreshBalance = useCallback(async () => {
    // Принудительный безлимит для владельца
    setBalance({
      free_requests_left: 999999,
      paid_requests_balance: 999999,
      total_requests_left: 999999,
      can_send: true,
      email: "admin@lumin.pro"
    });
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const createPayment = async (packageId: string, email: string, phone: string): Promise<PaymentResult | { error: string }> => {
    return { error: "Платежи отключены для администратора" };
  };

  const restoreByEmail = useCallback(async (email: string) => {
    refreshBalance();
  }, [refreshBalance]);

  return {
    balance,
    refreshBalance,
    createPayment,
    restoreByEmail
  };
}
