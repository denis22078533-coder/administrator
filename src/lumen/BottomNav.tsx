import { motion } from "framer-motion";

type Tab = "home" | "chat" | "projects" | "profile";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "home", label: "Главная", emoji: "🏠" },
  { id: "chat", label: "Чат", emoji: "🐜" },
  { id: "projects", label: "Проекты", emoji: "📁" },
  { id: "profile", label: "Профиль", emoji: "👤" },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <div className="shrink-0 h-16 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/[0.07] flex items-center px-2 safe-bottom z-50">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative"
          >
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#ef4444]"
              />
            )}
            <motion.span
              animate={{ scale: isActive ? 1.2 : 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="text-xl leading-none"
            >
              {tab.emoji}
            </motion.span>
            <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-[#f59e0b]" : "text-white/30"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { Tab };
