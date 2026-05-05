import React from 'react';
import { motion } from 'framer-motion';
import Icon from '@/components/ui/icon';

interface CoreDashboardProps {
  onOpenSettings: () => void;
}

const cardStyle = "flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6 text-center text-white/80 hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer";
const cardIcon = "w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-amber-400";

const CoreDashboard = ({ onOpenSettings }: CoreDashboardProps) => {
  const coreFeatures = [
    { name: 'База данных', icon: 'Database', action: () => alert('Управление базой данных (в разработке)') },
    { name: 'Функции', icon: 'Zap', action: () => alert('Управление серверными функциями (в разработке)') },
    { name: 'Секреты', icon: 'Key', action: onOpenSettings },
    { name: 'Хранилище', icon: 'Folder', action: () => alert('Управление файлами (в разработке)') },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="h-full w-full p-4 md:p-6 overflow-y-auto"
    >
      <div className="mb-6 px-2">
        <h1 className="text-2xl font-bold text-white">Ядро проекта</h1>
        <p className="text-white/40">Управление бэкенд-компонентами вашего приложения.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {coreFeatures.map((feature) => (
          <button key={feature.name} onClick={feature.action} className={cardStyle}>
            <div className={cardIcon}>
              <Icon name={feature.icon as any} size={24} />
            </div>
            <span className="font-semibold text-sm mt-2">{feature.name}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default CoreDashboard;
