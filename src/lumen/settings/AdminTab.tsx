import React from 'react';
import Icon from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch"; // Предполагаем, что у вас есть UI-компонент Switch

interface AdminTabProps {
  isTesterMode: boolean;
  onToggleTesterMode: () => void;
  onResetBalance: () => void;
  // TODO: Добавить пропсы для управления глобальными лимитами
}

export default function AdminTab({ isTesterMode, onToggleTesterMode, onResetBalance }: AdminTabProps) {
  return (
    <div className="flex flex-col gap-6 text-sm">
      
      {/* --- Секция режима тестировщика --- */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white/80">Режим Тестировщика</h3>
            <p className="text-white/40 text-xs mt-1">
              В этом режиме ваш админ-аккаунт будет использовать токены как обычный пользователь. 
              Это позволяет тестировать логику оплаты и окончания баланса.
            </p>
          </div>
          <Switch
            checked={isTesterMode}
            onCheckedChange={onToggleTesterMode}
            id="tester-mode-toggle"
          />
        </div>
      </div>

      {/* --- Секция управления балансом --- */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <h3 className="font-semibold text-white/80 mb-3">Управление балансом</h3>
        <div className="flex flex-col gap-3">
            <p className="text-white/40 text-xs">
              Эти кнопки предназначены для тестирования пользовательского опыта.
            </p>
            <button
                onClick={onResetBalance}
                className="w-full h-9 px-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
            >
                <Icon name="Zap" size={14} />
                Обнулить мой баланс
            </button>
        </div>
      </div>

      {/* --- Секция глобальных настроек (TODO) --- */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 opacity-50">
        <h3 className="font-semibold text-white/80 mb-2">Глобальные лимиты (в разработке)</h3>
        <p className="text-white/40 text-xs mb-4">
          Здесь будут настройки стартового бонуса для новых пользователей и глобальных лимитов.
        </p>
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <label className="text-white/60 text-xs">Стартовый бонус (токены)</label>
                <input type="number" defaultValue={20} disabled className="w-20 h-8 bg-white/[0.05] border border-white/10 rounded-md px-2 text-xs text-center"/>
            </div>
             <button disabled className="w-full h-9 px-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                <Icon name="Save" size={14} />
                Сохранить глобальные настройки
            </button>
        </div>
      </div>

    </div>
  );
}
