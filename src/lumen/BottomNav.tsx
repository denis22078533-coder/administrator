import { motion } from "framer-motion";
import Icon from "@/components/ui/icon";

type Tab = "home" | "chat" | "core" | "projects" | "profile";

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "home", label: "Главная", icon: "Home" },
  { id: "chat", label: "Чат", icon: "MessageCircle" },
  { id: "core", label: "Ядро", icon: "LayoutGrid" },
  { id: "projects", label: "Проекты", icon: "Folder" },
  { id: "profile", label: "Профиль", icon: "User" },
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
            className="flex-1 flex flex-col items-center justify-center gap-1 h-full relative"
          >
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#ef4444]"
              />
            )}
            <motion.div animate={{ scale: isActive ? 1.05 : 1 }}>
              <Icon
                name={tab.icon}
                size={22}
                className={`transition-colors ${isActive ? "text-white" : "text-white/40"}`}
              />
            </motion.div>
            <span className={`text-[10px] font-semibold transition-colors ${isActive ? "text-[#f59e0b]" : "text-white/40"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { Tab };
