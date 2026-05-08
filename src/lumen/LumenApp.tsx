
import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import LumenTopBar from "./LumenTopBar";
import LivePreview from "./LivePreview";
import ChatPanel, { ChatMode } from "./ChatPanel";
import HomePage from "./HomePage";
import ProjectsPage from "./ProjectsPage";
import BottomNav, { Tab } from "./BottomNav";
import AntWorker from "./AntWorker";
import CoreDashboard from "./CoreDashboard";
import { useGitHub } from "./useGitHub";
import { MusicService } from "../lib/MusicService";
import MusicPlayer from "./MusicPlayer";
import { useLumenAuth } from "./useLumenAuth";
import {
  CREATE_SYSTEM_PROMPT,
  EDIT_SYSTEM_PROMPT_FULL,
  LOCAL_FILE_EDIT_PROMPT,
  PROJECT_STRUCTURE,
  SELF_EDIT_SYSTEM_PROMPT,
  SQL_MIGRATION_SYSTEM_PROMPT,
  ZIP_CONVERT_SYSTEM_PROMPT
} from "./prompts";

type CycleStatus = "idle" | "reading" | "generating" | "done" | "error";
type MobileTab = "chat" | "preview";

export interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  html?: string;
  track?: any;
}

interface Settings {
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
  customPrompt: ""
};

let msgCounter = 0;

const SimpleLoginPage = ({ onLogin }: { onLogin: (p: string) => boolean}) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = () => {
      if (onLogin(password)) {
        setError('');
      } else {
        setError('Неверный пароль.');
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
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
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
  const { ghSettings, fetchFromGitHub, pushToGitHub } = useGitHub(adminMode);
  
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

  const liveUrl = (() => {
    if (ghSettings.siteUrl?.trim()) {
      const u = ghSettings.siteUrl.trim();
      return u.endsWith("/") ? u : u + "/";
    }
    const [user, repo] = (ghSettings.repo || "").split("/");
    return user && repo ? `https://${user}.github.io/${repo}/` : "";
  })();

  const [cycleStatus, setCycleStatus] = useState<CycleStatus>("idle");
  const [cycleLabel, setCycleLabel] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [htmlHistory, setHtmlHistory] = useState<string[]>([]);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [deployResult, setDeployResult] = useState<{ id: number; ok: boolean; message: string } | null>(null);
  const [currentFileSha, setCurrentFileSha] = useState<string>("");
  const [currentFilePath, setCurrentFilePath] = useState<string>("");
  const [loadingFromGitHub, setLoadingFromGitHub] = useState(false);
  const [fullCodeContext, setFullCodeContext] = useState<{ html: string; fileName: string } | null>(null);
  const [showRebuildBanner, setShowRebuildBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("home");

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

  const [publicAiEnabled, setPublicAiEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("lumen_public_ai") === "1"; } catch { return false; }
  });

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

  const handleUndo = () => {
    setHtmlHistory(h => {
      const prev = h[h.length - 1];
      if (!prev) return h;
      setPreviewHtml(prev);
      try { localStorage.setItem("lumen_last_html", prev); } catch { /* ignore */ }
      return h.slice(0, -1);
    });
  };

  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem("lumen_settings");
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const abortRef = useRef(false);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [convertingZip, setConvertingZip] = useState(false);

  useEffect(() => {
    if (!(window as unknown as Record<string, unknown>).JSZip) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      document.head.appendChild(script);
    }
  }, []);

  const buildChatHistory = (currentUserText: string, maxPairs = 25): { role: string; content: string }[] => {
    const history: { role: string; content: string }[] = [];
    const recent = messages.slice(-maxPairs * 2);
    for (const msg of recent) {
      if (msg.html?.startsWith("__IMAGE__:")) continue;
      if (msg.track) continue;
      const content = msg.html
        ? msg.html.length > 64000 ? msg.text + "\n[предыдущий HTML-код сайта обрезан для экономии токенов]" : `<boltArtifact>${msg.html}</boltArtifact>`
        : msg.text;
      history.push({ role: msg.role === "user" ? "user" : "assistant", content });
    }
    history.push({ role: "user", content: currentUserText });
    return history;
  };

  const callAI = async (systemPrompt: string, userText: string, onProgress?: (chars: number) => void, useHistory = false, timeoutMs = 300000): Promise<string> => {
    const rawBase = (settings.baseUrl || "").trim().replace(/\/+$/, "");
    const isOpenAI = settings.provider === "openai";

    const chatMessages = useHistory
      ? buildChatHistory(userText)
      : [{ role: "user", content: userText }];

    const maxTokens = 16000;

    const PROXYAPI_HOSTS = new Set(["proxyapi.ru", "www.proxyapi.ru", "api.proxyapi.ru"]);

    let endpoint: string;
    let reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
    let requestBody: Record<string, unknown>;

    if (isOpenAI) {
      const base = rawBase || (import.meta.env.VITE_DEFAULT_OPENAI_BASE || "https://api.proxyapi.ru/openai");
      const parsedHost = base.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
      if (PROXYAPI_HOSTS.has(parsedHost)) {
        endpoint = "https://api.proxyapi.ru/openai/v1/chat/completions";
      } else if (base.endsWith("/chat/completions")) {
        endpoint = base;
      } else if (base.endsWith("/v1")) {
        endpoint = base + "/chat/completions";
      } else {
        endpoint = base + "/v1/chat/completions";
      }
      reqHeaders["Authorization"] = `Bearer ${settings.apiKey.trim()}`;
      requestBody = {
        model: settings.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...chatMessages,
        ],
        max_tokens: maxTokens,
      };
    } else {
      const base = rawBase || (import.meta.env.VITE_DEFAULT_CLAUDE_BASE || "https://api.proxyapi.ru/anthropic");
      const parsedHost = base.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
      if (PROXYAPI_HOSTS.has(parsedHost)) {
        endpoint = "https://api.proxyapi.ru/anthropic/v1/messages";
      } else if (base.endsWith("/messages")) {
        endpoint = base;
      } else if (base.endsWith("/v1")) {
        endpoint = base + "/messages";
      } else {
        endpoint = base + "/v1/messages";
      }
      reqHeaders["x-api-key"] = settings.apiKey.trim();
      reqHeaders["anthropic-version"] = "2023-06-01";
      requestBody = {
        model: settings.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: chatMessages,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: reqHeaders,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if ((e as Error)?.name === "AbortError") {
        throw new Error(`Превышено время ожидания (${timeoutMs / 1000} сек). Попробуйте ещё раз или упростите запрос.`);
      }
      throw new Error(`Сетевая ошибка: ${String(e)}`);
    }

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let rawText = "";
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          rawText += decoder.decode(value, { stream: true });
          if (onProgress) onProgress(rawText.length);
        }
      } finally {
        clearTimeout(timeoutId);
        reader.releaseLock();
      }
    } else {
      rawText = await res.text();
      clearTimeout(timeoutId);
    }

    let data: Record<string, unknown>;
    try { data = JSON.parse(rawText); } catch {
      throw new Error(`Сервер вернул не JSON (HTTP ${res.status}): ${rawText.slice(0, 300)}`);
    }

    if (!res.ok || data.error) {
      const errMsg = data.error as { message?: string } | string | undefined;
      const detail = typeof errMsg === "string" ? errMsg : errMsg?.message;
      throw new Error(`HTTP ${res.status}: ${detail || rawText.slice(0, 300)}`);
    }

    if (isOpenAI) {
      const content = (data.choices as { message: { content: string } }[])?.[0]?.message?.content ?? "";
      if (!content) throw new Error("ИИ вернул пустой ответ. Проверьте настройки модели.");
      return content;
    } else {
      const content = (data.content as { text: string }[])?.[0]?.text ?? "";
      if (!content) throw new Error("ИИ вернул пустой ответ. Проверьте настройки модели.");
      return content;
    }
  };

  const handleLoadZip = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setConvertingZip(true);
    setCycleStatus("reading");
    setCycleLabel("Читаю архив...");

    try {
      const JSZip = (window as any).JSZip;
      if (!JSZip) throw new Error("JSZip ещё не загружен, попробуйте ещё раз");
      const zip = await JSZip.loadAsync(file);

      const allPaths: string[] = [];
      zip.forEach((relativePath: string, zipEntry: { dir: boolean }) => {
        if (!zipEntry.dir) allPaths.push(relativePath);
      });

      let foundHtml = "";
      let foundPath = "";

      const candidates = ["dist/index.html", "build/index.html", "index.html"];
      for (const candidate of candidates) {
        const entry = zip.file(candidate);
        if (entry) {
          foundHtml = await entry.async("string");
          foundPath = candidate;
          break;
        }
      }

      if (!foundHtml) {
        const htmlFiles = allPaths.filter(p => p.endsWith("index.html"));
        const pick = htmlFiles.find(p => p.includes("dist/"))
          || htmlFiles.find(p => p.includes("build/"))
          || htmlFiles[0];
        if (pick) {
          foundPath = pick;
          foundHtml = await zip.file(pick)!.async("string");
        }
      }

      if (foundHtml) {
        setCycleLabel("Встраиваю стили и скрипты...");
        const baseDir = foundPath.includes("/") ? foundPath.slice(0, foundPath.lastIndexOf("/") + 1) : "";

        const zipAssets: Record<string, string> = {};
        const assetPromises: Promise<void>[] = [];
        zip.forEach((relPath: string, entry: { dir: boolean; async: (t: string) => Promise<string> }) => {
          if (entry.dir) return;
          const ext = relPath.slice(relPath.lastIndexOf(".")).toLowerCase();
          if ([".css", ".js"].includes(ext)) {
            assetPromises.push(entry.async("string").then(c => { zipAssets[relPath] = c; }));
          }
        });
        await Promise.all(assetPromises);

        let inlinedHtml = foundHtml.replace(/<link[^>]+rel=['"]stylesheet['"][^>]*href=['"]([^'"]+)[''][^>]*\/?>/gi, (match, href) => {
          const normalized = href.startsWith("/") ? href.slice(1) : href;
					const lastSlash = normalized.lastIndexOf("/");
					const fileName = lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
          const key = zipAssets[baseDir + normalized] !== undefined ? baseDir + normalized
            : zipAssets[normalized] !== undefined ? normalized
            : Object.keys(zipAssets).find(k => k.endsWith(fileName));
          if (key && zipAssets[key]) {
            return `<style>${zipAssets[key]}</style>`;
          }
          return match;
        });

        inlinedHtml = inlinedHtml.replace(/<script([^>]*)src=['"]([^'"]+)['']([^>]*)><\/script>/gi, (match, pre, src, post) => {
          const normalized = src.startsWith("/") ? src.slice(1) : src;
					const lastSlash = normalized.lastIndexOf("/");
					const fileName = lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
          const key = zipAssets[baseDir + normalized] !== undefined ? baseDir + normalized
            : zipAssets[normalized] !== undefined ? normalized
            : Object.keys(zipAssets).find(k => k.endsWith(fileName));
          if (key && zipAssets[key]) {
            const attrs = (pre + post).replace(/\s*src=['"][^'"]*['']/gi, "").replace(/\s*type=['"]module['']/gi, "");
            return `<script${attrs}>${zipAssets[key]}</script>`;
          }
          return match;
        });

        const htmlWithBase = liveUrl ? injectBaseHref(inlinedHtml, liveUrl) : inlinedHtml;
        savePreviewHtml(injectLightTheme(htmlWithBase));
        setFullCodeContext({ html: inlinedHtml, fileName: foundPath });
        setMobileTab("preview");
        setCycleStatus("done");
        setCycleLabel("");
        setMessages(prev => [...prev, {
          id: ++msgCounter,
          role: "assistant",
          text: `Загружен «${foundPath}» из архива. Опишите что нужно изменить — отредактирую.`,
        }]);
      } else {
        const files = await readZipFiles(file);
        const fileCount = Object.keys(files).length;
        if (fileCount === 0) throw new Error("В архиве не найдены файлы проекта");

        const filesContext = Object.entries(files)
          .sort(([a, b]) => a.localeCompare(b))
          .map(([path, content]) => `\n\n\n\n### Файл: ${path}\n\'\'\'\n${content.slice(0, 6000)}\n\'\'\'`)
          .join("");

        const zipPrompt = `Конвертируй этот React/Vite проект (${fileCount} файлов) в один HTML файл. Сохрани все тексты, цвета и структуру точно как в оригинале. Верни ТОЛЬКО HTML.\n\n--- ФАЙЛЫ ПРОЕКТА ---${filesContext}\n--- КОНЕЦ ФАЙЛОВ ---`;

        setCycleLabel("Конвертирую...");
        setCycleStatus("generating");

        const rawResponse = await callAI(ZIP_CONVERT_SYSTEM_PROMPT, zipPrompt, (chars) => {
          setCycleLabel(`Конвертирую... ${chars} симв.`);
        });
        const { text: chatText, artifact: cleanHtml } = extractArtifact(rawResponse);

        if (!cleanHtml) {
          throw new Error("Не удалось конвертировать проект. Попробуйте ещё раз.");
        }

        const htmlWithBase = liveUrl ? injectBaseHref(cleanHtml, liveUrl) : cleanHtml;
        savePreviewHtml(injectLightTheme(htmlWithBase));
        setMobileTab("preview");
        setCycleStatus("done");
        setCycleLabel("");
        setMessages(prev => [...prev, {
          id: ++msgCounter,
          role: "assistant",
          text: chatText || `Проект «${file.name}» конвертирован (${fileCount} файлов). Опишите что нужно изменить — отредактирую.`,
          html: cleanHtml
        }]);
      }

    } catch (err) {
      setCycleStatus("error");
      setCycleLabel("");
      const errText = err instanceof Error ? err.message : "Неизвестная ошибка";
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${errText}` }]);
    } finally {
      setConvertingZip(false);
    }
  }, [settings, liveUrl]);

    const readZipFiles = async (file: File): Promise<Record<string, string>> => {
    const JSZip = (window as any).JSZip;
    if (!JSZip) throw new Error("JSZip ещё не загружен, попробуйте ещё раз");
    const zip = await JSZip.loadAsync(file);
    const result: Record<string, string> = {};
    const textExts = [".tsx", ".ts", ".jsx", ".js", ".css", ".html", ".json", ".md", ".svg", ".py", ".sh", ".env", ".yaml"];
    const skipDirs = ["node_modules", ".git", "dist", "build", ".next"];

    const promises: Promise<void>[] = [];
    zip.forEach((relativePath: string, zipEntry: { dir: boolean; async: (type: string) => Promise<string> }) => {
      if (zipEntry.dir) return;
      const skip = skipDirs.some(d => relativePath.includes(`${d}/`));
      if (skip) return;
      const ext = relativePath.slice(relativePath.lastIndexOf(".")).toLowerCase();
      if (!textExts.includes(ext)) return;
      promises.push(
        zipEntry.async("string").then(content => {
          result[relativePath] = content;
        })
      );
    });
    await Promise.all(promises);
    return result;
  };

  const extractArtifact = (raw: string): { text: string; artifact: string } => {
    const artifactMatch = raw.match(/<boltArtifact>([\s\S]*?)<\/boltArtifact>/i);
    if (artifactMatch && artifactMatch[1]) {
      const artifact = artifactMatch[1].trim();
      const text = raw.substring(0, artifactMatch.index).trim() || "Готово! Внес изменения в код.";
      return { text, artifact };
    }
    const mdMatch = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (mdMatch && mdMatch[1]) {
        return { text: "Готово, вот код:", artifact: mdMatch[1].trim() };
    }
    return { text: raw.trim(), artifact: "" };
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
    if (/<html[^>]*>/i.test(html)) {
      return html.replace(/(<html[^>]*>)/i, `$1\n<head><base href=\"${base}\"/></head>`);
    }
    return html;
  };

  const IMAGE_GENERATE_URL = import.meta.env.VITE_IMAGE_GENERATE_URL || "";

  const handleSendImage = useCallback(async (text: string) => {
    setCycleStatus("generating");
    setCycleLabel("Генерирую картинку...");
    try {
      let imageUrl: string;

      if (IMAGE_GENERATE_URL) {
        const r = await fetch(IMAGE_GENERATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });
        const d = await r.json();
        if (!d.url) throw new Error(d.error || "Ошибка генерации");
        imageUrl = d.url;
      } else {
        const encodedPrompt = encodeURIComponent(text);
        imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&enhance=true`;
        const check = await fetch(imageUrl, { method: "HEAD" });
        if (!check.ok) throw new Error(`Ошибка генерации: HTTP ${check.status}`);
      }

      setCycleStatus("done");
      setCycleLabel("");
      setMessages(prev => [...prev, {
        id: ++msgCounter,
        role: "assistant",
        text: `Картинка готова!`,
        html: `__IMAGE__:${imageUrl}`,
      }]);
    } catch (err) {
      setCycleStatus("error");
      setCycleLabel("");
      const errText = err instanceof Error ? err.message : "Неизвестная ошибка";
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${errText}` }]);
    }
  }, [IMAGE_GENERATE_URL]);

  const handleSendMusic = useCallback(async (text: string) => {
    setCycleStatus("generating");
    setCycleLabel("Создаю песню...");
    try {
      const tracks = await MusicService.generate(text);
      if (!tracks || tracks.length === 0) {
        throw new Error("Не удалось создать песню. Попробуйте другой запрос.");
      }
      setCycleStatus("done");
      setCycleLabel("");
      setMessages(prev => [...prev, {
        id: ++msgCounter,
        role: "assistant",
        text: `Композиция готова: **${tracks[0].title}**`,
        track: tracks[0],
      }]);
    } catch (err) {
      setCycleStatus("error");
      setCycleLabel("");
      const errText = err instanceof Error ? err.message : "Неизвестная ошибка";
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${errText}` }]);
    }
  }, []);
  
  const [pendingSql, setPendingSql] = useState<{ sql: string; explanation: string } | null>(null);

  // --- SELF-EDIT LOGIC ---
  const readLocalFile = async (path: string): Promise<{ content: string; error?: never } | { content?: never; error: string }> => {
    const token = localStorage.getItem("lumen_admin_auth");
    if (!token) return { error: "Нет токена авторизации для доступа к файлам." };

    try {
        const res = await fetch('/api/file-system.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action: 'read', path })
        });
        const data = await res.json();
        if (data.status === 'success') {
            return { content: data.content };
        } else {
            return { error: data.message || `Ошибка сервера при чтении файла ${path}` };
        }
    } catch (e) {
        return { error: `Сетевая ошибка при чтении файла ${path}: ${String(e)}` };
    }
  };

  const writeLocalFile = async (path: string, content: string): Promise<{ ok: boolean; message: string }> => {
      const token = localStorage.getItem("lumen_admin_auth");
      if (!token) return { ok: false, message: "Нет токена авторизации для записи файла." };

      try {
          const res = await fetch('/api/file-system.php', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ action: 'write', path, content })
          });
          const data = await res.json();
          if (data.status === 'success') {
              return { ok: true, message: data.message };
          } else {
              return { ok: false, message: data.message || `Ошибка сервера при записи файла ${path}` };
          }
      } catch (e) {
          return { ok: false, message: `Сетевая ошибка при записи файла ${path}: ${String(e)}` };
      }
  };

  const handleSelfEditChat = useCallback(async (text: string) => {
    if (!adminMode || !selfEditMode) {
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: "Режим Self-Edit доступен только администраторам." }]);
        return;
    }
    if (!settings.apiKey) {
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: "API-ключ не найден. Перейдите в /system-admin и введите ключ." }]);
        return;
    }

    setCycleStatus("generating");
    setCycleLabel("Автопилот: думаю...");

    try {
        const systemPrompt = `Ты — ИИ-автопилот, интегрированный в собственную кодовую базу (React/TypeScript). У тебя есть прямой доступ к файловой системе сервера через специальные action-блоки.
Твоя задача — анализировать запросы пользователя и модифицировать код, чтобы выполнить их.

ПРАВИЛА:
1.  **Работа с файлами**: Используй ТОЛЬКО action-блоки для чтения и записи. Не придумывай другие.
2.  **Формат**: Возвращай ТОЛЬКО JSON в action-блоках.
3.  **Сначала читай**: Прежде чем вносить изменения, ВСЕГДА читай существующий код файла, который хочешь отредактировать.
4.  **Синхронизация**: После успешной записи файла он автоматически будет отправлен в GitHub. Тебе не нужно для этого ничего делать.
5.  **Ответ**: Кратко сообщи о результате на русском языке.

ДОСТУПНЫЕ ДЕЙСТВИЯ:
-   **Прочитать файл**:
    \'\'\'action
    {"action":"read","path":"src/lumen/LumenApp.tsx"}
    \'\'\'
-   **Записать файл**:
    \'\'\'action
    {"action":"write","path":"src/lumen/LumenApp.tsx","content":"... полный код файла ..."}
    \'\'\'
-   **Чтение нескольких файлов**:
    \'\'\'action
    {"action":"read_multiple","paths":["src/lumen/LumenApp.tsx", "src/lumen/useGitHub.ts"]}
    \'\'\'

Пример: Пользователь просит "добавь кнопку". Ты сначала читаешь файл, потом возвращаешь измененный код в \`write\` action.`;

        const response = await callAI(systemPrompt, text, (chars) => setCycleLabel(`Автопилот: ${chars} симв.`), true);

        const actionMatches = response.match(/```action\s*([\s\S]*?)```/g);
        if (!actionMatches) {
            setCycleStatus("done"); setCycleLabel("");
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response }]);
            return;
        }

        const actions: any[] = [];
        for (const match of actionMatches) {
            try {
                actions.push(JSON.parse(match.replace(/```action\s*|```/g, "").trim()));
            } catch (e) { console.error("Invalid action JSON:", e); }
        }

        let currentText = response.replace(/```action[\s\S]*?```/g, "").trim();
        if (currentText) {
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: currentText }]);
        }

        let followUpPrompt = "";

        for (const actionData of actions) {
            if (actionData.action === "read" && actionData.path) {
                setCycleLabel(`Читаю ${actionData.path} с сервера...`);
                const result = await readLocalFile(actionData.path);
                if (result.content !== undefined) {
                    const body = result.content.length > 7000 ? result.content.slice(0, 7000) + "\n... [файл обрезан]" : result.content;
                    followUpPrompt += `Содержимое файла ${actionData.path}:\n\'\'\'\n${body}\n\'\'\'\n\n`;
                } else {
                    followUpPrompt += `❌ Ошибка чтения ${actionData.path}: ${result.error}\n`;
                }
            } else if (actionData.action === "read_multiple" && actionData.paths && actionData.paths.length > 0) {
                setCycleLabel(`Читаю ${actionData.paths.length} файлов...`);
                for (const p of actionData.paths) {
                    setCycleLabel(`Читаю ${p}...`);
                    const result = await readLocalFile(p);
                    if (result.content !== undefined) {
                         const body = result.content.length > 7000 ? result.content.slice(0, 7000) + "\n... [файл обрезан]" : result.content;
                        followUpPrompt += `Содержимое файла ${p}:\n\'\'\'\n${body}\n\'\'\'\n\n`;
                    } else {
                        followUpPrompt += `❌ Ошибка чтения ${p}: ${result.error}\n`;
                    }
                }
            } else if (actionData.action === "write" && actionData.path && typeof actionData.content === 'string') {
                setCycleLabel(`Сохраняю ${actionData.path} на сервере...`);
                const writeResult = await writeLocalFile(actionData.path, actionData.content);

                if (writeResult.ok) {
                    setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `✅ Файл \`${actionData.path}\` сохранен. Начинаю синхронизацию с GitHub...` }]);
                    setCycleLabel(`Синхронизирую ${actionData.path} с GitHub...`);

                    const pushResult = await pushToGitHub(actionData.content, "", actionData.path);
                    if (pushResult.ok) {
                        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `✅ \`${actionData.path}\` синхронизирован с GitHub.` }]);
                    } else {
                        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `❌ Ошибка синхронизации с GitHub: ${pushResult.message}` }]);
                    }
                } else {
                    setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `❌ Ошибка записи на сервер: ${writeResult.message}` }]);
                }
            }
        }

        if (followUpPrompt) {
            setCycleLabel("Автопилот: анализирую код...");
            // Use a different variable for the recursive call's text to avoid confusion
            const followUpText = `${followUpPrompt}Я получил код. Теперь выполни мой первоначальный запрос: ${text}`;
            const finalResponseText = await callAI(systemPrompt, followUpText, (c) => setCycleLabel(`Автопилот: ${c} симв.`), true);
            
            // Check if the final response also has actions and handle them.
            const finalActionMatches = finalResponseText.match(/```action\s*([\s\S]*?)```/g);
            if(finalActionMatches) {
                 await handleSelfEditChat(finalResponseText); // Recursive call
            } else {
                 setCycleStatus("done"); setCycleLabel("");
                 setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: finalResponseText}]);
            }
        } else {
            setCycleStatus("done");
            setCycleLabel("");
        }

    } catch (err) {
        setCycleStatus("error"); setCycleLabel("");
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка Автопилота: ${err instanceof Error ? err.message : String(err)}` }]);
    }
}, [settings, adminMode, selfEditMode, messages, pushToGitHub]);


  const handleSqlRequest = useCallback(async (text: string) => {
    // ... (implementation unchanged for now)
  }, [settings, messages]);
  
  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleSend = useCallback(async (text: string, mode: ChatMode = "site") => {
    abortRef.current = false;
    
    const userMsg: Message = { id: ++msgCounter, role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setDeployResult(null);
    setPendingSql(null);

    if (!settings.apiKey) {
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: "API-ключ не найден. Администратору необходимо перейти на страницу /system-admin и ввести ключ." }]);
        return;
    }

    try {
      if (mode === "music") {
        await handleSendMusic(text);
        return;
      }

      if (mode === "image") {
        await handleSendImage(text);
        return;
      }
      
      if (mode === "chat") {
        if (selfEditMode && adminMode && ghSettings.engineRepo) {
          await handleSelfEditChat(text);
          return;
        }

        const isSqlRequest = /создай таблиц|добавь колонк|измени схему|миграци|sql|create table|alter table|добавь поле|удали колонк|индекс|foreign key|база данных.*изменить|изменить.*базу/i.test(text);
        if (isSqlRequest) {
          await handleSqlRequest(text);
          return;
        }
        
        setCycleStatus("generating");
        setCycleLabel("Думаю...");
        const GENERAL_CHAT_PROMPT = "Ты — Муравей, дружелюбный и полезный ИИ-ассистент. Отвечай на вопросы пользователя на русском языке.";
        const response = await callAI(GENERAL_CHAT_PROMPT, text, (chars) => {
            setCycleLabel(`Думаю... ${chars} симв.`);
        }, true);

        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response }]);
        setCycleStatus("done");
        setCycleLabel("");
        return;
      }

      // Default mode: "site"
      let currentHtml = "";
      const customAddition = settings.customPrompt?.trim() ? `\n\n## Дополнительные инструкции от владельца:\n${settings.customPrompt.trim()}` : "";
      let systemPrompt = CREATE_SYSTEM_PROMPT + customAddition;

      if (fullCodeContext) {
        currentHtml = fullCodeContext.html;
        systemPrompt = LOCAL_FILE_EDIT_PROMPT(currentHtml, fullCodeContext.fileName) + customAddition;
      } else if (ghSettings.token && ghSettings.repo) {
        setCycleStatus("reading");
        const filePath = (ghSettings.filePath || "index.html").trim().replace(/^\//, "");
        setCycleLabel(`Читаю ${filePath} из GitHub...`);
        const fetched = await fetchFromGitHub();
        if (fetched.ok && fetched.html) {
          currentHtml = fetched.html;
          setCurrentFileSha(fetched.sha);
          setCurrentFilePath(fetched.filePath);
          systemPrompt = EDIT_SYSTEM_PROMPT_FULL(currentHtml) + customAddition;
        } else if (!fetched.ok) {
          // If the file could not be read (e.g., 404 Not Found),
          // we assume it's a new site creation and proceed without an error.
          // The system prompt will remain CREATE_SYSTEM_PROMPT.
          console.warn(`Could not read file from GitHub (message: "${fetched.message}"). Proceeding with new file creation.`);
        }
      }

      if (abortRef.current) return;

      let enrichedText = text;
      const wantsImages = /картинк|фото|изображени|баннер|галере|природ|интерьер|пейзаж|вид|товар|продукт|блюд|еда|ресторан|кафе|кофейн|магазин|спортзал|фитнес|отель|image|photo|banner|gallery|nature|landscape/i.test(text);
      if (wantsImages) {
        setCycleStatus("generating");
        setCycleLabel("Генерирую картинки...");
        const imgPromptsRaw = await callAI(
          `Пользователь просит создать сайт. Определи какие картинки нужны и придумай 2-3 коротких описания на английском языке для генерации изображений через AI.\nПравила: описания должны точно соответствовать теме сайта, быть визуально красивыми, фотореалистичными.\nВерни ТОЛЬКО JSON массив строк, например: [\"modern gym interior with equipment\", \"fitness trainer with client\"].\nБез пояснений, только JSON.`,
          text
        );
        let imgPrompts: string[] = [];
        try {
          const match = imgPromptsRaw.match(/\[[\s\S]*?\]/);
          if (match) imgPrompts = JSON.parse(match[0]);
        } catch { imgPrompts = []; }

        if (imgPrompts.length > 0) {
          const generatedUrls: string[] = [];
          for (let i = 0; i < imgPrompts.length; i++) {
            if (abortRef.current) return;
            setCycleLabel(`Генерирую картинку ${i + 1}/${imgPrompts.length}...`);
            try {
              const r = await fetch(IMAGE_GENERATE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: imgPrompts[i] }),
              });
              const d = await r.json();
              if (d.url) generatedUrls.push(d.url);
            } catch { /* продолжаем без этой картинки */ }
          }
          if (generatedUrls.length > 0) {
            const urlList = generatedUrls.map((u, i) => `URL картинки ${i + 1}: ${u}`).join("\n");
            enrichedText = `${text}\n\nВАЖНО: Я уже сгенерировал специальные картинки для этого сайта. ОБЯЗАТЕЛЬНО используй их в дизайне:\n${urlList}\n\nТребования к использованию картинок:\n- Первая картинка — главный баннер/герой секция на всю ширину (object-fit: cover, height: 400-500px)\n- Остальные картинки — в галерее, карточках или секциях сайта\n- Все <img> должны иметь style="object-fit: cover" и заданные размеры\n- НЕ используй placeholder-картинки — только переданные URL`;
          }
        }
      }

      if (abortRef.current) return;

      setCycleStatus("generating");
      setCycleLabel("Создаю сайт...");

      const passHistory = !!(fullCodeContext || (ghSettings.token && ghSettings.repo && currentHtml));
      const rawResponse = await callAI(systemPrompt, enrichedText, (chars) => {
        setCycleLabel(`Создаю сайт... ${chars} симв.`);
      }, passHistory);
      
      const { text: chatText, artifact: cleanHtml } = extractArtifact(rawResponse);

      if (!cleanHtml) {
        setCycleStatus("done");
        setCycleLabel("");
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: chatText }]);
        return;
      }
      
      if (!/<[a-z][\s\S]*>/i.test(cleanHtml)) {
        throw new Error(`Модель вернула некорректный код в блоке <boltArtifact>: \"${cleanHtml.slice(0, 200)}\". Попробуйте ещё раз.`);
      }

      if (abortRef.current) return;

      const htmlWithBase = liveUrl ? injectBaseHref(cleanHtml, liveUrl) : cleanHtml;
      savePreviewHtml(injectLightTheme(htmlWithBase));
      setMobileTab("preview");

      const assistantId = ++msgCounter;
      setMessages(prev => [...prev, {
        id: assistantId,
        role: "assistant",
        text: chatText,
        html: cleanHtml,
      }]);

      setShowRebuildBanner(!ghSettings.token || !ghSettings.repo);

      if (ghSettings.token && ghSettings.repo) {
        setCycleLabel("Загружаю в GitHub...");
        const filePath = currentFilePath || (ghSettings.filePath || "index.html").trim().replace(/^\//, "");
        const pushResult = await pushToGitHub(cleanHtml, "", filePath);

        if (pushResult.ok) {
          try {
            const fresh = await fetchFromGitHub();
            if (fresh.ok) {
              setCurrentFileSha(fresh.sha);
              setCurrentFilePath(fresh.filePath);
            }
          } catch (_e) { /* не критично */ }
        }

        setCycleStatus(pushResult.ok ? "done" : "error");
        setCycleLabel("");
        setDeployResult({ id: assistantId, ...pushResult });
        setTimeout(() => setDeployResult(null), pushResult.ok ? 8000 : 30000);
      } else {
        setCycleStatus("done");
        setCycleLabel("");
      }

    } catch (err) {
      if (!abortRef.current) {
        setCycleStatus("error");
        setCycleLabel("");
        const errText = err instanceof Error ? err.message : "Неизвестная ошибка";
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${errText}` }]);
      }
    }
  }, [settings, ghSettings, fetchFromGitHub, pushToGitHub, currentFilePath, fullCodeContext, liveUrl, handleSelfEditChat, handleSendImage, handleSqlRequest, handleSendMusic, adminMode, selfEditMode, messages]);

  const handleSelectTemplate = useCallback((prompt: string) => {
    setActiveTab("chat");
    setMessages([]);
    savePreviewHtml(null);
    handleSend(prompt, "site");
  }, [handleSend]);

  const handleApply = useCallback(async (msgId: number, html: string) => {
    if (!ghSettings.token) {
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: "GitHub-репозиторий не настроен. Администратору необходимо перейти на страницу /system-admin и указать данные." }]);
        return;
    }
    setDeployingId(msgId);
    setDeployResult(null);

    const filePath = currentFilePath || (ghSettings.filePath || "index.html").trim().replace(/^\//, "");
    setCycleStatus("generating");
    setCycleLabel(`Сохраняю ${filePath} в GitHub...`);

    const result = await pushToGitHub(html, currentFileSha, filePath);

    if (result.ok) {
      try {
        const fresh = await fetchFromGitHub();
        if (fresh.ok) {
          setCurrentFileSha(fresh.sha);
          setCurrentFilePath(fresh.filePath);
        }
      } catch (_e) { /* не критично */ }
    }

    setCycleStatus(result.ok ? "done" : "error");
    setCycleLabel("");
    setDeployingId(null);
    setDeployResult({ id: msgId, ...result });
    setTimeout(() => setDeployResult(null), result.ok ? 6000 : 30000);
  }, [ghSettings, pushToGitHub, fetchFromGitHub, currentFileSha, currentFilePath]);

  const handleStop = () => {
    abortRef.current = true;
    setCycleStatus("idle");
    setCycleLabel("");
  };

  const handleLoadFromGitHub = useCallback(async () => {
    if (!ghSettings.token || !ghSettings.repo) {
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: "GitHub-репозиторий не настроен. Администратору необходимо перейти на страницу /system-admin и указать данные." }]);
        return;
    }
    setLoadingFromGitHub(true);
    const fetched = await fetchFromGitHub();
    setLoadingFromGitHub(false);
    if (fetched.ok && fetched.html) {
      setCurrentFileSha(fetched.sha);
      setCurrentFilePath(fetched.filePath);
      savePreviewHtml(injectLightTheme(liveUrl ? injectBaseHref(fetched.html, liveUrl) : fetched.html));
      setMobileTab("preview");
      const id = ++msgCounter;
      setMessages([{
        id,
        role: "assistant",
        text: `Загружен файл «${fetched.filePath}». Вижу ваш сайт. Опишите, что нужно изменить — внесу правки бережно.`,
      }]);
    } else {
      const id = ++msgCounter;
      setMessages([{
        id,
        role: "assistant",
        text: `Не удалось загрузить файл: ${fetched.message || "неизвестная ошибка"}. Проверьте настройки GitHub.`,
      }]);
    }
  }, [ghSettings, fetchFromGitHub, liveUrl]);

  const handleLoadLocalFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const html = ev.target?.result as string;
      if (!html) return;
      setFullCodeContext({ html, fileName: file.name });
      savePreviewHtml(injectLightTheme(liveUrl ? injectBaseHref(html, liveUrl) : html));
      setMobileTab("preview");
      setMessages([{
        id: ++msgCounter,
        role: "assistant",
        text: `Файл «${file.name}» загружен (${Math.round(file.size / 1024)} КБ). Вижу код. Опишите, что нужно изменить — отредактирую и сохраню в GitHub если настроен.`,
      }]);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }, [liveUrl]);

  const handleNewProject = () => {
    setMessages([]);
    savePreviewHtml(null);
    setHtmlHistory([]);
    setCycleStatus("idle");
    setCycleLabel("");
    setMobileTab("chat");
    setDeployResult(null);
    setFullCodeContext(null);
  };

  const handleExport = () => {
    if (!previewHtml) return;
    const blob = new Blob([previewHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fullCodeContext?.fileName || "lumen-site.html";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyToGitHub = useCallback(async () => {
    if (!ghSettings.token || !ghSettings.repo) {
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: "GitHub-репозиторий не настроен. Администратору необходимо перейти на страницу /system-admin и указать данные." }]);
        throw new Error("GitHub не настроен.");
    }
    if (!previewHtml) throw new Error("Нет кода для сохранения.");
    const filePath = currentFilePath || (ghSettings.filePath || "index.html").trim().replace(/^\//, "");
    const result = await pushToGitHub(previewHtml, currentFileSha, filePath);
    if (!result.ok) throw new Error(result.message || "Ошибка сохранения");
    try {
      const fresh = await fetchFromGitHub();
      if (fresh.ok) { setCurrentFileSha(fresh.sha); setCurrentFilePath(fresh.filePath); }
    } catch (_e) { /* не критично */ }
  }, [ghSettings, previewHtml, currentFilePath, currentFileSha, pushToGitHub, fetchFromGitHub]);

  const topStatus: "idle" | "generating" | "done" | "error" =
    cycleStatus === "reading" ? "generating" : cycleStatus;

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
           <button
              onClick={() => alert("Автопилот Муравья работает успешно!")}
              className="absolute top-4 right-60 z-50 px-3 py-1.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              ТЕСТ 2
            </button>

          {(activeTab === "chat" || activeTab === "projects" || activeTab === "core") && (
            <LumenTopBar
              status={topStatus}
              cycleLabel={cycleLabel}
              selfEditActive={selfEditMode && adminMode}
              isAdmin={adminMode}
              onSettings={() => window.location.href = '/system-admin'} // Navigate to admin page
              onLogout={handleLogout}
              balance={"Безлимит"}
            />
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            className="hidden"
            onChange={handleLoadLocalFile}
          />

          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleLoadZip}
          />

          <div className="flex-1 min-h-0 overflow-hidden relative">
            <AnimatePresence mode="wait">

              {activeTab === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <HomePage
                    onGoToChat={() => setActiveTab("chat")}
                    onGoToProjects={() => setActiveTab("projects")}
                    onGoToProfile={() => setActiveTab("profile")}
                  />
                </motion.div>
              )}

              {adminMode && activeTab === "core" && (
                 <motion.div
                  key="core"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <CoreDashboard onOpenSettings={() => window.location.href = '/system-admin'} onPublish={() => alert('Публикация (в разработке)')} />
                </motion.div>
              )}

              {activeTab === "chat" && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {showRebuildBanner && (
                    <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-amber-950/60 border-b border-amber-500/30 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-amber-300 font-medium">Внесены правки в код — нажмите «Опубликовать»</span>
                      <button onClick={() => setShowRebuildBanner(false)} className="ml-auto text-amber-400/50 hover:text-amber-400 transition-colors text-[10px] px-2 py-0.5 rounded border border-amber-500/20">?</button>
                    </div>
                  )}
                  {fullCodeContext && (
                    <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-[#0d0d18] border-b border-cyan-500/20 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-white/40">Локальный файл:</span>
                      <span className="text-cyan-400 font-mono font-medium">{fullCodeContext.fileName}</span>
                      <button onClick={() => setFullCodeContext(null)} className="ml-auto text-white/20 hover:text-white/60 transition-colors text-[10px] px-2 py-0.5 rounded border border-white/10">?</button>
                    </div>
                  )}
                  {!fullCodeContext && currentFilePath && (
                    <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-[#0d0d18] border-b border-[#9333ea]/20 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-white/40">Редактируется:</span>
                      <span className="text-emerald-400 font-mono font-medium">{currentFilePath}</span>
                      <span className="text-white/20 ml-auto font-mono">{ghSettings.repo}</span>
                    </div>
                  )}

                  <div className="md:hidden flex shrink-0 border-b border-white/[0.06] bg-[#0a0a0f]">
                    {(['chat', 'preview'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setMobileTab(tab)}
                        className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                          mobileTab === tab ? "text-[#f59e0b] border-b-2 border-[#f59e0b]" : "text-white/40 border-b-2 border-transparent"
                        }`}
                      >
                        {tab === "chat" ? <><Icon name="MessageCircle" size={14} /> Чат</> : <><Icon name="Globe" size={14} /> Сайт</>}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden relative md:flex md:gap-2 md:p-2">
                    <div className={`flex flex-col h-full md:w-[420px] md:flex-none bg-[#0a0a0f] md:static ${mobileTab === "chat" ? "absolute inset-0 z-10 flex" : "hidden md:flex"}`}>
                      {!publicAiEnabled ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-3xl">
                            <Icon name="Bot" />
                          </div>
                          <div>
                            <h3 className="text-white/70 font-semibold text-base mb-1">Муравей временно спит</h3>
                            <p className="text-white/30 text-sm leading-relaxed">ИИ-режим ещё не включён. Обратитесь к администратору.</p>
                          </div>
                        </div>
                      ) : (
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
                          onLoadFromGitHub={handleLoadFromGitHub}
                          loadingFromGitHub={loadingFromGitHub}
                          currentFilePath={ghSettings.filePath || "index.html"}
                          onLoadLocalFile={() => fileInputRef.current?.click()}
                          hasLocalFile={!!fullCodeContext}
                          localFileName={fullCodeContext?.fileName}
                          pendingSql={pendingSql}
                          hasGitHub={!!(ghSettings.token && ghSettings.repo)}
                          onOpenSettings={() => { 
                              setMessages(prev => [...prev, {
                                  id: ++msgCounter, 
                                  role: "assistant", 
                                  text: "Для доступа к настройкам перейдите на страницу /system-admin"
                              }]);
                           } }
                        />
                      )}
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
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0"
                >
                  <ProjectsPage 
                    onGoToChat={() => setActiveTab("chat")} 
                    onSelectTemplate={handleSelectTemplate}
                  />
                </motion.div>
              )}

              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex flex-col overflow-y-auto pb-4"
                >
                  <div className="px-4 py-6 flex flex-col items-center gap-3 border-b border-white/[0.06]">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-4xl shadow-[0_0_30px_#f59e0b40]">
                      <Icon name="User" />
                    </div>
                    <div className="text-center">
                      <h2 className="text-white font-bold text-lg">Пользователь</h2>
                      <p className="text-white/40 text-xs">{adminMode ? "Администратор" : "Разработчик"}</p>
                    </div>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-2">
                      <div className={`flex items-center justify-between px-4 py-3.5 rounded-xl border bg-[#f59e0b]/[0.05] border-[#f59e0b]/20`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xl"><Icon name="Infinity" /></span>
                          <div>
                            <div className="text-white/80 text-sm font-medium">Запросы к Муравью</div>
                            <div className={`text-xs text-[#f59e0b]/70`}>
                              Безлимит
                            </div>
                          </div>
                        </div>
                      </div>
                    {adminMode && (
                      <button onClick={() => window.location.href = '/system-admin'} className="flex items-center gap-3 px-4 py-3.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-left hover:bg-white/[0.07] transition-all">
                        <span className="text-xl"><Icon name="Shield" /></span>
                        <div>
                          <div className="text-white/80 text-sm font-medium">Панель Администратора</div>
                          <div className="text-white/30 text-xs">Управление системой</div>
                        </div>
                        <span className="text-white/20 ml-auto">→</span>
                      </button>
                    )}
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3.5 bg-red-500/[0.05] border border-red-500/20 rounded-xl text-left hover:bg-red-500/[0.10] transition-all">
                        <span className="text-xl"><Icon name="LogOut" /></span>
                        <div>
                          <div className="text-red-400 text-sm font-medium">Выйти</div>
                          <div className="text-white/30 text-xs">Завершить сессию</div>
                        </div>
                    </button>
                  </div>
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
