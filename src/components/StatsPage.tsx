import Icon from "@/components/ui/icon";

const STANDINGS_MOTO = [
  { pos: 1, name: "М. Маркес", team: "Ducati", points: 148, flag: "🇪🇸", change: "=" },
  { pos: 2, name: "Ф. Баньяя", team: "Ducati", points: 131, flag: "🇮🇹", change: "▲" },
  { pos: 3, name: "Х. Мартин", team: "Aprilia", points: 122, flag: "🇪🇸", change: "▼" },
  { pos: 4, name: "Э. Бастьянини", team: "KTM", points: 98, flag: "🇮🇹", change: "▲" },
  { pos: 5, name: "А. Эспаргаро", team: "Honda", points: 87, flag: "🇪🇸", change: "=" },
];

const STANDINGS_F1 = [
  { pos: 1, name: "М. Верстаппен", team: "Red Bull", points: 219, flag: "🇳🇱", change: "=" },
  { pos: 2, name: "Ш. Леклер", team: "Ferrari", points: 185, flag: "🇲🇨", change: "▲" },
  { pos: 3, name: "Л. Норрис", team: "McLaren", points: 176, flag: "🇬🇧", change: "▼" },
  { pos: 4, name: "К. Сайнс", team: "Ferrari", points: 156, flag: "🇪🇸", change: "=" },
  { pos: 5, name: "Л. Хэмилтон", team: "Mercedes", points: 138, flag: "🇬🇧", change: "▼" },
];

const STATS_CARDS = [
  { label: "Мероприятий сезона", value: "21", icon: "Flag", color: "text-fire" },
  { label: "Гонщиков всего", value: "142", icon: "Users", color: "text-blue-400" },
  { label: "Трасс в 41 стране", value: "41", icon: "MapPin", color: "text-green-400" },
  { label: "Зрители онлайн", value: "2.4M", icon: "Eye", color: "text-purple-400" },
];

export default function StatsPage() {
  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <h1 className="font-oswald text-2xl font-bold tracking-widest text-white">СТАТИСТИКА</h1>
        <p className="text-muted-foreground text-xs font-roboto mt-0.5">Турнирные таблицы сезона 2024</p>
      </div>

      {/* Quick stats */}
      <div className="px-4 pt-3 grid grid-cols-2 gap-2">
        {STATS_CARDS.map((stat, i) => (
          <div key={i} className={`animate-fade-in stagger-${i + 1} opacity-0 bg-card border border-border rounded-xl p-3 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-lg bg-secondary flex items-center justify-center ${stat.color}`}>
              <Icon name={stat.icon} size={20} />
            </div>
            <div>
              <p className={`font-oswald font-bold text-xl ${stat.color}`}>{stat.value}</p>
              <p className="text-muted-foreground text-xs font-roboto leading-tight">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* MotoGP Standings */}
      <div className="px-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🏍️</span>
          <span className="font-oswald font-bold text-white tracking-wider">MotoGP — ЧЕМПИОНАТ</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in stagger-2 opacity-0">
          <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
            <span className="text-xs text-muted-foreground font-oswald tracking-wider">ГОНЩИК</span>
            <span className="text-xs text-muted-foreground font-oswald tracking-wider">ОЧКИ</span>
          </div>
          {STANDINGS_MOTO.map((p) => (
            <div key={p.pos} className={`flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-b-0 ${p.pos === 1 ? 'bg-fire/5' : ''}`}>
              <span className={`w-6 font-oswald font-bold text-sm ${p.pos === 1 ? 'text-fire' : 'text-muted-foreground'}`}>
                {p.pos}
              </span>
              <span className="text-lg">{p.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-roboto font-medium">{p.name}</p>
                <p className="text-muted-foreground text-xs font-roboto">{p.team}</p>
              </div>
              <span className={`text-xs font-bold mr-1 ${p.change === '▲' ? 'text-green-500' : p.change === '▼' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {p.change}
              </span>
              <span className={`font-oswald font-bold text-base ${p.pos === 1 ? 'text-fire' : 'text-white'}`}>
                {p.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* F1 Standings */}
      <div className="px-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🏎️</span>
          <span className="font-oswald font-bold text-white tracking-wider">ФОРМУЛА 1 — ЧЕМПИОНАТ</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in stagger-3 opacity-0">
          <div className="flex items-center justify-between px-3 py-2 bg-secondary/50 border-b border-border">
            <span className="text-xs text-muted-foreground font-oswald tracking-wider">ПИЛОТ</span>
            <span className="text-xs text-muted-foreground font-oswald tracking-wider">ОЧКИ</span>
          </div>
          {STANDINGS_F1.map((p) => (
            <div key={p.pos} className={`flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-b-0 ${p.pos === 1 ? 'bg-fire/5' : ''}`}>
              <span className={`w-6 font-oswald font-bold text-sm ${p.pos === 1 ? 'text-fire' : 'text-muted-foreground'}`}>
                {p.pos}
              </span>
              <span className="text-lg">{p.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-roboto font-medium">{p.name}</p>
                <p className="text-muted-foreground text-xs font-roboto">{p.team}</p>
              </div>
              <span className={`text-xs font-bold mr-1 ${p.change === '▲' ? 'text-green-500' : p.change === '▼' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {p.change}
              </span>
              <span className={`font-oswald font-bold text-base ${p.pos === 1 ? 'text-fire' : 'text-white'}`}>
                {p.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Last Race Result */}
      <div className="px-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-oswald font-bold text-fire tracking-wider text-sm">🏆 ПОСЛЕДНЯЯ ГОНКА</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <div className="bg-card border border-border rounded-xl p-3 animate-fade-in stagger-4 opacity-0">
          <p className="font-oswald text-white font-bold">MotoGP — Гран-При Испании</p>
          <p className="text-muted-foreground text-xs font-roboto mt-0.5 mb-3">Херес, 26 мая 2024</p>
          {[
            { place: "🥇", name: "М. Маркес", time: "40:12.643", gap: "Победитель" },
            { place: "🥈", name: "Ф. Баньяя", time: "40:14.201", gap: "+1.558" },
            { place: "🥉", name: "Х. Мартин", time: "40:16.887", gap: "+4.244" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-t border-border/50">
              <span className="text-xl">{r.place}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-roboto font-medium">{r.name}</p>
                <p className="text-muted-foreground text-xs font-roboto">{r.time}</p>
              </div>
              <span className={`text-sm font-oswald font-bold ${i === 0 ? 'text-fire' : 'text-muted-foreground'}`}>{r.gap}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}