import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onGoToChat: () => void;
  onGoToProjects: () => void;
  onGoToProfile: () => void;
}

const BANNERS = [
  {
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&q=80",
    overlay: "from-black/75 via-[#7c3aed]/30 to-transparent",
    tag: "🛒 Интернет-магазины",
    title: "Магазин за 5 минут",
    subtitle: "Каталог, корзина, оплата, доставка — всё под ключ",
    accent: "#a855f7",
  },
  {
    image: "https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=1200&q=80",
    overlay: "from-black/75 via-[#1d4ed8]/30 to-transparent",
    tag: "🎓 Школьные платформы",
    title: "Чат для класса",
    subtitle: "Расписание, задания, чат учителей и учеников",
    accent: "#3b82f6",
  },
  {
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80",
    overlay: "from-black/75 via-[#0d9488]/30 to-transparent",
    tag: "💼 Для бизнеса",
    title: "Сайт компании",
    subtitle: "Аналитика, CRM, заявки — всё в одном дашборде",
    accent: "#14b8a6",
  },
  {
    image: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=1200&q=80",
    overlay: "from-black/75 via-[#ec4899]/25 to-transparent",
    tag: "🚀 AI-разработка",
    title: "Сайты за минуты",
    subtitle: "Опишите идею — Муравей построит без единой строки кода",
    accent: "#f43f5e",
  },
  {
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80",
    overlay: "from-black/75 via-[#f59e0b]/25 to-transparent",
    tag: "📱 Мобильные приложения",
    title: "Приложения любой сложности",
    subtitle: "От лендинга до полноценного веб-приложения с базой данных",
    accent: "#f59e0b",
  },
];

const FEATURES = [
  { emoji: "⚡", title: "Молниеносно", desc: "Сайт готов за 30 секунд" },
  { emoji: "🧠", title: "Умный ИИ", desc: "Понимает ваш бизнес" },
  { emoji: "🔒", title: "Надёжно", desc: "Хостинг и SSL включены" },
  { emoji: "📊", title: "Масштабируемо", desc: "Растёт вместе с вами" },
];

// Муравьи для анимации на фоне
const ANTS = Array.from({ length: 7 }, (_, i) => ({
  id: i,
  y: 30 + i * 10,
  duration: 8 + i * 1.5,
  delay: i * 1.2,
  size: 14 + (i % 3) * 4,
  reverse: i % 2 === 0,
}));

function AntBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Домик — силуэт SVG */}
      <div className="absolute bottom-0 right-4 opacity-20">
        <svg width="90" height="80" viewBox="0 0 90 80" fill="none">
          <polygon points="45,5 85,38 75,38 75,75 15,75 15,38 5,38" fill="#f59e0b" opacity="0.7"/>
          <rect x="33" y="50" width="24" height="25" fill="#d97706" opacity="0.8"/>
          <rect x="12" y="36" width="66" height="4" fill="#fbbf24" opacity="0.5"/>
        </svg>
      </div>
      {/* Кирпичи */}
      {[{x:62,y:62},{x:68,y:55},{x:74,y:62}].map((b,i) => (
        <div key={i} className="absolute opacity-15" style={{left: `${b.x}%`, bottom: `${b.y}px`}}>
          <div className="w-5 h-3 bg-[#f59e0b] rounded-sm border border-[#d97706]" />
        </div>
      ))}
      {/* Бегущие муравьи */}
      {ANTS.map(ant => (
        <motion.div
          key={ant.id}
          className="absolute"
          style={{ bottom: `${ant.y}px`, fontSize: ant.size }}
          animate={ant.reverse
            ? { x: ["100vw", "-60px"] }
            : { x: ["-60px", "100vw"] }
          }
          transition={{
            duration: ant.duration,
            delay: ant.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <span
            style={{ display: "inline-block", transform: ant.reverse ? "scaleX(-1)" : undefined, opacity: 0.18 }}
          >
            🐜
          </span>
        </motion.div>
      ))}
    </div>
  );
}

// Хук автопрокрутки — сбрасывает таймер при ручной смене слайда
function useAutoplay(total: number, interval = 4000) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % total);
    }, interval);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, interval]);

  const goTo = (i: number) => {
    setCurrent(i);
    startTimer(); // сбрасываем таймер — не прыгаем сразу после ручного тапа
  };

  return { current, goTo };
}

export default function HomePage({ onGoToChat, onGoToProjects: _onGoToProjects, onGoToProfile: _onGoToProfile }: Props) {
  const { current, goTo } = useAutoplay(BANNERS.length, 3800);
  const banner = BANNERS[current];

  return (
    <div className="flex flex-col h-full bg-[#07070c] overflow-y-auto pb-20 relative">

      {/* Анимированный фон с муравьями */}
      <AntBackground />

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06] relative z-10">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center shadow-[0_0_16px_#f59e0b60] text-lg"
          >
            🐜
          </motion.div>
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

      {/* Banner carousel с фото */}
      <div className="shrink-0 relative mx-3 mt-3 rounded-2xl overflow-hidden h-56">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Фото */}
            <img
              src={banner.image}
              alt={banner.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r ${banner.overlay}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              <div>
                <span
                  className="text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm"
                  style={{ background: `${banner.accent}40`, border: `1px solid ${banner.accent}60` }}
                >
                  {banner.tag}
                </span>
              </div>
              <div>
                <h2 className="text-white text-xl font-black leading-tight mb-1 drop-shadow-lg">
                  {banner.title}
                </h2>
                <p className="text-white/80 text-xs leading-relaxed drop-shadow mb-3">
                  {banner.subtitle}
                </p>
                {/* Dots */}
                <div className="flex gap-1.5">
                  {BANNERS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        background: i === current ? "#fff" : "rgba(255,255,255,0.35)",
                        width: i === current ? 22 : 7,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* CTA — За работу */}
      <div className="px-3 mt-4 relative z-10">
        <motion.button
          onClick={onGoToChat}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="w-full h-14 rounded-2xl relative overflow-hidden flex items-center justify-center gap-3 shadow-[0_0_40px_#f59e0b50]"
          style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444, #ec4899)" }}
        >
          {/* Блик */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
          />
          <motion.span
            animate={{ x: [0, 5, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            className="text-2xl relative z-10"
          >
            🐜
          </motion.span>
          <span className="text-white font-black text-lg tracking-tight relative z-10">За работу!</span>
          <span className="text-white/70 text-xl relative z-10">→</span>
        </motion.button>
      </div>

      {/* Features */}
      <div className="px-3 mt-4 grid grid-cols-2 gap-2.5 relative z-10">
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

      {/* Быстрый старт */}
      <div className="px-3 mt-5 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Быстрый старт</span>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { icon: "🛒", label: "Интернет-магазин", desc: "каталог + корзина + оплата" },
            { icon: "🎓", label: "Школьная платформа", desc: "чат, задания, расписание" },
            { icon: "💼", label: "Сайт для бизнеса", desc: "услуги, цены, CRM, заявки" },
            { icon: "🍕", label: "Сайт ресторана", desc: "меню, галерея, бронирование" },
            { icon: "🚀", label: "Лендинг-стартап", desc: "MVP, презентация, инвесторам" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={onGoToChat}
              className="flex items-center gap-3 px-3.5 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.14] active:scale-[0.98] transition-all text-left"
            >
              <span className="text-xl">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-white/80 text-sm font-medium">{item.label}</div>
                <div className="text-white/30 text-xs truncate">{item.desc}</div>
              </div>
              <span className="text-white/20 ml-auto text-sm">→</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom padding for nav */}
      <div className="h-4" />
    </div>
  );
}