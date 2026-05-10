import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import LumenTopBar from "./LumenTopBar";
import LivePreview from "./LivePreview";
import ChatPanel from "./ChatPanel";
import HomePage from "./HomePage";
import ProjectsPage from "./ProjectsPage";
import ProfilePage from "./ProfilePage";
import BottomNav, { Tab } from "@/components/BottomNav";
import AntWorker from "./AntWorker";
import CoreDashboard from "./CoreDashboard";
import { useGitHub, GitHubFile } from "./useGitHub";
import { useLumenAuth } from "./useLumenAuth";
import { useChatLogic } from "./useChatLogic";

const generateUniqueId = () => Date.now() + Math.random();

export interface Message {
  id: any;
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
  const [showPassword, setShowPassword] = useState(false);

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
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Пароль"
              className="w-full px-4 py-3 pr-10 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#f59e0b] transition-all"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <Icon
                name={showPassword ? "EyeOff" : "Eye"}
                className="text-white/40 cursor-pointer"
                size={18}
                onClick={() => setShowPassword(!showPassword)}
              />
            </div>
          </div>
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

const injectLightTheme = (html: string): string => {
    const forceCss = `<style data-lumen-fix>\n      html,body{background:#ffffff!important;color:#111111!important;}\n    </style>`;
    if (html.toLowerCase().includes("</head>")) {
      return html.replace(/<\/head>/i, `${forceCss}</head>`);
    }
    if (html.toLowerCase().includes("<body")) {
      return html.replace(/<body([^>]*)>/i, `<head>${forceCss}</head><body$1>`);
    }
    return forceCss + html;
};

const injectBaseHref = (html: string, baseUrl: string): string => {
    if (!baseUrl) return html;
    const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    if (/<base\s[^>]*href/i.test(html)) {
      return html.replace(/<base\s[^>]*href=['"][^'"]*[''][^>]*>/i, `<base href=\"${base}\"/>`);
    }
    if (/<head>/i.test(html)) {
      return html.replace(/<head>/i, `<head>\n  <base href=\"${base}\"/>`);
    }
    return html;
};

export default function LumenApp() {
  const { loggedIn, login, adminLogin, adminMode } = useLumenAuth();
  const { ghSettings, fetchFromGitHub, pushToGitHub } = useGitHub(adminMode);
  const [currentFile, setCurrentFile] = useState<GitHubFile | null>(null);

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const fullCodeContext: { html: string; fileName: string } | null = null;
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const [settings] = useState<Settings>(() => {
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

  const liveUrl = useMemo(() => {
    if (ghSettings.siteUrl?.trim()) {
      const u = ghSettings.siteUrl.trim();
      return u.endsWith("/") ? u : u + "/";
    }
    const [user, repo] = (ghSettings.repo || "").split("/");
    return user && repo ? `https://${user}.github.io/${repo}/` : "";
  }, [ghSettings.repo, ghSettings.siteUrl]);

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
    fetchFromGitHub, pushToGitHub, savePreviewHtml, setMobileTab, setCurrentFile
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

  const handleLoadFromGitHub = useCallback(async () => {
    if (!ghSettings.token || !ghSettings.repo) {
        setMessages(prev => [...prev, { id: generateUniqueId(), role: "assistant", text: "GitHub-репозиторий не настроен." }]);
        return;
    }
    const fetched = await fetchFromGitHub();

    if (fetched.ok && fetched.html) {
        setCurrentFile(fetched);
        const themedHtml = injectLightTheme(fetched.html);
        const finalHtml = liveUrl ? injectBaseHref(themedHtml, liveUrl) : themedHtml;
        savePreviewHtml(finalHtml);
        setMobileTab("preview");
        setMessages([{
            id: generateUniqueId(),
            role: "assistant",
            text: `Загружен проект «${fetched.filePath}» из репозитория ${ghSettings.repo}. Опишите, что нужно изменить.`,
        }]);
    } else {
         setMessages(prev => [...prev, { id: generateUniqueId(), role: "assistant", text: `Не удалось загрузить файл: ${fetched.message}` }]);
    }
}, [ghSettings, fetchFromGitHub, liveUrl, setMessages, setCurrentFile, savePreviewHtml, setMobileTab]);

  useEffect(() => {
    if (sessionStorage.getItem('lumen_load_after_project_select') === 'true') {
        sessionStorage.removeItem('lumen_load_after_project_select');
        setActiveTab('chat');
        setTimeout(() => handleLoadFromGitHub(), 100);
    }
  }, [handleLoadFromGitHub]);

  const handleSelectTemplate = useCallback((prompt: string) => {
    setActiveTab("chat");
    setMessages([]);
    savePreviewHtml(null);
    handleSend(prompt, "site");
  }, [handleSend, setMessages, savePreviewHtml]);

  const handleSelectManagedProject = useCallback((project: { repo: string; siteUrl: string; }) => {
    try {
        const saved = localStorage.getItem("lumen_gh_settings");
        const settings = saved ? JSON.parse(saved) : {};
        
        const newSettings = {
            ...settings,
            repo: project.repo,
            siteUrl: project.siteUrl,
            filePath: "index.html",
        };

        localStorage.setItem("lumen_gh_settings", JSON.stringify(newSettings));
        sessionStorage.setItem('lumen_load_after_project_select', 'true');
        window.location.reload();
    } catch (e) {
        console.error("Failed to switch project", e);
    }
  }, []);

  const handleApplyToGitHub = useCallback(async () => {
    if (!ghSettings.token || !ghSettings.repo) {
        throw new Error("GitHub не настроен.");
    }
    if (!previewHtml) throw new Error("Нет кода для сохранения.");
    if (!currentFile) throw new Error("Файл не загружен из GitHub");
    
    const result = await pushToGitHub(previewHtml, currentFile.sha, currentFile.filePath);
    if (!result.ok) throw new Error(result.message || "Ошибка сохранения");
    
    // After successful push, fetch the latest version to update SHA
    const freshFile = await fetchFromGitHub();
    if (freshFile.ok) {
        setCurrentFile(freshFile);
    }
  }, [ghSettings, previewHtml, currentFile, pushToGitHub, fetchFromGitHub, setCurrentFile]);

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
                          pendingSql={pendingSql}
                          hasGitHub={!!(ghSettings.token && ghSettings.repo)}
                          onOpenSettings={() => { 
                              setMessages(prev => [...prev, {
                                  id: generateUniqueId(), 
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
                        onApplyToGitHub={ghSettings.token && ghSettings.repo ? handleApplyToGitHub : undefined}
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
                    <ProjectsPage onGoToChat={() => setActiveTab("chat")} onSelectTemplate={handleSelectTemplate} onSelectManagedProject={handleSelectManagedProject} />
                  </motion.div>
              )}
              {activeTab === "profile" && (
                <motion.div key="profile" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="absolute inset-0">
                    <ProfilePage onLogout={handleLogout} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <BottomNav active={activeTab} onChange={setActiveTab} isAdmin={adminMode} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
