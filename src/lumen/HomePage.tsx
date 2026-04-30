import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onGoToChat: () => void;
  onGoToProjects: () => void;
  onGoToProfile: () => void;
}

const BANNERS = [
  {
    gradient: "from-[#7c3aed] via-[#4f46e5] to-[#0ea5e9]",
    emoji: "🌐",
    tag: "AI-разработка",
    title: "Сайты за минуты",
    subtitle: "Опишите идею — Муравей построит профессиональный сайт без единой строки кода",
    cta: "Попробовать бесплатно",
  },
  {
    gradient: "from-[#f59e0b] via-[#ef4444] to-[#ec4899]",
    emoji: "📱",
    tag: "Мобильные приложения",
    title: "Приложения любой сложности",
    subtitle: "От лендинга до полноценного веб-приложения с базой данных и API",
    cta: "Создать приложение",
  },
  {
    gradient: "from-[#10b981] via-[#059669] to-[#0d9488]",
    emoji: "🚀",
    tag: "Быстрый запуск",
    title: "От идеи до продакшна",
    subtitle: "GitHub, домен, SSL, хостинг — всё включено. Запустите бизнес сегодня",
    cta: "Запустить проект",
  },
  {
    gradient: "from-[#8b5cf6] via-[#d946ef] to-[#f43f5e]",
    emoji: "🎨",
    tag: "Красивый дизайн",
    title: "Дизайн который продаёт",
    subtitle: "ИИ создаёт современные интерфейсы с анимациями, картинками и уникальным стилем",
    cta: "Смотреть примеры",
  },
];

const FEATURES = [
  { emoji: "⚡", title: "Молниеносно", desc: "Сайт готов за 30 секунд" },
  { emoji: "🧠", title: "Умный ИИ", desc: "Понимает ваш бизнес" },
  { emoji: "🔒", title: "Надёжно", desc: "Хостинг и SSL включены" },
  { emoji: "📊", title: "Масштабируемо", desc: "Растёт вместе с вами" },
];

export default function HomePage({ onGoToChat, onGoToProjects, onGoToProfile }: Props) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrent(c => (c + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const banner = BANNERS[current];

  return (
    <div className="flex flex-col h-full bg-[#07070c] overflow-y-auto pb-20">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center shadow-[0_0_16px_#f59e0b60] text-lg">
            🐜
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-tight">Муравей</span>
            <div className="text-white/30 text-[9px] leading-none">AI-разработчик</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 text-[10px] font-medium">Онлайн</span>
        </div>
      </div>

      {/* Banner carousel */}
      <div className="shrink-0 relative mx-3 mt-3 rounded-2xl overflow-hidden h-52">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className={`absolute inset-0 bg-gradient-to-br ${banner.gradient} p-5 flex flex-col justify-between`}
          >
            {/* Top tag */}
            <div className="flex items-center gap-2">
              <span className="text-2xl">{banner.emoji}</span>
              <span className="text-white/80 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm">
                {banner.tag}
              </span>
            </div>

            {/* Text */}
            <div>
              <h2 className="text-white text-xl font-black leading-tight mb-1">{banner.title}</h2>
              <p className="text-white/70 text-xs leading-relaxed">{banner.subtitle}</p>
            </div>

            {/* Dots */}
            <div className="flex gap-1.5">
              {BANNERS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1 rounded-full transition-all ${i === current ? "bg-white w-5" : "bg-white/40 w-1.5"}`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA Button — За работу */}
      <div className="px-3 mt-4">
        <motion.button
          onClick={onGoToChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#f59e0b] via-[#ef4444] to-[#ec4899] flex items-center justify-center gap-3 shadow-[0_0_30px_#f59e0b40] relative overflow-hidden"
        >
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
            className="text-2xl"
          >
            🐜
          </motion.span>
          <span className="text-white font-black text-lg tracking-tight">За работу!</span>
          <span className="text-white/60 text-xl">→</span>
        </motion.button>
      </div>

      {/* Features grid */}
      <div className="px-3 mt-4 grid grid-cols-2 gap-2.5">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-3.5"
          >
            <div className="text-2xl mb-1.5">{f.emoji}</div>
            <div className="text-white/90 text-sm font-semibold">{f.title}</div>
            <div className="text-white/40 text-xs mt-0.5">{f.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent projects placeholder */}
      <div className="px-3 mt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Быстрый старт</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { icon: "🛒", label: "Интернет-магазин", desc: "каталог + корзина + форма заказа" },
            { icon: "💼", label: "Лендинг для бизнеса", desc: "услуги, цены, контакты, форма" },
            { icon: "🍕", label: "Сайт ресторана", desc: "меню, галерея, бронирование" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={onGoToChat}
              className="flex items-center gap-3 px-3.5 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-left"
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-white/80 text-sm font-medium">{item.label}</div>
                <div className="text-white/30 text-xs truncate">{item.desc}</div>
              </div>
              <span className="text-white/20 ml-auto text-sm">→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
