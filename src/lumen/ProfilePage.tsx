
import { motion } from "framer-motion";
import Icon from "@/components/ui/icon";

interface ProfilePageProps {
  onLogout: () => void;
}

export default function ProfilePage({ onLogout }: ProfilePageProps) {
  return (
    <motion.div 
      key="profile" 
      initial={{ opacity: 0, y: 16 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -8 }} 
      transition={{ duration: 0.25 }} 
      className="h-full w-full overflow-y-auto p-4 md:p-8"
    >
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-4xl shadow-[0_0_30px_#f59e0b40]">
            🐜
          </div>
          <div>
            <h1 className="text-white font-bold text-2xl">Профиль</h1>
            <p className="text-white/50">Настройки вашего аккаунта</p>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
            <h2 className="text-white font-semibold mb-4">Основная информация</h2>
            <p className="text-white/60 text-sm mb-6">Эта информация видна только вам.</p>
            
            <div className="flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                    <span className="text-white/80">Имя пользователя</span>
                    <span className="text-white font-medium">Разработчик</span>
                </div>
                 <div className="flex items-center justify-between">
                    <span className="text-white/80">Баланс</span>
                    <span className="text-white font-medium">Безлимит</span>
                </div>
            </div>

            <button
                onClick={onLogout}
                className="mt-8 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 text-red-400 font-semibold rounded-lg hover:bg-red-600/30 transition-colors"
            >
                <Icon name="LogOut" size={16} />
                Выйти из аккаунта
            </button>
        </div>
      </div>
    </motion.div>
  );
}
