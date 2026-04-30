import { motion } from "framer-motion";
import Icon from "@/components/ui/icon";

interface Props {
  status: "idle" | "generating" | "done" | "error";
  cycleLabel?: string;
  onNewProject?: () => void;
  onExport?: () => void;
  onExportSource?: () => void;
  exportingSource?: boolean;
  selfEditActive?: boolean;
  onSettings: () => void;
  onLogout: () => void;
}

const STATUS_MAP = {
  idle:       { dot: "bg-zinc-500",                  text: "text-zinc-400" },
  generating: { dot: "bg-[#f59e0b] animate-pulse",   text: "text-[#f59e0b]" },
  done:       { dot: "bg-emerald-400",               text: "text-emerald-400" },
  error:      { dot: "bg-red-500",                   text: "text-red-400" },
};

export default function LumenTopBar({ status, cycleLabel, selfEditActive, onSettings, onLogout }: Props) {
  const s = STATUS_MAP[status];

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`h-11 flex items-center justify-between px-3 border-b bg-[#07070c]/90 backdrop-blur-xl z-50 shrink-0 min-w-0 transition-colors ${
        selfEditActive ? "border-amber-500/30" : "border-[#f59e0b]/20"
      }`}
    >
      {/* Left — Logo + status */}
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center shadow-[0_0_8px_#f59e0b80] text-sm">
            🐜
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Муравей</span>
          <span className="hidden lg:inline text-white/20 text-[10px] font-medium tracking-wider ml-1">— AI-разработчик сайтов</span>
        </div>

        <div className="hidden sm:block w-px h-4 bg-white/10 shrink-0" />

        {/* Cycle status label */}
        <div className="hidden sm:flex items-center gap-1.5 min-w-0 overflow-hidden">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className={`text-xs font-medium truncate ${s.text}`}>
            {cycleLabel || (status === "idle" ? "Готов" : status === "generating" ? "Обработка..." : status === "done" ? "Готово" : "Ошибка")}
          </span>
        </div>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {selfEditActive && (
          <div className="hidden sm:flex items-center gap-1.5 h-6 px-2.5 rounded-md bg-amber-500/10 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-[10px] font-semibold">Self-Edit</span>
          </div>
        )}
        <button
          onClick={onSettings}
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
        >
          <Icon name="Settings" size={14} />
        </button>

        <button
          onClick={onLogout}
          title="Выйти"
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
        >
          <Icon name="LogOut" size={13} />
        </button>
      </div>
    </motion.header>
  );
}