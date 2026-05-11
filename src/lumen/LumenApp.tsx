import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
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
import { useGitHub, ProjectFile } from "./useGitHub";
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
  googleGeminiKey: string;
  deepseekApiKey: string;
  provider: "openai" | "claude" | "google" | "deepseek";
  model: string;
  baseUrl: string;
  proxyUrl: string;
  customPrompt?: string;
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  googleGeminiKey: "",
  deepseekApiKey: "",
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
        <h1 className="text-white font-bold text-3xl mb-2 text-center">муравей КУЗЯ</h1>
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
      return html.replace(/<base\s[^>]*href=['\"][^\'\"]*['\'][^>]*>/i, `<base href=\"${base}\"/>`);
    }
    if (/<head>/i.test(html)) {
      return html.replace(/<head>/i, `<head>\n  <base href=\"${base}\"/>`);
    }
    return html;
};

const injectCharset = (html: string): string => {
    const charsetTag = '<meta charset="UTF-8">';
    if (/<meta[^>]*charset=/i.test(html)) {
        return html;
    }
    if (/<head>/i.test(html)) {
        return html.replace(/<head>/i, `<head>\n  ${charsetTag}`);
    }
    if (/<body/i.test(html)) {
        return html.replace(/<body([^>]*)>/i, `<head>\n  ${charsetTag}\n</head>\n<body$1>`);
    }
    return `${charsetTag}\n${html}`;
};

export default function LumenApp() {
  const navigate = useNavigate();
  const { loggedIn, login, adminLogin, adminMode } = useLumenAuth();
  const { ghSettings, fetchFromGitHub, pushToGitHub, downloadProjectAsZip } = useGitHub(adminMode);
  
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [currentRepo, setCurrentRepo] = useState<string | null>(null);

  const [mobileTab, setMobileTab] = useState<"chat" | "preview">("chat");
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const indexHtmlFile = useMemo(() => projectFiles.find(f => f.path === 'index.html'), [projectFiles]);

  const settings = useMemo<Settings>(() => {
    try {
      const saved = localStorage.getItem("lumen_settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }, []);

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

  const saveIndexHtmlContent = (html: string | null) => {
    setProjectFiles(prevFiles => {
        const newFiles = [...prevFiles];
        const index = newFiles.findIndex(f => f.path === 'index.html');
        if (index !== -1) {
            newFiles[index] = { ...newFiles[index], content: html || '' };
        } else if (html !== null) {
            newFiles.push({ path: 'index.html', content: html });
        }
        return newFiles;
    });
  };

  const handleApplyToGitHub = useCallback(async (repoToApply?: string) => {
    const repo = repoToApply || currentRepo;
    if (!ghSettings.token || !repo) {
        throw new Error("GitHub не настроен или не выбран проект.");
    }
    if (projectFiles.length === 0) throw new Error("Нет файлов для сохранения.");
    
    const result = await pushToGitHub(projectFiles, `Lumen: Обновление проекта ${repo}`);
    if (!result.ok) throw new Error(result.message || "Ошибка сохранения");
    
    const freshFilesResult = await fetchFromGitHub(repo);
    if (freshFilesResult.ok) {
        setProjectFiles(freshFilesResult.files);
    }
    return result;
  }, [ghSettings, projectFiles, currentRepo, pushToGitHub, fetchFromGitHub]);

  const { 
    cycleStatus, cycleLabel, messages, deployingId, 
    deployResult, pendingSql, handleSend, 
    handleStop, handleApply, setMessages 
  } = useChatLogic({
    settings, ghSettings, adminMode, selfEditMode, 
    fullCodeContext: { html: indexHtmlFile?.content || '', files: projectFiles },
    liveUrl,
    savePreviewHtml: saveIndexHtmlContent,
    setMobileTab,
    onApplyToGitHub: handleApplyToGitHub,
  });

  const processedPreviewHtml = useMemo(() => {
    if (!indexHtmlFile?.content) return null;
    const charsetHtml = injectCharset(indexHtmlFile.content);
    const themedHtml = injectLightTheme(charsetHtml);
    return liveUrl ? injectBaseHref(themedHtml, liveUrl) : themedHtml;
  }, [indexHtmlFile, liveUrl]);
  
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
  
  const handleProjectLoaded = useCallback((files: ProjectFile[], repo: string) => {
      setProjectFiles(files);
      setCurrentRepo(repo);
      setActiveTab('chat');
      setMessages([{
        id: generateUniqueId(),
        role: 'assistant',
        text: `Загружен проект из ZIP-архива. Вы можете сохранить его в репозиторий, нажав 'Применить в GitHub'.`
      }])
  }, [setMessages]);
  
  const handleDownloadProject = useCallback(async (repo: string) => {
      const result = await fetchFromGitHub(repo);
      if (result.ok) {
          downloadProjectAsZip(result.files, repo);
      } else {
          alert(`Не удалось загрузить проект: ${result.message}`);
      }
  }, [fetchFromGitHub, downloadProjectAsZip]);

  const handleOpenProjectFromTemplate = useCallback(async (repo: string) => {
    if (!ghSettings.token) {
        setMessages(prev => [...prev, { id: generateUniqueId(), role: "assistant", text: "Токен GitHub не настроен." }]);
        setActiveTab("chat");
        return;
    }
    const result = await fetchFromGitHub(repo);
    if (result.ok) {
        setProjectFiles(result.files);
        setCurrentRepo(repo);
        setMobileTab("preview");
        setActiveTab("chat");
        setMessages([{
            id: generateUniqueId(),
            role: "assistant",
            text: `Загружен проект «${repo}» из GitHub. Опишите, что нужно изменить.`,
        }]);
    } else {
        setMessages(prev => [...prev, { id: generateUniqueId(), role: "assistant", text: `Не удалось загрузить проект: ${result.message}` }]);
        setActiveTab("chat");
    }
  }, [ghSettings.token, fetchFromGitHub, setMessages, setProjectFiles, setCurrentRepo, setMobileTab, setActiveTab]);


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
              onSettings={() => navigate("/admin")}
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
                    <CoreDashboard onOpenSettings={() => navigate("/admin")} onPublish={() => alert('Публикация (в разработке)')} />
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
                          messages={messages}
                          onSend={handleSend}
                          onStop={handleStop}
                          onApply={handleApply}
                          deployingId={deployingId}
                          deployResult={deployResult}
                          pendingSql={pendingSql}
                          hasGitHub={!!(ghSettings.token && currentRepo)}
                        />
                    </div>
                    <div className={`flex flex-col h-full flex-1 min-w-0 ${mobileTab === "preview" ? "flex" : "hidden md:flex"}`}>
                      <LivePreview
                        status={topStatus}
                        previewHtml={processedPreviewHtml}
                        liveUrl={liveUrl}
                        onApplyToGitHub={ghSettings.token && currentRepo ? async () => { await handleApplyToGitHub(); } : undefined}
                        onUndo={undefined}
                        canUndo={false}
                      />
                    </div>
                  </div>
                  <AntWorker active={isGenerating} label={cycleLabel} />
                </motion.div>
              )}
              {activeTab === "projects" && (
                  <motion.div key="projects" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="absolute inset-0">
                      <ProjectsPage
                          onOpenProject={handleOpenProjectFromTemplate}
                          onProjectLoaded={handleProjectLoaded}
                          onDownloadProject={handleDownloadProject}
                          isTesterMode={adminMode}
                      />
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
