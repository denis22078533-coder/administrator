import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import { GitHubSettings } from "./useGitHub";

interface AISettings {
  apiKey: string;
  provider: "openai" | "claude";
  model: string;
  baseUrl: string;
  proxyUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (s: AISettings) => void;
  ghSettings: GitHubSettings;
  onSaveGh: (s: GitHubSettings) => void;
  selfEditMode: boolean;
  onSelfEditToggle: (v: boolean) => void;
  onSyncEngine?: () => void;
  syncingEngine?: boolean;
  onLoadZip?: () => void;
  convertingZip?: boolean;
}

const MODELS = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o3-mini", "o1-mini"],
  claude: [
    "claude-opus-4-5",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
  ],
};

const MODEL_LABELS: Record<string, string> = {
  "gpt-4o": "GPT-4o — флагман",
  "gpt-4o-mini": "GPT-4o mini — быстрый",
  "gpt-4-turbo": "GPT-4 Turbo",
  "o3-mini": "o3-mini — рассуждения",
  "o1-mini": "o1-mini — рассуждения",
  "claude-opus-4-5": "Claude Opus 4.5 — максимум",
  "claude-sonnet-4-5": "Claude Sonnet 4.5 — баланс",
  "claude-haiku-4-5": "Claude Haiku 4.5 — быстрый",
  "claude-3-5-sonnet-20241022": "Claude Sonnet 3.5 — топ",
  "claude-3-5-haiku-20241022": "Claude Haiku 3.5",
  "claude-3-opus-20240229": "Claude Opus 3",
};

type Tab = "ai" | "github" | "engine";

const inp = "w-full h-9 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 text-white/70 text-sm font-mono placeholder:text-white/20 outline-none focus:border-[#9333ea]/40 transition-colors";
const label = "text-white/40 text-xs font-medium uppercase tracking-wider block mb-2";

export default function SettingsDrawer({
  open, onClose, settings, onSave, ghSettings, onSaveGh,
  selfEditMode, onSelfEditToggle, onSyncEngine, syncingEngine, onLoadZip, convertingZip,
}: Props) {
  const [tab, setTab] = useState<Tab>("ai");
  const [form, setForm] = useState(settings);
  const [ghForm, setGhForm] = useState(ghSettings);
  const [showKey, setShowKey] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showEngineToken, setShowEngineToken] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(form);
    onSaveGh(ghForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const TABS: [Tab, string, string][] = [
    ["ai", "ИИ", "Cpu"],
    ["github", "GitHub", "Globe"],
    ["engine", "Engine", "Terminal"],
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <motion.div
            key="drawer"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#0a0a12] border-l border-white/[0.07] z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#9333ea]/20 to-indigo-600/20 border border-[#9333ea]/20 flex items-center justify-center">
                  <Icon name="SlidersHorizontal" size={14} className="text-[#9333ea]" />
                </div>
                <div>
                  <span className="text-white font-semibold text-sm block leading-tight">Админ-панель</span>
                  <span className="text-white/25 text-[10px]">Lumen Control Center</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              >
                <Icon name="X" size={15} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06] px-5 pt-3 gap-5">
              {TABS.map(([key, lbl, ico]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 pb-2.5 text-xs font-semibold border-b-2 transition-all ${
                    tab === key
                      ? "border-[#9333ea] text-[#9333ea]"
                      : "border-transparent text-white/30 hover:text-white/60"
                  }`}
                >
                  <Icon name={ico} size={13} />
                  {lbl}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

              {/* ─── TAB: ИИ ─────────────────────────────────────────── */}
              {tab === "ai" && (
                <>
                  <div>
                    <label className={label}>Провайдер ИИ</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["openai", "claude"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setForm(f => ({ ...f, provider: p, model: MODELS[p][0], baseUrl: p === "openai" ? (import.meta.env.VITE_DEFAULT_OPENAI_BASE || "https://proxyapi.ru") : (import.meta.env.VITE_DEFAULT_CLAUDE_BASE || "https://api.anthropic.com") }))}
                          className={`h-9 rounded-lg border text-sm font-medium transition-all ${
                            form.provider === p
                              ? "border-[#9333ea]/50 bg-[#9333ea]/10 text-purple-300"
                              : "border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70 hover:border-white/20"
                          }`}
                        >
                          {p === "openai" ? "OpenAI" : "Claude"}
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
                            <span className="font-medium leading-tight">{MODEL_LABELS[m] ?? m}</span>
                            <span className="font-mono text-[10px] opacity-50 leading-tight">{m}</span>
                          </span>
                          {form.model === m && <Icon name="Check" size={13} className="text-[#9333ea] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={label}>API Ключ</label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={form.apiKey}
                        onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                        placeholder={form.provider === "openai" ? "sk-..." : "sk-ant-..."}
                        className={inp + " pr-10"}
                      />
                      <button onClick={() => setShowKey(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                        <Icon name={showKey ? "EyeOff" : "Eye"} size={14} />
                      </button>
                    </div>
                    <p className="text-white/20 text-xs mt-1.5">Хранится только в браузере.</p>
                  </div>

                  <div>
                    <label className={label}>Base URL</label>
                    <input type="text" value={form.baseUrl} onChange={e => setForm(f => ({ ...f, baseUrl: e.target.value.trim() }))} placeholder="https://proxyapi.ru" className={inp} />
                    <p className="text-white/20 text-xs mt-1.5">Для ProxyAPI: https://proxyapi.ru</p>
                  </div>

                  <div>
                    <label className={label}>Proxy URL (шлюз)</label>
                    <input type="text" value={form.proxyUrl} onChange={e => setForm(f => ({ ...f, proxyUrl: e.target.value.trim() }))} placeholder="https://functions.poehali.dev/..." className={inp} />
                    <p className="text-white/20 text-xs mt-1.5">URL cloud-функции для запросов к ИИ.</p>
                  </div>

                  <div className="bg-[#9333ea]/5 border border-[#9333ea]/15 rounded-xl p-3.5 flex items-start gap-2.5">
                    <Icon name="Info" size={14} className="text-[#9333ea] mt-0.5 shrink-0" />
                    <p className="text-white/40 text-xs leading-relaxed">Запросы идут напрямую из браузера. Убедитесь, что у ключа есть доступ к выбранной модели.</p>
                  </div>
                </>
              )}

              {/* ─── TAB: GitHub Sites ────────────────────────────────── */}
              {tab === "github" && (
                <>
                  <div className="bg-[#9333ea]/5 border border-[#9333ea]/20 rounded-xl p-3.5 flex items-start gap-2.5">
                    <Icon name="Globe" size={14} className="text-[#9333ea] mt-0.5 shrink-0" />
                    <p className="text-white/50 text-xs leading-relaxed">
                      Репозиторий <strong className="text-white/70">сайта</strong> — сюда ИИ сохраняет сгенерированный <span className="font-mono">index.html</span>.
                    </p>
                  </div>

                  <div>
                    <label className={label}>GitHub Token (Sites)</label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={ghForm.token}
                        onChange={e => setGhForm(f => ({ ...f, token: e.target.value.trim() }))}
                        placeholder="ghp_..."
                        className={inp + " pr-10"}
                      />
                      <button onClick={() => setShowToken(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                        <Icon name={showToken ? "EyeOff" : "Eye"} size={14} />
                      </button>
                    </div>
                    <p className="text-white/20 text-xs mt-1.5">Права: <span className="font-mono">repo</span> (Contents: Read & Write).</p>
                  </div>

                  <div>
                    <label className={label}>Repository Path</label>
                    <input type="text" value={ghForm.repo} onChange={e => setGhForm(f => ({ ...f, repo: e.target.value.trim() }))} placeholder="username/my-website" className={inp} />
                    <p className="text-white/20 text-xs mt-1.5">Формат: <span className="font-mono">username/repo</span></p>
                  </div>

                  <div>
                    <label className={label}>Файл для редактирования</label>
                    <input type="text" value={ghForm.filePath ?? "index.html"} onChange={e => setGhForm(f => ({ ...f, filePath: e.target.value.trim() }))} placeholder="index.html" className={inp} />
                    <p className="text-white/20 text-xs mt-1.5">Путь внутри репозитория.</p>
                  </div>

                  <div>
                    <label className={label}>URL живого сайта</label>
                    <input type="text" value={ghForm.siteUrl ?? ""} onChange={e => setGhForm(f => ({ ...f, siteUrl: e.target.value.trim() }))} placeholder="https://username.github.io/repo/" className={inp} />
                    <p className="text-white/20 text-xs mt-1.5">Оставьте пустым — адрес построится автоматически.</p>
                  </div>

                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
                    <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-1.5">Как получить Token</p>
                    <p className="text-white/30 text-xs leading-relaxed">GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate → выбери <span className="font-mono text-white/50">repo</span></p>
                  </div>
                </>
              )}

              {/* ─── TAB: Engine & Admin ──────────────────────────────── */}
              {tab === "engine" && (
                <>
                  {/* Self-Edit Mode */}
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                    {/* Заголовок + тумблер */}
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Icon name="Brain" size={14} className="text-amber-400" />
                      </div>
                      <p className="text-amber-300 text-sm font-semibold flex-1">Self-Edit Mode</p>
                      {/* Toggle */}
                      <button
                        onClick={() => onSelfEditToggle(!selfEditMode)}
                        className={`relative w-11 h-6 rounded-full border transition-all shrink-0 ${
                          selfEditMode
                            ? "bg-amber-500/30 border-amber-500/50"
                            : "bg-white/[0.05] border-white/10"
                        }`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all shadow-sm ${
                          selfEditMode
                            ? "translate-x-5 bg-amber-400"
                            : "translate-x-0.5 bg-white/20"
                        }`} />
                      </button>
                    </div>
                    <p className="text-white/35 text-xs leading-relaxed pl-9">
                      ИИ получает доступ к файлам платформы через Engine GitHub и может редактировать собственный код по запросу в чате.
                    </p>
                    {selfEditMode && (
                      <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <span className="text-amber-300 text-xs font-medium">Режим активен — ИИ видит /src и /backend</span>
                      </div>
                    )}
                  </div>

                  {/* Engine GitHub */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <Icon name="GitBranch" size={11} className="text-emerald-400" />
                      </div>
                      <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Engine GitHub — репозиторий платформы</span>
                    </div>
                    <p className="text-white/25 text-xs leading-relaxed mb-4">
                      Отдельный репозиторий для исходников самого Lumen (/src, /backend). Кнопка «Sync Engine» скачивает весь код платформы.
                    </p>

                    <div className="flex flex-col gap-4">
                      <div>
                        <label className={label}>Engine GitHub Token</label>
                        <div className="relative">
                          <input
                            type={showEngineToken ? "text" : "password"}
                            value={ghForm.engineToken}
                            onChange={e => setGhForm(f => ({ ...f, engineToken: e.target.value.trim() }))}
                            placeholder="ghp_... (или оставить пустым — используется Sites Token)"
                            className={inp + " pr-10"}
                          />
                          <button onClick={() => setShowEngineToken(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                            <Icon name={showEngineToken ? "EyeOff" : "Eye"} size={14} />
                          </button>
                        </div>
                        <p className="text-white/20 text-xs mt-1.5">Если пусто — используется основной GitHub Token.</p>
                      </div>

                      <div>
                        <label className={label}>Engine Repository</label>
                        <input
                          type="text"
                          value={ghForm.engineRepo}
                          onChange={e => setGhForm(f => ({ ...f, engineRepo: e.target.value.trim() }))}
                          placeholder="username/moi-umniy-lumin"
                          className={inp}
                        />
                        <p className="text-white/20 text-xs mt-1.5">Репозиторий с кодом платформы.</p>
                      </div>

                      <div>
                        <label className={label}>Ветка</label>
                        <input
                          type="text"
                          value={ghForm.engineBranch || "main"}
                          onChange={e => setGhForm(f => ({ ...f, engineBranch: e.target.value.trim() || "main" }))}
                          placeholder="main"
                          className={inp}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Выгрузить в GitHub */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { handleSave(); onSyncEngine?.(); }}
                    disabled={syncingEngine || (!ghForm.engineRepo && !ghForm.repo)}
                    className="w-full h-10 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.15] text-emerald-400 text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  >
                    <Icon name={syncingEngine ? "Loader" : "GitBranch"} size={15} className={syncingEngine ? "animate-spin" : ""} />
                    {syncingEngine ? "Выгружаю..." : "Выгрузить платформу в GitHub"}
                  </motion.button>

                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-3.5">
                    <p className="text-white/20 text-xs font-semibold uppercase tracking-wider mb-1.5">Что выгружает кнопка</p>
                    <p className="text-white/25 text-xs leading-relaxed">Пушит /src, /backend, package.json, vite.config.ts, tailwind.config.ts в указанный Engine Repository на GitHub.</p>
                  </div>

                  {/* Разделитель */}
                  <div className="border-t border-white/[0.06]" />

                  {/* Загрузить ZIP код */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-5 h-5 rounded-md bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Icon name="PackageOpen" size={11} className="text-violet-400" />
                      </div>
                      <span className="text-white/60 text-xs font-semibold uppercase tracking-wider">Загрузить ZIP-проект</span>
                    </div>
                    <button
                      onClick={onLoadZip}
                      disabled={convertingZip}
                      title="Загрузить ZIP с index.html внутри"
                      className={`w-full h-10 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                        convertingZip
                          ? "bg-violet-500/10 border-violet-500/20 text-violet-400/50 cursor-wait"
                          : "bg-violet-500/[0.08] border-violet-500/30 hover:bg-violet-500/[0.15] text-violet-400"
                      }`}
                    >
                      <Icon name={convertingZip ? "Loader" : "Upload"} size={15} className={convertingZip ? "animate-spin" : ""} />
                      {convertingZip ? "Читаю ZIP..." : "Загрузить ZIP код"}
                    </button>
                    <p className="text-white/20 text-xs mt-2 leading-relaxed">ZIP-архив с index.html внутри (например, билд из poehali.dev). ИИ конвертирует в React-проект.</p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-white/[0.06]">
              <motion.button
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                className={`w-full h-10 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  saved
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                    : "bg-[#9333ea] hover:bg-[#7e22ce] text-white"
                }`}
              >
                {saved ? <><Icon name="Check" size={15} />Сохранено</> : <><Icon name="Save" size={15} />Сохранить</>}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}