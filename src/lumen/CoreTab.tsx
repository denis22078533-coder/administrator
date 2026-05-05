import Icon from "@/components/ui/icon";

interface CoreTabProps {
  onOpenSettings: () => void;
}

export default function CoreTab({ onOpenSettings }: CoreTabProps) {
  const coreFeatures = [
    {
      name: "База данных",
      description: "Таблицы, миграции, SQL",
      icon: "Database",
      color: "text-cyan-400",
      action: () => alert("Управление базами данных скоро появится!"),
    },
    {
      name: "Функции",
      description: "Серверная логика, API",
      icon: "FunctionSquare",
      color: "text-emerald-400",
      action: () => alert("Редактор серверных функций скоро появится!"),
    },
    {
      name: "Секреты",
      description: "Ключи API, переменные",
      icon: "KeyRound",
      color: "text-amber-400",
      action: onOpenSettings,
    },
    {
      name: "Хранилище",
      description: "Файлы и изображения",
      icon: "HardDrive",
      color: "text-purple-400",
      action: () => alert("Файловое хранилище скоро появится!"),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] p-4">
      <div className="text-center mb-6">
        <h2 className="text-white font-semibold text-lg">Ядро проекта</h2>
        <p className="text-white/40 text-sm">Управление бэкенд-компонентами вашего приложения</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {coreFeatures.map((feature) => (
          <button
            key={feature.name}
            onClick={feature.action}
            className="bg-[#111118] border border-white/[0.08] rounded-xl p-4 flex flex-col items-start text-left hover:bg-white/[0.04] transition-colors duration-150"
          >
            <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center mb-3">
              <Icon name={feature.icon as any} size={18} className={feature.color} />
            </div>
            <h3 className="text-white font-semibold text-sm mb-0.5">{feature.name}</h3>
            <p className="text-white/30 text-xs">{feature.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
