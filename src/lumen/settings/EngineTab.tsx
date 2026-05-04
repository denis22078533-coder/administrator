import { motion } from "framer-motion";
import Icon from "@/components/ui/icon";
import { GitHubSettings } from "../useGitHub";

interface Props {
  ghForm: GitHubSettings;
  setGhForm: React.Dispatch<React.SetStateAction<GitHubSettings>>;
  showEngineToken: boolean;
  setShowEngineToken: (v: boolean) => void;
  publicAiEnabled: boolean;
  onPublicAiToggle: (v: boolean) => void;
  selfEditMode: boolean;
  onSelfEditToggle: (v: boolean) => void;
  syncingEngine?: boolean;
  onSyncEngine?: () => void;
  onLoadZip?: () => void;
  convertingZip?: boolean;
  onSaveAndSync: () => void;
}

const inp = "w-full h-9 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 text-white/70 text-sm font-mono placeholder:text-white/20 outline-none focus:border-[#9333ea]/40 transition-colors";
const label = "text-white/40 text-xs font-medium uppercase tracking-wider block mb-2";

export default function EngineTab({
  ghForm, setGhForm,
  showEngineToken, setShowEngineToken,
  publicAiEnabled, onPublicAiToggle,
  selfEditMode, onSelfEditToggle,
  syncingEngine, onSyncEngine,
  onLoadZip, convertingZip,
  onSaveAndSync,
}: Props) {
  return (
    <>
      {/* Публичный ИИ-режим */}
      <div className={`border rounded-xl p-4 ${publicAiEnabled ? "bg-emerald-500/5 border-emerald-500/30" : "bg-white/[0.03] border-white/[0.08]"}`}>
        <div className="flex items-center gap-2.5 mb-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${publicAiEnabled ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-white/[0.05] border border-white/10"}`}>
            <Icon name="Zap" size={14} className={publicAiEnabled ? "text-emerald-400" : "text-white/30"} />
          </div>
          <p className={`text-sm font-semibold flex-1 ${publicAiEnabled ? "text-emerald-300" : "text-white/50"}`}>Включить ИИ для всех</p>
          <button
            onClick={() => onPublicAiToggle(!publicAiEnabled)}
            className={`relative w-11 h-6 rounded-full border transition-all shrink-0 ${
              publicAiEnabled
                ? "bg-emerald-500/30 border-emerald-500/50"
                : "bg-white/[0.05] border-white/10"
            }`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all shadow-sm ${
              publicAiEnabled
                ? "translate-x-5 bg-emerald-400"
                : "translate-x-0.5 bg-white/20"
            }`} />
          </button>
        </div>
        <p className="text-white/35 text-xs leading-relaxed pl-9">
          Когда включено — любой пользователь может создавать сайты через Муравья. Используются твои API-ключи и настройки модели.
        </p>
        {publicAiEnabled && (
          <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-emerald-300 text-xs font-medium">Режим активен — Муравей доступен всем</span>
          </div>
        )}
      </div>

      {/* Self-Edit Mode */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Icon name="Brain" size={14} className="text-amber-400" />
          </div>
          <p className="text-amber-300 text-sm font-semibold flex-1">Self-Edit Mode</p>
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
              <button onClick={() => setShowEngineToken(!showEngineToken)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
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
        onClick={() => { onSaveAndSync(); onSyncEngine?.(); }}
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
        <p className="text-white/20 text-xs mt-2 leading-relaxed">ZIP-архив с index.html внутри (например, билд Vite/React). ИИ конвертирует в React-проект.</p>
      </div>
    </>
  );
}
