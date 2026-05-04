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
  sbp_payload: string | null;
}

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

async function callAuth(body: object) {
  if (!AUTH_URL) {
    return { error: "Сервис авторизации не настроен (VITE_AUTH_URL не задан)" };
  }
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    const parsed = JSON.parse(text);
    return typeof parsed === "string" ? JSON.parse(parsed) : parsed;
  } catch {
    return { error: text };
  }
}

export function useMuraveyBalance(isAdmin: boolean) {
  const [balance, setBalance] = useState<MuraveyBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const deviceId = getDeviceId();

  const fetchBalance = useCallback(async () => {
    if (isAdmin || !AUTH_URL) return;
    setLoading(true);
    try {
      const data = await callAuth({ action: "muravey_get", device_id: deviceId });
      if (!data.error) {
        setBalance({
          free_requests_left: data.free_requests_left,
          paid_requests_balance: data.paid_requests_balance,
          total_requests_left: data.total_requests_left,
          can_send: data.can_send,
          email: data.email ?? null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId, isAdmin]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const spendRequest = useCallback(async (): Promise<boolean> => {
    if (isAdmin) return true;
    if (!AUTH_URL) return true;
    const data = await callAuth({ action: "muravey_spend", device_id: deviceId });
    if (data.can_send) {
      setBalance(prev => prev ? {
        ...prev,
        free_requests_left: data.free_requests_left,
        paid_requests_balance: data.paid_requests_balance,
        total_requests_left: data.total_requests_left,
        can_send: data.total_requests_left > 0,
      } : null);
      return true;
    }
    setBalance(prev => prev ? { ...prev, can_send: false, total_requests_left: 0 } : null);
    return false;
  }, [deviceId, isAdmin]);

  const createPayment = useCallback(async (
    email: string,
    phone: string,
    packageId: string
  ): Promise<PaymentResult | { error: string }> => {
    const data = await callAuth({
      action: "muravey_create_payment",
      device_id: deviceId,
      email,
      phone,
      package_id: packageId,
    });
    if (data.ok) {
      setBalance(prev => prev ? { ...prev, email } : null);
    }
    return data;
  }, [deviceId]);

  const restoreByEmail = useCallback(async (email: string) => {
    const data = await callAuth({ action: "muravey_restore", device_id: deviceId, email });
    if (data.ok) {
      setBalance(prev => prev ? {
        ...prev,
        email,
        free_requests_left: data.free_requests_left,
        paid_requests_balance: data.paid_requests_balance,
        total_requests_left: data.total_requests_left,
        can_send: data.total_requests_left > 0,
      } : null);
    }
    return data;
  }, [deviceId]);

  const checkPayment = useCallback(async (dbPaymentId: number) => {
    return callAuth({ action: "muravey_check_payment", db_payment_id: dbPaymentId });
  }, []);

  const confirmTestPayment = useCallback(async (dbPaymentId: number) => {
    const data = await callAuth({ action: "muravey_confirm_test", db_payment_id: dbPaymentId });
    if (data.ok) {
      await fetchBalance();
    }
    return data;
  }, [fetchBalance]);

  return {
    balance,
    loading,
    deviceId,
    fetchBalance,
    spendRequest,
    createPayment,
    restoreByEmail,
    checkPayment,
    confirmTestPayment,
  };
}
