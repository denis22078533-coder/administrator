import { useState } from "react";
import Icon from "@/components/ui/icon";

const IMG = {
  enduro: "https://cdn.poehali.dev/projects/4fe9d363-5216-44d6-8799-40a6f4aeed69/files/6cac6f42-ec5a-4ad6-a962-e9384f9e056e.jpg",
  rally: "https://cdn.poehali.dev/projects/4fe9d363-5216-44d6-8799-40a6f4aeed69/files/79fd5643-459c-43a9-9578-3639ce4e9954.jpg",
  moto: "https://cdn.poehali.dev/projects/4fe9d363-5216-44d6-8799-40a6f4aeed69/files/261e0c1d-6fba-4873-aca3-cd686acca29f.jpg",
  drift: "https://cdn.poehali.dev/projects/4fe9d363-5216-44d6-8799-40a6f4aeed69/files/670c0f28-b4a8-4b70-8041-7d46e85ab49b.jpg",
};

const CATEGORIES = ["Все", "Эндуро", "Мотокросс", "Ралли", "Дрифт", "Кросс-кантри"];

const ALL_EVENTS = [
  {
    id: 1,
    title: "Светлоградский эндуро-марафон",
    sport: "Эндуро",
    date: "12 апр 2026",
    location: "Светлоград, Ставропольский кр.",
    status: "live",
    statusText: "LIVE",
    participants: "84 гонщика",
    image: IMG.enduro,
    viewers: "2.4K",
    desc: "Открытый чемпионат СКФО по эндуро",
  },
  {
    id: 2,
    title: "Кубок Ставрополья — Мотокросс",
    sport: "Мотокросс",
    date: "3 мая 2026",
    location: "Ставрополь, трасса «Степная»",
    status: "upcoming",
    statusText: "СКОРО",
    participants: "60 гонщиков",
    image: IMG.moto,
    viewers: null,
    desc: "Этап I краевого кубка по мотокроссу среди взрослых и юниоров",
  },
  {
    id: 3,
    title: "Ралли «Кубанские просторы»",
    sport: "Ралли",
    date: "17–18 мая 2026",
    location: "Армавир, Краснодарский кр.",
    status: "upcoming",
    statusText: "СКОРО",
    participants: "45 экипажей",
    image: IMG.rally,
    viewers: null,
    desc: "Ежегодное ралли по дорогам Кубани — 3 СУ, общий зачёт 240 км",
  },
  {
    id: 4,
    title: "Ночной дрифт — Краснодар",
    sport: "Дрифт",
    date: "7 июня 2026",
    location: "Краснодар, автодром «Южный»",
    status: "upcoming",
    statusText: "СКОРО",
    participants: "32 пилота",
    image: IMG.drift,
    viewers: null,
    desc: "Финал краевых соревнований по дрифту при свете прожекторов",
  },
  {
    id: 5,
    title: "Эндуро-спринт «Степной ветер»",
    sport: "Эндуро",
    date: "28–29 июня 2026",
    location: "Будённовск, Ставропольский кр.",
    status: "upcoming",
    statusText: "СКОРО",
    participants: "70 гонщиков",
    image: IMG.enduro,
    viewers: null,
    desc: "Скоростной спринт по степным тропам Будённовского района",
  },
  {
    id: 6,
    title: "Кросс-кантри «Кавказские холмы»",
    sport: "Кросс-кантри",
    date: "19 июля 2026",
    location: "Кисловодск, предгорье КМВ",
    status: "upcoming",
    statusText: "СКОРО",
    participants: "38 экипажей",
    image: IMG.rally,
    viewers: null,
    desc: "Горная гонка с набором высоты у Кавказских Минеральных Вод",
  },
  {
    id: 7,
    title: "Кубок СКФО по мотокроссу — Финал",
    sport: "Мотокросс",
    date: "23 авг 2026",
    location: "Светлоград, Ставропольский кр.",
    status: "upcoming",
    statusText: "СКОРО",
    participants: "90 гонщиков",
    image: IMG.moto,
    viewers: null,
    desc: "Финальный этап чемпионата СКФО: взрослые, юниоры, женщины",
  },
  {
    id: 8,
    title: "Ралли «Анапский берег»",
    sport: "Ралли",
    date: "13 сент 2026",
    location: "Анапа, Краснодарский кр.",
    status: "upcoming",
    statusText: "СКОРО",
    participants: "28 экипажей",
    image: IMG.rally,
    viewers: null,
    desc: "Гравийное ралли вдоль черноморского побережья — 2 спецучастка",
  },
  {
    id: 9,
    title: "Закрытие сезона — Мотофест Кубань",
    sport: "Дрифт",
    date: "18 окт 2026",
    location: "Краснодар, стадион «Кубань»",
    status: "upcoming",
    statusText: "СКОРО",
    participants: "50+ пилотов",
    image: IMG.drift,
    viewers: null,
    desc: "Гала-фестиваль закрытия сезона: дрифт, шоу-программа, награждение",
  },
];

const statusConfig: Record<string, { bg: string; text: string }> = {
  live: { bg: "bg-red-600", text: "text-white" },
  upcoming: { bg: "bg-fire/20 border border-fire/40", text: "text-fire" },
  finished: { bg: "bg-secondary", text: "text-muted-foreground" },
};

export default function EventsPage() {
  const [activeCategory, setActiveCategory] = useState("Все");

  const filtered = activeCategory === "Все"
    ? ALL_EVENTS
    : ALL_EVENTS.filter(e => e.sport === activeCategory);

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <h1 className="font-oswald text-2xl font-bold tracking-widest text-white">МЕРОПРИЯТИЯ</h1>
        <p className="text-muted-foreground text-xs font-roboto mt-0.5">Ставрополье и Кубань · Сезон 2026</p>
      </div>

      {/* Filter tabs */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-oswald font-semibold tracking-wide transition-colors ${
              activeCategory === cat
                ? "fire-gradient text-white"
                : "bg-secondary text-muted-foreground hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Count */}
      <div className="px-4 mb-2">
        <span className="text-muted-foreground text-xs font-roboto">{filtered.length} событий</span>
      </div>

      {/* Events grid */}
      <div className="px-4 flex flex-col gap-3">
        {filtered.map((ev, i) => {
          const cfg = statusConfig[ev.status];
          return (
            <div
              key={ev.id}
              className={`animate-fade-in stagger-${Math.min(i + 1, 5)} opacity-0 rounded-xl overflow-hidden bg-card border border-border card-hover cursor-pointer`}
            >
              <div className="relative h-40 overflow-hidden">
                <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

                <div className="absolute top-3 left-3">
                  <span className={`${cfg.bg} ${cfg.text} text-xs font-oswald font-bold px-2 py-1 rounded tracking-wider flex items-center gap-1.5`}>
                    {ev.status === "live" && <span className="w-1.5 h-1.5 bg-white rounded-full live-pulse" />}
                    {ev.statusText}
                  </span>
                </div>

                {ev.viewers && (
                  <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded flex items-center gap-1">
                    <Icon name="Eye" size={12} className="text-white/70" />
                    <span className="text-white text-xs font-roboto">{ev.viewers}</span>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <span className="text-fire text-xs font-oswald font-bold tracking-wider">{ev.sport.toUpperCase()}</span>
                  <h3 className="font-oswald text-white text-lg font-bold leading-tight mt-0.5">{ev.title}</h3>
                  <p className="text-white/70 text-xs font-roboto mt-0.5 line-clamp-1">{ev.desc}</p>
                </div>
              </div>

              <div className="p-3 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon name="MapPin" size={13} />
                    <span className="text-xs font-roboto">{ev.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon name="Calendar" size={13} />
                    <span className="text-xs font-roboto">{ev.date}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <Icon name="Users" size={13} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-roboto">{ev.participants}</span>
                  </div>
                  <button className="flex items-center gap-1 text-fire text-xs font-oswald font-bold hover:opacity-70 transition-opacity">
                    <Icon name="BellPlus" size={13} />
                    Напомнить
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
