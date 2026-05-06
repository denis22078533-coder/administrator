
import { motion } from "framer-motion";
import Icon from "@/components/ui/icon";

export type Tab = "home" | "chat" | "core" | "projects" | "profile";

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  isAdmin: boolean; // <-- Added isAdmin prop
}

interface NavItemProps {
  id: Tab;
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ id, label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs transition-colors ${
      active ? "text-[#f59e0b]" : "text-white/40 hover:text-white/70"
    }`}
  >
    <span className="text-2xl">{icon}</span>
    <span className="font-medium">{label}</span>
  </button>
);

export default function BottomNav({ active, onChange, isAdmin }: BottomNavProps) {
  const navItems: { id: Tab; label: string; icon: string; adminOnly: boolean }[] = [
    { id: "home", label: "Главная", icon: "🏠", adminOnly: false },
    { id: "chat", label: "Чат", icon: "💬", adminOnly: false },
    { id: "core", label: "Ядро", icon: "☢️", adminOnly: true },
    { id: "projects", label: "Проекты", icon: "📂", adminOnly: false },
    { id: "profile", label: "Профиль", icon: "👤", adminOnly: false },
  ];

  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.2 }}
      className="shrink-0 flex items-stretch bg-[#0a0a0f] border-t border-white/[0.06] shadow-[0_-4px_20px_rgba(0,0,0,0.2)]"
    >
      {filteredItems.map(item => (
        <NavItem
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          active={active === item.id}
          onClick={() => onChange(item.id)}
        />
      ))}
    </motion.div>
  );
}
