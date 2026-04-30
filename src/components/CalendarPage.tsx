import { useState } from "react";
import Icon from "@/components/ui/icon";

const MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

const SCHEDULE = [
  {
    month: "АПРЕЛЬ 2026",
    monthIdx: 3,
    events: [
      { day: "12", dayName: "Вс", title: "Светлоградский эндуро-марафон", location: "Светлоград", sport: "Эндуро", status: "live", time: "09:00" },
      { day: "19", dayName: "Вс", title: "Открытые соревн. по мотокроссу", location: "Невинномысск", sport: "Мотокросс", status: "upcoming", time: "10:00" },
      { day: "26", dayName: "Вс", title: "Ралли-спринт «Весенний Ставрополь»", location: "Ставрополь", sport: "Ралли", status: "upcoming", time: "11:00" },
    ]
  },
  {
    month: "МАЙ 2026",
    monthIdx: 4,
    events: [
      { day: "03", dayName: "Вс", title: "Кубок Ставрополья — Мотокросс (Этап I)", location: "Ставрополь", sport: "Мотокросс", status: "upcoming", time: "10:00" },
      { day: "10", dayName: "Вс", title: "Кросс-кантри «Предгорье» (любит.)", location: "Пятигорск", sport: "Кросс-кантри", status: "upcoming", time: "09:30" },
      { day: "17", dayName: "Сб", title: "Ралли «Кубанские просторы» — СУ 1–2", location: "Армавир", sport: "Ралли", status: "upcoming", time: "10:00" },
      { day: "18", dayName: "Вс", title: "Ралли «Кубанские просторы» — Финал", location: "Армавир", sport: "Ралли", status: "upcoming", time: "14:00" },
      { day: "24", dayName: "Вс", title: "Мотокросс СКФО (Этап II)", location: "Буйнакск", sport: "Мотокросс", status: "upcoming", time: "10:30" },
    ]
  },
  {
    month: "ИЮНЬ 2026",
    monthIdx: 5,
    events: [
      { day: "07", dayName: "Вс", title: "Ночной дрифт — Краснодар (Этап I)", location: "Краснодар", sport: "Дрифт", status: "upcoming", time: "20:00" },
      { day: "13", dayName: "Сб", title: "Эндуро «Кавказ Трофи» (командный)", location: "Лермонтов, КМВ", sport: "Эндуро", status: "upcoming", time: "08:00" },
      { day: "14", dayName: "Вс", title: "Кубок Ставрополья — Мотокросс (Этап II)", location: "Михайловск", sport: "Мотокросс", status: "upcoming", time: "10:00" },
      { day: "28", dayName: "Вс", title: "Эндуро-спринт «Степной ветер»", location: "Будённовск", sport: "Эндуро", status: "upcoming", time: "09:00" },
      { day: "29", dayName: "Пн", title: "Эндуро-спринт — День 2 / Награждение", location: "Будённовск", sport: "Эндуро", status: "upcoming", time: "10:00" },
    ]
  },
  {
    month: "ИЮЛЬ 2026",
    monthIdx: 6,
    events: [
      { day: "05", dayName: "Вс", title: "Мотокросс СКФО (Этап III)", location: "Ставрополь", sport: "Мотокросс", status: "upcoming", time: "10:00" },
      { day: "12", dayName: "Вс", title: "Ночной дрифт — Краснодар (Этап II)", location: "Краснодар", sport: "Дрифт", status: "upcoming", time: "20:00" },
      { day: "19", dayName: "Вс", title: "Кросс-кантри «Кавказские холмы»", location: "Кисловодск", sport: "Кросс-кантри", status: "upcoming", time: "09:30" },
    ]
  },
  {
    month: "АВГУСТ 2026",
    monthIdx: 7,
    events: [
      { day: "08", dayName: "Сб", title: "Ралли «Чёрное море — Кубань» (СУ 1)", location: "Новороссийск", sport: "Ралли", status: "upcoming", time: "09:00" },
      { day: "09", dayName: "Вс", title: "Ралли «Чёрное море — Кубань» (Финал)", location: "Геленджик", sport: "Ралли", status: "upcoming", time: "13:00" },
      { day: "23", dayName: "Вс", title: "Кубок СКФО по мотокроссу — Финал", location: "Светлоград", sport: "Мотокросс", status: "upcoming", time: "10:00" },
    ]
  },
  {
    month: "СЕНТЯБРЬ 2026",
    monthIdx: 8,
    events: [
      { day: "06", dayName: "Вс", title: "Эндуро «Осенний Ставрополь»", location: "Изобильный", sport: "Эндуро", status: "upcoming", time: "09:00" },
      { day: "13", dayName: "Вс", title: "Ралли «Анапский берег»", location: "Анапа", sport: "Ралли", status: "upcoming", time: "10:00" },
      { day: "27", dayName: "Вс", title: "Финал Кубка Краснодарского кр. по дрифту", location: "Краснодар", sport: "Дрифт", status: "upcoming", time: "18:00" },
    ]
  },
  {
    month: "ОКТЯБРЬ 2026",
    monthIdx: 9,
    events: [
      { day: "04", dayName: "Вс", title: "Мотокросс — Закрытие сезона СКФО", location: "Ставрополь", sport: "Мотокросс", status: "upcoming", time: "10:00" },
      { day: "18", dayName: "Вс", title: "Мотофест Кубань — Закрытие сезона", location: "Краснодар", sport: "Дрифт", status: "upcoming", time: "16:00" },
    ]
  },
];

const sportColors: Record<string, string> = {
  Эндуро: "bg-fire text-white",
  Мотокросс: "bg-orange-600 text-white",
  Ралли: "bg-yellow-600 text-white",
  Дрифт: "bg-purple-700 text-white",
  "Кросс-кантри": "bg-green-700 text-white",
};

export default function CalendarPage() {
  const [activeMonth, setActiveMonth] = useState(3);

  const filtered = SCHEDULE.filter(s => s.monthIdx === activeMonth);
  const display = filtered.length > 0 ? filtered : SCHEDULE;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-oswald text-2xl font-bold tracking-widest text-white">КАЛЕНДАРЬ</h1>
          <p className="text-muted-foreground text-xs font-roboto mt-0.5">Ставрополье и Кубань · 2026</p>
        </div>
        <div className="flex items-center gap-1.5 bg-fire/10 border border-fire/30 px-3 py-1.5 rounded-lg">
          <Icon name="MapPin" size={13} className="text-fire" />
          <span className="text-fire text-xs font-oswald font-bold">СКФО · ЮФО</span>
        </div>
      </div>

      {/* Month scroll */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {MONTHS.map((m, i) => {
          const hasEvents = SCHEDULE.some(s => s.monthIdx === i);
          return (
            <button
              key={m}
              onClick={() => setActiveMonth(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-oswald font-semibold tracking-wide transition-colors relative ${
                activeMonth === i
                  ? "fire-gradient text-white"
                  : "bg-secondary text-muted-foreground hover:text-white"
              }`}
            >
              {m}
              {hasEvents && activeMonth !== i && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-fire rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
        {Object.entries(sportColors).map(([sport, cls]) => (
          <span key={sport} className={`flex-shrink-0 ${cls} text-[10px] font-oswald font-bold px-2 py-0.5 rounded tracking-wider`}>
            {sport}
          </span>
        ))}
      </div>

      {/* Schedule */}
      <div className="px-4 flex flex-col gap-6">
        {display.map((section) => (
          <div key={section.month}>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-oswald text-fire font-bold tracking-widest text-sm">{section.month}</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-roboto">{section.events.length} событий</span>
            </div>

            <div className="flex flex-col gap-2">
              {section.events.map((ev, i) => (
                <div
                  key={i}
                  className={`animate-fade-in opacity-0 stagger-${Math.min(i + 1, 5)} flex gap-3 items-stretch cursor-pointer group`}
                >
                  <div className={`flex-shrink-0 w-12 rounded-xl flex flex-col items-center justify-center py-2 ${ev.status === 'live' ? 'fire-gradient' : 'bg-secondary'}`}>
                    <span className="font-oswald font-bold text-xl text-white leading-none">{ev.day}</span>
                    <span className={`text-xs font-roboto ${ev.status === 'live' ? 'text-white/80' : 'text-muted-foreground'}`}>{ev.dayName}</span>
                  </div>

                  <div className={`flex-1 rounded-xl p-3 border ${ev.status === 'live' ? 'border-fire/30 bg-fire/5' : 'border-border bg-card'} group-hover:border-fire/40 transition-colors`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-oswald font-bold px-1.5 py-0.5 rounded tracking-wider ${sportColors[ev.sport] || 'bg-secondary text-white'}`}>
                            {ev.sport}
                          </span>
                          {ev.status === 'live' && (
                            <span className="flex items-center gap-1 text-red-500 text-xs font-oswald font-bold">
                              <span className="w-1.5 h-1.5 bg-red-500 rounded-full live-pulse" />
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-white text-sm font-roboto font-medium leading-tight">{ev.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 text-muted-foreground text-xs font-roboto">
                            <Icon name="MapPin" size={11} />
                            {ev.location}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground text-xs font-roboto">
                            <Icon name="Clock" size={11} />
                            {ev.time}
                          </span>
                        </div>
                      </div>
                      <button className="text-muted-foreground hover:text-fire transition-colors mt-0.5 flex-shrink-0">
                        <Icon name="BellPlus" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
