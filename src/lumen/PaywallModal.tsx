import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import { PaymentResult } from "./useMuraveyBalance";

interface Package {
  id: string;
  requests: number;
  price: number;
  label: string;
  popular?: boolean;
}

const PACKAGES: Package[] = [
  { id: "20req",  requests: 20,  price: 1000, label: "Старт" },
  { id: "40req",  requests: 40,  price: 2000, label: "Базовый", popular: true },
  { id: "100req", requests: 100, price: 5000, label: "Про" },
];

type Step = "packages" | "form" | "qr" | "success";

interface Props {
  open: boolean;
  onClose: () => void;
  freeRequestsLeft: number;
  onCreatePayment: (email: string, phone: string, packageId: string) => Promise<PaymentResult | { error: string }>;
  onCheckPayment: (dbPaymentId: number) => Promise<{ paid: boolean; requests_count: number }>;
  onConfirmTest: (dbPaymentId: number) => Promise<{ ok: boolean }>;
  onRestoreByEmail: (email: string) => Promise<{ ok: boolean; total_requests_left: number }>;
  onPaid: () => void;
}

export default function PaywallModal({
  open, onClose, freeRequestsLeft,
  onCreatePayment, onCheckPayment, onConfirmTest, onRestoreByEmail, onPaid,
}: Props) {
  const [step, setStep] = useState<Step>("packages");
  const [selectedPkg, setSelectedPkg] = useState<Package>(PACKAGES[1]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [restoreEmail, setRestoreEmail] = useState("");
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");
  const [showRestore, setShowRestore] = useState(false);
  const [copiedSbp, setCopiedSbp] = useState(false);

  const stopPolling = useCallback(() => {
    if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }
  }, [pollInterval]);

  useEffect(() => {
    if (!open) {
      stopPolling();
      setStep("packages");
      setPaymentResult(null);
      setLoading(false);
      setEmailError("");
      setRestoreMsg("");
      setShowRestore(false);
    }
  }, [open, stopPolling]);

  // Поллинг статуса платежа
  const startPolling = useCallback((dbPaymentId: number, isTestMode: boolean) => {
    if (isTestMode) return; // тестовый режим — не поллим
    const interval = setInterval(async () => {
      const res = await onCheckPayment(dbPaymentId);
      if (res.paid) {
        stopPolling();
        setStep("success");
        onPaid();
      }
    }, 3000);
    setPollInterval(interval);
  }, [onCheckPayment, stopPolling, onPaid]);

  const handlePay = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Введите корректный email");
      return;
    }
    setEmailError("");
    setLoading(true);
    try {
      const result = await onCreatePayment(email, phone, selectedPkg.id);
      if ("error" in result) {
        setEmailError(result.error);
        return;
      }
      setPaymentResult(result);
      setStep("qr");
      startPolling(result.db_payment_id, result.test_mode);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConfirm = async () => {
    if (!paymentResult) return;
    setLoading(true);
    try {
      await onConfirmTest(paymentResult.db_payment_id);
      stopPolling();
      setStep("success");
      onPaid();
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(restoreEmail)) {
      setRestoreMsg("Введите корректный email");
      return;
    }
    setRestoreLoading(true);
    try {
      const res = await onRestoreByEmail(restoreEmail);
      if (res.ok && res.total_requests_left > 0) {
        setRestoreMsg(`✓ Восстановлено ${res.total_requests_left} запросов`);
        setTimeout(() => {
          onPaid();
          onClose();
        }, 1500);
      } else {
        setRestoreMsg("Баланс по этому email не найден");
      }
    } finally {
      setRestoreLoading(false);
    }
  };

  const copySbp = () => {
    if (paymentResult?.sbp_payload) {
      navigator.clipboard.writeText(paymentResult.sbp_payload);
      setCopiedSbp(true);
      setTimeout(() => setCopiedSbp(false), 2000);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-0 sm:px-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="w-full sm:max-w-md bg-[#0e0e16] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-xl">
                🐜
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">
                  {step === "success" ? "Оплачено!" : "Пополнить запросы"}
                </h2>
                <p className="text-white/30 text-xs">
                  {step === "success" ? "Запросы начислены" : freeRequestsLeft > 0 ? `Осталось ${freeRequestsLeft} бесплатных` : "Бесплатные запросы закончились"}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
              <Icon name="X" size={14} />
            </button>
          </div>

          <div className="px-5 py-5 flex flex-col gap-4">

            {/* ── Шаг 1: Выбор пакета ── */}
            {step === "packages" && (
              <>
                <div className="flex flex-col gap-2">
                  {PACKAGES.map(pkg => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg)}
                      className={`relative flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                        selectedPkg.id === pkg.id
                          ? "border-[#f59e0b]/50 bg-[#f59e0b]/[0.08]"
                          : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05]"
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2 right-3 text-[10px] font-bold text-[#f59e0b] bg-[#f59e0b]/10 border border-[#f59e0b]/30 px-2 py-0.5 rounded-full">
                          Популярный
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedPkg.id === pkg.id ? "border-[#f59e0b]" : "border-white/20"
                        }`}>
                          {selectedPkg.id === pkg.id && (
                            <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="text-white/80 text-sm font-semibold">{pkg.requests} запросов</div>
                          <div className="text-white/30 text-xs">{pkg.label}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-bold text-sm">{pkg.price.toLocaleString("ru")} ₽</div>
                        <div className="text-white/25 text-xs">{Math.round(pkg.price / pkg.requests)} ₽/запрос</div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setStep("form")}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ef4444] text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  Оплатить через СБП
                  <Icon name="ArrowRight" size={15} />
                </button>

                {/* Восстановить баланс */}
                <button
                  onClick={() => setShowRestore(p => !p)}
                  className="text-white/25 text-xs text-center hover:text-white/50 transition-colors"
                >
                  Уже оплачивали? Восстановить баланс по email
                </button>
                {showRestore && (
                  <div className="flex flex-col gap-2">
                    <input
                      type="email"
                      value={restoreEmail}
                      onChange={e => { setRestoreEmail(e.target.value); setRestoreMsg(""); }}
                      placeholder="ваш@email.ru"
                      className="w-full h-10 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 text-white/80 text-sm placeholder:text-white/20 outline-none focus:border-[#f59e0b]/40 transition-colors"
                    />
                    {restoreMsg && (
                      <p className={`text-xs ${restoreMsg.startsWith("✓") ? "text-emerald-400" : "text-red-400"}`}>{restoreMsg}</p>
                    )}
                    <button
                      onClick={handleRestore}
                      disabled={restoreLoading}
                      className="w-full h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                    >
                      {restoreLoading ? "Проверяю..." : "Восстановить"}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── Шаг 2: Форма email/телефон ── */}
            {step === "form" && (
              <>
                <div className="flex items-center gap-2 p-3 bg-[#f59e0b]/[0.06] border border-[#f59e0b]/20 rounded-xl">
                  <Icon name="Package" size={14} className="text-[#f59e0b] shrink-0" />
                  <span className="text-[#f59e0b]/80 text-xs">{selectedPkg.requests} запросов — {selectedPkg.price.toLocaleString("ru")} ₽</span>
                  <button onClick={() => setStep("packages")} className="ml-auto text-white/25 hover:text-white/50 text-xs">изменить</button>
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-white/40 text-xs font-medium uppercase tracking-wider block mb-1.5">Email для чека</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                      placeholder="ваш@email.ru"
                      className={`w-full h-10 bg-white/[0.04] border rounded-xl px-3 text-white/80 text-sm placeholder:text-white/20 outline-none transition-colors ${emailError ? "border-red-500/50" : "border-white/[0.08] focus:border-[#f59e0b]/40"}`}
                    />
                    {emailError && <p className="text-red-400 text-xs mt-1">{emailError}</p>}
                  </div>
                  <div>
                    <label className="text-white/40 text-xs font-medium uppercase tracking-wider block mb-1.5">Телефон (необязательно)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+7 900 000 00 00"
                      className="w-full h-10 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 text-white/80 text-sm placeholder:text-white/20 outline-none focus:border-[#f59e0b]/40 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setStep("packages")} className="h-11 px-4 rounded-xl border border-white/[0.08] text-white/40 text-sm hover:bg-white/[0.04] transition-colors">
                    Назад
                  </button>
                  <button
                    onClick={handlePay}
                    disabled={loading}
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ef4444] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {loading ? <><Icon name="Loader" size={15} className="animate-spin" /> Создаю платёж...</> : <>Перейти к оплате СБП <Icon name="ArrowRight" size={15} /></>}
                  </button>
                </div>
              </>
            )}

            {/* ── Шаг 3: QR / ожидание оплаты ── */}
            {step === "qr" && paymentResult && (
              <>
                {paymentResult.test_mode ? (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Icon name="TestTube" size={24} className="text-amber-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-white/70 font-semibold text-sm mb-1">Тестовый режим</p>
                      <p className="text-white/30 text-xs leading-relaxed">API-ключ Т-Бизнес ещё не добавлен. Нажми кнопку чтобы симулировать оплату.</p>
                    </div>
                    <div className="w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center">
                      <p className="text-white/40 text-xs">Пакет: {paymentResult.package}</p>
                      <p className="text-white font-bold mt-0.5">{paymentResult.amount_rub.toLocaleString("ru")} ₽</p>
                    </div>
                    <button
                      onClick={handleTestConfirm}
                      disabled={loading}
                      className="w-full h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                    >
                      {loading ? <Icon name="Loader" size={15} className="animate-spin" /> : <Icon name="CheckCircle" size={15} />}
                      Симулировать оплату
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <p className="text-white/50 text-xs">Ожидаем оплату...</p>
                    </div>
                    {paymentResult.sbp_payload && (
                      <div className="w-full flex flex-col gap-2">
                        <p className="text-white/40 text-xs text-center">Скопируйте ссылку и откройте в банковском приложении</p>
                        <button
                          onClick={copySbp}
                          className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 text-sm flex items-center justify-center gap-2 hover:bg-white/[0.08] transition-colors"
                        >
                          <Icon name={copiedSbp ? "Check" : "Copy"} size={15} className={copiedSbp ? "text-emerald-400" : ""} />
                          {copiedSbp ? "Скопировано!" : "Скопировать ссылку СБП"}
                        </button>
                      </div>
                    )}
                    <div className="w-full p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-center">
                      <p className="text-white/40 text-xs">Сумма к оплате</p>
                      <p className="text-white font-bold text-lg mt-0.5">{paymentResult.amount_rub.toLocaleString("ru")} ₽</p>
                      <p className="text-white/30 text-xs mt-0.5">{paymentResult.package}</p>
                    </div>
                    <p className="text-white/20 text-xs text-center">Страница обновится автоматически после оплаты</p>
                  </div>
                )}
              </>
            )}

            {/* ── Шаг 4: Успех ── */}
            {step === "success" && paymentResult && (
              <div className="flex flex-col items-center gap-4 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 15 }}
                  className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"
                >
                  <Icon name="CheckCircle" size={32} className="text-emerald-400" />
                </motion.div>
                <div className="text-center">
                  <p className="text-white font-bold text-base mb-1">Оплата прошла!</p>
                  <p className="text-emerald-400 font-semibold text-sm">+{paymentResult.requests_count} запросов начислено</p>
                  <p className="text-white/30 text-xs mt-1">Квитанция отправлена на {email}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ef4444] text-white font-bold text-sm"
                >
                  Отлично, продолжить!
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
