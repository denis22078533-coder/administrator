import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import { GitHubSettings } from "./useGitHub";
import AITab from "./settings/AITab";
import GitHubTab from "./settings/GitHubTab";
import AdminTab from "./settings/AdminTab";

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
  open: boolean;
  onClose: () => void;
  settings: AISettings;
  onSave: (s: AISettings) => void;
  ghSettings: GitHubSettings;
  onSaveGh: (s: GitHubSettings) => void;
  selfEditMode: boolean;
  onSelfEditToggle: (v: boolean) => void;
  publicAiEnabled: boolean;
  onPublicAiToggle: (v: boolean) => void;
  onLoadZip?: () => void;
  convertingZip?: boolean;
  isAdmin: boolean;
  isTesterMode: boolean;
  onToggleTesterMode: () => void;
  onResetBalance: () => void;
  isFullPage?: boolean;
}

type Tab = "ai" | "github" | "admin";

const ALL_TABS: [Tab, string, string][] = [
  ["ai", "ИИ", "Cog"],
  ["github", "GitHub", "Globe"],
  ["admin", "Админ", "Shield"],
];

export default function SettingsDrawer({
  open, onClose, settings, onSave, ghSettings, onSaveGh,
  selfEditMode, onSelfEditToggle, publicAiEnabled, onPublicAiToggle,
  onLoadZip, convertingZip,
  isAdmin,
  isTesterMode,
  onToggleTesterMode,
  onResetBalance,
  isFullPage = false,
}: Props) {
  const [tab, setTab] = useState<Tab>("ai");
  const [form, setForm] = useState(settings);
  const [ghForm, setGhForm] = useState(ghSettings);
  const [showKey, setShowKey] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(form);
    onSaveGh(ghForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const TABS = isAdmin ? ALL_TABS : ALL_TABS.filter(([key]) => key !== 'admin');

  const content = (
    <div className={`flex flex-col ${isFullPage ? '' : 'h-full'}`}>
      {!isFullPage && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#9333ea]/20 to-indigo-600/20 border border-[#9333ea]/20 flex items-center justify-center">
                <Icon name="SlidersHorizontal" size={14} className="text-[#9333ea]" />
                </div>
                <div>
                <span className="text-white font-semibold text-sm block leading-tight">{isAdmin ? "Админ-панель" : "Настройки"}</span>
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
      )}

      <div className={`flex border-b border-white/[0.06] px-5 pt-3 gap-5 ${isFullPage ? 'mb-5' : ''}`}>
        {TABS.map(([key, lbl, ico]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 pb-2.5 text-sm font-semibold border-b-2 transition-all ${
              tab === key
                ? "border-[#9333ea] text-[#9333ea]"
                : "border-transparent text-white/30 hover:text-white/60"
            }`}
          >
            <Icon name={ico as any} size={14} />
            {lbl}
          </button>
        ))}
      </div>

      <div className={`flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 ${isFullPage ? 'overflow-visible' : ''}`}>
        {tab === "ai" && (
          <AITab
            form={form}
            setForm={setForm}
            showKey={showKey}
            setShowKey={setShowKey}
          />
        )}

        {tab === "github" && (
          <GitHubTab
            ghForm={ghForm}
            setGhForm={setGhForm}
            showToken={showToken}
            setShowToken={setShowToken}
            publicAiEnabled={publicAiEnabled}
            onPublicAiToggle={onPublicAiToggle}
            selfEditMode={selfEditMode}
            onSelfEditToggle={onSelfEditToggle}
            onLoadZip={onLoadZip}
            convertingZip={convertingZip}
          />
        )}
        
        {tab === "admin" && isAdmin && (
          <AdminTab 
              isTesterMode={isTesterMode}
              onToggleTesterMode={onToggleTesterMode}
              onResetBalance={onResetBalance}
          />
        )}
      </div>

      <div className={`${isFullPage ? 'mt-6' : 'px-5 py-4 border-t border-white/[0.06]'}`}>
        <motion.button
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className={`w-full h-11 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            saved
              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
              : "bg-[#9333ea] hover:bg-[#7e22ce] text-white"
          }`}
        >
          {saved ? <><Icon name="Check" size={16} />Сохранено</> : <><Icon name="Save" size={16} />Сохранить изменения</>}
        </motion.button>
      </div>
    </div>
  );

  if (isFullPage) {
    return content;
  }

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
            {content}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
