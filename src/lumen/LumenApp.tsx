
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import LumenTopBar from "./LumenTopBar";
import LivePreview from "./LivePreview";
import ChatPanel from "./ChatPanel";
import HomePage from "./HomePage";
import ProjectsPage from "./ProjectsPage";
import BottomNav, { Tab } from "@/components/BottomNav";
import AntWorker from "./AntWorker";
import CoreDashboard from "./CoreDashboard";
import { useGitHub, GitHubFile } from "./useGitHub";
import { useLumenAuth } from "./useLumenAuth";
import { useChatLogic } from "./useChatLogic";

export interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  html?: string;
  track?: any;
}

export interface Settings {
  apiKey: string;
  provider: "openai" | "claude";
  model: string;
  baseUrl: string;
  proxyUrl: string;
  customPrompt?: string;
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  provider: "openai",
  model: "gpt-4o-mini",
  baseUrl: import.meta.env.VITE_DEFAULT_OPENAI_BASE || "https://api.proxyapi.ru/openai/v1",
  proxyUrl: "",
  customPrompt: "",
};

const SimpleLoginPage = ({ onLogin }: { onLogin: (p: string) => boolean }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (onLogin(password)) {
      setError("");
    } else {
      setError("Неверный пароль.");
    }
  };

  return (
    <div className="w-screen h-dvh bg-[#07070c] flex items-center justify-center">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center px-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-5xl shadow-[0_0_40px_#f59e0b50] mb-8">
          🐜
        </div>
        <h1 className="text-white font-bold text-3xl mb-2 text-center">Lumen Platform</h1>
        <p className="text-white/40 text-base mb-8 text-center">Вход для разработчиков</p>

        <div className="w-full flex flex-col gap-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            placeholder="Пароль"
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#f59e0b] transition-all"
          />
          <button
            onClick={handleLogin}
            className="w-full px-4 py-3 bg-[#f59e0b] text-black font-bold rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            Войти
          </button>
          {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default function LumenApp() {
  const { loggedIn, login, adminLogin, adminMode } = useLumenAuth();
  const { ghSettings, fetchFromGitHub, pushToGitHub, currentFile, setCurrentFile } = useGitHub(adminMode);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [fullCodeContext, setFullCodeContext] = useState<{ html: string; fileName: string } | null>(null);
  const [showRebuildBanner, setShowRebuildBanner] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem("lumen_settings");
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [selfEditMode, setSelfEditMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("lumen_self_edit");
      return stored === "1";
    } catch { return false; }
  });
  
    useEffect(() => {
    if (!adminMode) {
      setSelfEditMode(false);
      try { localStorage.setItem("lumen_self_edit", "0"); } catch {}
    }
  }, [adminMode]);


  const liveUrl = (() => {
    if (ghSettings.siteUrl?.trim()) {
      const u = ghSettings.siteUrl.trim();
      return u.endsWith("/") ? u : u + "/";
    }
    const [user, repo] = (ghSettings.repo || "").split("/");
    return user && repo ? `https://${user}.github.io/${repo}/` : "";
  })();

  const savePreviewHtml = (html: string | null) => {
    setPreviewHtml(prev => {
      if (prev) setHtmlHistory(h => [...h.slice(-9), prev]);
      return html;
    });
    try {
      if (html) localStorage.setItem("lumen_last_html", html);
      else localStorage.removeItem("lumen_last_html");
    } catch { /* ignore */ }
  };

  const { 
    cycleStatus, cycleLabel, messages, deployingId, 
    deployResult, pendingSql, handleSend, handleNewMessage, 
    handleStop, handleApply, setMessages 
  } = useChatLogic({
    settings, ghSettings, adminMode, selfEditMode, fullCodeContext, currentFile, liveUrl,
    fetchFromGitHub, pushToGitHub, savePreviewHtml, setMobileTab, setCurrentFile, setShowRebuildBanner, setFullCodeContext
  });
  
  const handleLumenLogin = (password: string): boolean => {
    const regularLoginSuccess = login(password);
    const adminLoginSuccess = adminLogin(password);
    return regularLoginSuccess || adminLoginSuccess;
  }

  const handleLogout = useCallback(() => {
    localStorage.removeItem("lumen_auth");
    localStorage.removeItem("lumen_admin_auth");
    window.location.reload();
  }, []);

  const handleUndo = () => {
    setHtmlHistory(h => {
      const prev = h[h.length - 1];
      if (!prev) return h;
      setPreviewHtml(prev);
      try { localStorage.setItem("lumen_last_html", prev); } catch { /* ignore */ }
      return h.slice(0, -1);
    });
  };

  const handleSelectTemplate = useCallback((prompt: string) => {
    setActiveTab("chat");
    setMessages([]);
    savePreviewHtml(null);
    handleSend(prompt, "site");
  }, [handleSend, setMessages, savePreviewHtml]);

  // ... Other handlers like handleLoadLocalFile, handleLoadFromGitHub, etc.

  const topStatus = cycleStatus === "reading" ? "generating" : cycleStatus;
  const isGenerating = cycleStatus === "generating" || cycleStatus === "reading";

  return (
    <AnimatePresence mode="wait">
      {!loggedIn ? (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <SimpleLoginPage onLogin={handleLumenLogin} />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-dvh flex flex-col bg-[#07070c] overflow-hidden"
          style={{ maxWidth: "100vw" }}
        >
          {(activeTab === "chat" || activeTab === "projects" || activeTab === "core") && (
            <LumenTopBar
              status={topStatus}
              cycleLabel={cycleLabel}
              selfEditActive={selfEditMode && adminMode}
              isAdmin={adminMode}
              onSettings={() => window.location.href = '/system-admin'}
              onLogout={handleLogout}
              balance={"Безлимит"}
            />
          )}
          
          {/* Inputs for file loading would be here */}

          <div className="flex-1 min-h-0 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {activeTab === "home" && (
                  <motion.div key="home" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="absolute inset-0">
                    <HomePage onGoToChat={() => setActiveTab("chat")} onGoToProjects={() => setActiveTab("projects")} onGoToProfile={() => setActiveTab("profile")} />
                  </motion.div>
              )}
              {adminMode && activeTab === "core" && (
                  <motion.div key="core" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="absolute inset-0">
                    <CoreDashboard onOpenSettings={() => window.location.href = '/system-admin'} onPublish={() => alert('Публикация (в разработке)')} />
                  </motion.div>
              )}
              {activeTab === "chat" && (
                <motion.div key="chat" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="absolute inset-0 flex flex-col">
                  {/* Banners for rebuild and local file context would be here */}
                  <div className="md:hidden flex shrink-0 border-b border-white/[0.06] bg-[#0a0a0f]">
                    <button onClick={() => setMobileTab("chat")} className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${mobileTab === "chat" ? "text-[#f59e0b] border-b-2 border-[#f59e0b]" : "text-white/40 border-b-2 border-transparent"}`}><Icon name="MessageCircle" size={14} /> Чат</button>
                    <button onClick={() => setMobileTab("preview")} className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${mobileTab === "preview" ? "text-[#f59e0b] border-b-2 border-[#f59e0b]" : "text-white/40 border-b-2 border-transparent"}`}><Icon name="Globe" size={14} /> Сайт</button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden relative md:flex md:gap-2 md:p-2">
                    <div className={`flex flex-col h-full md:w-[420px] md:flex-none bg-[#0a0a0f] md:static ${mobileTab === "chat" ? "absolute inset-0 z-10 flex" : "hidden md:flex"}`}>
                       <ChatPanel
                          status={cycleStatus}
                          cycleLabel={cycleLabel}
                          messages={messages}
                          onSend={handleSend}
                          onNewMessage={handleNewMessage}
                          onStop={handleStop}
                          onApply={handleApply}
                          deployingId={deployingId}
                          deployResult={deployResult}
                          liveUrl={liveUrl}
                          onOpenPreview={() => setMobileTab("preview")}
                          onLoadFromGitHub={() => {}}
                          loadingFromGitHub={false}
                          currentFilePath={currentFile?.filePath || ghSettings.filePath || "index.html"}
                          onLoadLocalFile={() => {}}
                          hasLocalFile={!!fullCodeContext}
                          localFileName={fullCodeContext?.fileName}
                          pendingSql={pendingSql}
                          hasGitHub={!!(ghSettings.token && ghSettings.repo)}
                          onOpenSettings={() => { 
                              setMessages(prev => [...prev, {
                                  id: Date.now(), 
                                  role: "assistant", 
                                  text: "Для доступа к настройкам перейдите на страницу /system-admin"
                              }]);
                           }}
                        />
                    </div>
                    <div className={`flex flex-col h-full flex-1 min-w-0 ${mobileTab === "preview" ? "flex" : "hidden md:flex"}`}>
                      <LivePreview
                        status={topStatus}
                        previewHtml={previewHtml}
                        liveUrl={liveUrl}
                        onUndo={htmlHistory.length > 0 ? handleUndo : undefined}
                        canUndo={htmlHistory.length > 0}
                      />
                    </div>
                  </div>
                  <AntWorker active={isGenerating} label={cycleLabel} />
                </motion.div>
              )}
              {activeTab === "projects" && (
                  <motion.div key="projects" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="absolute inset-0">
                    <ProjectsPage onGoToChat={() => setActiveTab("chat")} onSelectTemplate={handleSelectTemplate}/>
                  </motion.div>
              )}
              {/* Profile Tab would be here */}
            </AnimatePresence>
          </div>

          <BottomNav active={activeTab} onChange={setActiveTab} isAdmin={adminMode} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
