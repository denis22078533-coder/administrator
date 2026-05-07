import Icon from "@/components/ui/icon";

interface AISettings {
  apiKey: string;
  googleGeminiKey: string;
  deepseekApiKey: string;
  provider: "openai" | "claude" | "google" | "deepseek";
  model: string;
  baseUrl: string;
  proxyUrl: string;
  customPrompt?: string;
}

interface Props {
  form: AISettings;
  setForm: React.Dispatch<React.SetStateAction<AISettings>>;
  showKey: boolean;
  setShowKey: (v: boolean) => void;
}

const MODELS: Record<"openai" | "claude" | "google" | "deepseek", string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini", "o1-mini"],
  claude: [
    "claude-sonnet-4-6",
    "claude-sonnet-4-5",
    "claude-opus-4-5",
    "claude-haiku-4-5",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
  ],
  google: ["gemini-1.5-pro-latest", "gemini-1.5-flash-latest"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
};

const MODEL_LABELS: Record<string, string> = {
  "gpt-4o": "GPT-4o — флагман",
  "gpt-4o-mini": "GPT-4o mini — быстрый",
  "gpt-4-turbo": "GPT-4 Turbo",
  "o3-mini": "o3-mini — рассуждения",
  "o1-mini": "o1-mini — рассуждения",
  "claude-sonnet-4-6": "Claude Sonnet 4.6 — новейший",
  "claude-sonnet-4-5": "Claude Sonnet 4.5 — топ",
  "claude-opus-4-5": "Claude Opus 4.5 — максимум",
  "claude-haiku-4-5": "Claude Haiku 4.5 — быстрый",
  "claude-3-5-sonnet-20241022": "Claude Sonnet 3.5",
  "claude-3-5-haiku-20241022": "Claude Haiku 3.5",
  "gemini-1.5-pro-latest": "Gemini 1.5 Pro",
  "gemini-1.5-flash-latest": "Gemini 1.5 Flash",
  "deepseek-chat": "DeepSeek Chat (прямой)",
  "deepseek-coder": "DeepSeek Coder (прямой)",
};

const MODEL_RECOMMENDED = new Set(["claude-sonnet-4-6", "claude-sonnet-4-5", "gpt-4o", "gemini-1.5-pro-latest"]);

const MASTER_PROMPT = `Ты — профессиональный веб-дизайнер и разработчик с опытом 15+ лет. Твоя специализация — создание красивых, современных коммерческих сайтов для малого и среднего бизнеса.

## Дизайн — твой главный приоритет:
- Создавай сайты уровня Awwwards и Dribbble — с душой, характером и вниманием к деталям
- Используй современные тренды: glassmorphism, градиенты, плавные анимации, микровзаимодействия
- Типографика — крупная, смелая, читаемая. Google Fonts — всегда
- Цветовые схемы — гармоничные, с акцентами. Никогда не используй дефолтные цвета
- Hero-секции — всегда впечатляющие, с сильным заголовком и призывом к действию
- Адаптивность — идеальная на мобильных, планшетах и десктопе

## Структура каждого сайта:
1. Hero — мощный заголовок + подзаголовок + кнопка CTA + фоновый визуал
2. Преимущества — 3-6 карточек с иконками Lucide
3. О нас / Услуги — с конкретикой и цифрами
4. Портфолио / Примеры — если применимо
5. Отзывы клиентов — 2-3 карточки с именами и фото-аватарами
6. Призыв к действию (CTA) — яркая секция с формой или кнопкой
7. Футер — контакты, соцсети, копирайт

## Технические требования:
- Lucide icons через CDN для всех иконок
- CSS-анимации: плавное появление секций при скролле (Intersection Observer)
- Hover-эффекты на всех кликабельных элементах
- Формы — красивые, с плейсхолдерами и валидацией
- Скорость загрузки — минимум внешних запросов

## Тон и контент:
- Пиши убедительные продающие тексты, не заглушки
- Используй конкретные цифры и факты
- Заголовки — сильные, цепляющие, ориентированные на выгоду клиента`;

const inp = "w-full h-9 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 text-white/70 text-sm font-mono placeholder:text-white/20 outline-none focus:border-[#9333ea]/40 transition-colors";
const label = "text-white/40 text-xs font-medium uppercase tracking-wider block mb-2";

const getBaseUrlForProvider = (provider: string) => {
    switch (provider) {
        case "openai": return (import.meta.env.VITE_DEFAULT_OPENAI_BASE || "https://api.proxyapi.ru/openai/v1");
        case "claude": return (import.meta.env.VITE_DEFAULT_CLAUDE_BASE || "https://api.proxyapi.ru/anthropic/v1");
        case "google": return "https://generativelanguage.googleapis.com/v1beta";
        case "deepseek": return "https://api.deepseek.com/v1";
        default: return "";
    }
}

export default function AITab({ form, setForm, showKey, setShowKey }: Props) {
  return (
    <>
      <div>
        <label className={label}>Провайдер ИИ</label>
        <div className="grid grid-cols-2 gap-2">
          {(["openai", "claude", "google", "deepseek"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setForm(f => ({ ...f, provider: p, model: MODELS[p][0], baseUrl: getBaseUrlForProvider(p) }))}
              className={`h-9 rounded-lg border text-sm font-medium transition-all capitalize ${
                form.provider === p
                  ? "border-[#9333ea]/50 bg-[#9333ea]/10 text-purple-300"
                  : "border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70 hover:border-white/20"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>Модель</label>
        <div className="flex flex-col gap-1.5">
          {MODELS[form.provider].map((m) => (
            <button
              key={m}
              onClick={() => setForm(f => ({ ...f, model: m }))}
              className={`min-h-[2.25rem] px-3 py-2 rounded-lg border text-sm text-left transition-all flex items-center justify-between gap-2 ${
                form.model === m
                  ? "border-[#9333ea]/40 bg-[#9333ea]/10 text-purple-300"
                  : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white/60 hover:border-white/15"
              }`}
            >
              <span className="flex flex-col">
                <span className="font-medium leading-tight flex items-center gap-1.5">
                  {MODEL_LABELS[m] ?? m}
                  {MODEL_RECOMMENDED.has(m) && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#9333ea]/20 text-purple-400 border border-purple-500/20 leading-none">★</span>
                  )}
                </span>
                <span className="font-mono text-[10px] opacity-50 leading-tight">{m}</span>
              </span>
              {form.model === m && <Icon name="Check" size={13} className="text-[#9333ea] shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label}>API Ключ (OpenAI/Claude)</label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={form.apiKey}
            onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
            placeholder={form.provider === "openai" ? "sk-..." : "sk-ant-..."}
            className={inp + " pr-10"}
          />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
            <Icon name={showKey ? "EyeOff" : "Eye"} size={14} />
          </button>
        </div>
        <p className="text-white/20 text-xs mt-1.5">Для OpenAI и Claude. Хранится только в браузере.</p>
      </div>

      <div>
        <label className={label}>Google Gemini Key (бесплатный)</label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={form.googleGeminiKey}
            onChange={e => setForm(f => ({ ...f, googleGeminiKey: e.target.value }))}
            placeholder="AIza..."
            className={inp + " pr-10"}
          />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
            <Icon name={showKey ? "EyeOff" : "Eye"} size={14} />
          </button>
        </div>
        <p className="text-white/20 text-xs mt-1.5">Для Google Gemini. Хранится только в браузере.</p>
      </div>

      <div>
        <label className={label}>DeepSeek API Key (прямой)</label>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={form.deepseekApiKey}
            onChange={e => setForm(f => ({ ...f, deepseekApiKey: e.target.value }))}
            placeholder="sk-..."
            className={inp + " pr-10"}
          />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
            <Icon name={showKey ? "EyeOff" : "Eye"} size={14} />
          </button>
        </div>
        <p className="text-white/20 text-xs mt-1.5">Для DeepSeek. Хранится только в браузере.</p>
      </div>

      <div>
        <label className={label}>Base URL</label>
        <input type="text" value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value.trim() }))} placeholder="https://api.proxyapi.ru/openai" className={inp} />
        <p className="text-white/20 text-xs mt-1.5">Меняется автоматически при смене провайдера.</p>
      </div>

      <div>
        <label className={label}>Proxy URL (шлюз)</label>
        <input type="text" value={form.proxyUrl} onChange={e => setForm(f => ({ ...f, proxyUrl: e.target.value.trim() }))} placeholder="Оставьте пустым — запросы идут напрямую" className={inp} />
        <p className="text-white/20 text-xs mt-1.5">Необязательно. Если пусто — запросы идут напрямую к API.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={label + " mb-0"}>Системный промпт (личность ИИ)</label>
          <button
            onClick={() => setForm(f => ({ ...f, customPrompt: MASTER_PROMPT }))}
            className="text-[10px] font-semibold text-[#9333ea] hover:text-purple-300 border border-[#9333ea]/30 hover:border-[#9333ea]/60 rounded-md px-2 py-1 transition-all bg-[#9333ea]/5 hover:bg-[#9333ea]/10 whitespace-nowrap"
          >
            ★ Вставить мастер-промпт
          </button>
        </div>
        <textarea
          value={form.customPrompt ?? ""}
          onChange={e => setForm(f => ({ ...f, customPrompt: e.target.value }))}
          placeholder="Опиши кто такой твой ИИ, в каком стиле создаёт сайты, что важно для твоих клиентов..."
          rows={6}
          className={inp + " py-2.5 resize-none h-auto leading-relaxed"}
        />
        <p className="text-white/20 text-xs mt-1.5">Добавляется к каждому запросу. Сделает Муравья умнее под твои задачи.</p>
      </div>

      <div className="bg-[#9333ea]/5 border border-[#9333ea]/15 rounded-xl p-3.5 flex items-start gap-2.5">
        <Icon name="Info" size={14} className="text-[#9333ea] mt-0.5 shrink-0" />
        <p className="text-white/40 text-xs leading-relaxed">Запросы идут напрямую из браузера. Убедитесь, что у ключа есть доступ к выбранной модели.</p>
      </div>
    </>
  );
}
