import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LumenTopBar from "./LumenTopBar";
import LivePreview from "./LivePreview";
import ChatPanel, { ChatMode } from "./ChatPanel";
import SettingsDrawer from "./SettingsDrawer";
import LumenLoginPage from "./LumenLoginPage";
import HomePage from "./HomePage";
import BottomNav, { Tab } from "./BottomNav";
import AntWorker from "./AntWorker";
import { useLumenAuth } from "./useLumenAuth";
import { useGitHub } from "./useGitHub";

type CycleStatus = "idle" | "reading" | "generating" | "done" | "error";
type MobileTab = "chat" | "preview";

export interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  html?: string; // HTML-результат, который можно задеплоить
}

interface Settings {
  apiKey: string;
  provider: "openai" | "claude";
  model: string;
  baseUrl: string;
  proxyUrl: string;
}

const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  provider: "openai",
  model: "gpt-4o-mini",
  baseUrl: import.meta.env.VITE_DEFAULT_OPENAI_BASE || "https://proxyapi.ru",
  proxyUrl: import.meta.env.VITE_AI_PROXY_URL || "https://functions.poehali.dev/60463e71-1a34-44dc-bde3-90a47fc07cba",
};


const PROJECT_STRUCTURE = `
## Project file structure:
/src/                        — React/Vite frontend (TypeScript + Tailwind CSS)
  /src/lumen/                — AI assistant core (ChatPanel, LumenApp, LivePreview, SettingsDrawer, useGitHub.ts)
  /src/components/ui/        — shadcn/ui components (Button, Dialog, Drawer, etc.)
  /src/index.css             — global CSS variables and base styles
  /src/App.tsx               — application entry point
/backend/                    — Python 3.11 Cloud Functions (deployed serverless)
  /backend/lumen-proxy/      — OpenAI/Claude API proxy with streaming support
  /backend/generate-image/   — image generation via Pollinations + S3 CDN
  /backend/github-download/  — GitHub repo ZIP download proxy (Engine Sync)
  /backend/auth/             — authentication service
/db_migrations/              — PostgreSQL migrations (Flyway format: V{n}__{name}.sql)
/public/                     — static assets
package.json, vite.config.ts, tailwind.config.ts — project config
`;

// ── Senior Developer Base Role ──────────────────────────────────────────────
const SENIOR_DEV_ROLE = `You are a Senior Fullstack Developer with 10+ years of experience.
Core stack: HTML/CSS/JS, React, TypeScript, Python 3.11, PostgreSQL/MySQL, REST APIs, clean architecture.

## Standards you ALWAYS follow:
- Write production-quality, clean, maintainable code — no stubs, no placeholders
- Semantic HTML, accessible markup (aria-labels), mobile-first responsive design
- Before writing code for complex systems — output a brief architecture plan (DB schema + frontend structure)
- Optimize performance: minimal DOM, efficient CSS, no layout thrashing
- When editing — preserve existing architecture, change ONLY what was asked
- Output ONLY the requested artifact — no explanations, no markdown wrappers unless it IS markdown
- Respond in the same language the user writes in (Russian if user writes in Russian)

## Built-in integrations knowledge:
- **ЮKassa**: REST API (https://yookassa.ru/developers), payment_id flow, webhooks, idempotence_key
- **Robokassa**: MD5 signature, ResultURL/SuccessURL callbacks, receipt format
- **СДЭК API v2**: OAuth2 token, /orders POST, tariff codes (136=door2door, 137=door2pickup), /calculator/tarifflist
- **Telegram Bot API**: sendMessage, inline keyboards, webhook vs polling, parse_mode=HTML
- **MySQL**: CREATE TABLE, ALTER TABLE, INDEX — always use utf8mb4, ENGINE=InnoDB; TINYINT(1) for bool
- **PostgreSQL**: standard DDL, serial/bigserial, IF NOT EXISTS, full-text search

## Architecture thinking:
When user asks for a complex feature — FIRST output a short plan:
\`\`\`
[Архитектура]
БД: таблицы + ключевые поля
Фронт: компоненты + flow
API: эндпоинты
\`\`\`
Then implement.
${PROJECT_STRUCTURE}`;

const CREATE_SYSTEM_PROMPT = `${SENIOR_DEV_ROLE}
## Task: Create a complete website
Output ONLY a full standalone HTML document (<!DOCTYPE html>...</html>). No explanations, no markdown fences.
Technical requirements:
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Lucide icons via CDN if needed: <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
- Google Fonts via CDN for typography if needed
- Default to light theme (white/light-gray background, dark text) unless explicitly asked for dark
- All JS inline in <script> tags, no external files
- Fully responsive, works on mobile and desktop
- IMAGES: If ready image URLs are provided — use them directly. No placeholder images if real URLs exist.
- For forms/payments — add skeleton structure with comments showing WHERE to integrate (ЮKassa/Robokassa/СДЭК)`;

const EDIT_SYSTEM_PROMPT_FULL = (currentHtml: string) =>
  `${SENIOR_DEV_ROLE}
## Task: Edit existing website code
Output ONLY the complete modified HTML document. No explanations, no markdown.
Rules:
- Make EXACTLY the requested changes, nothing more
- Preserve all existing styles, structure, content that was NOT mentioned
- Keep the same framework/library versions already in the code

--- CURRENT SITE CODE ---
${currentHtml}
--- END OF CODE ---`;

const ZIP_CONVERT_SYSTEM_PROMPT = `${SENIOR_DEV_ROLE}
## Task: Convert React/Vite project to single HTML file
Your ONLY goal is to faithfully recreate the existing site as one self-contained HTML file.
Strict rules:
1. Output ONLY the complete HTML document (<!DOCTYPE html>...) — no explanations, no markdown
2. DO NOT invent new design or copy — reproduce EXACTLY what's in the source files
3. Preserve all text, headings, color scheme, fonts, spacing from the original
4. Load via CDN: Tailwind CSS, Lucide icons, Google Fonts (if used in source)
5. All JS inline in <script> tags. Fully responsive.`;

const LOCAL_FILE_EDIT_PROMPT = (currentHtml: string, fileName: string) =>
  `${SENIOR_DEV_ROLE}
## Task: Edit uploaded file «${fileName}»
Output ONLY the complete modified HTML document. No explanations, no markdown.
Make EXACTLY the requested changes — preserve everything else as-is.

--- CURRENT FILE CODE ---
${currentHtml}
--- END OF CODE ---`;

// ── SQL migration prompt ────────────────────────────────────────────────────
const SQL_MIGRATION_SYSTEM_PROMPT = `${SENIOR_DEV_ROLE}
## Task: Generate SQL migration
Output a JSON object with two fields:
- "sql": complete SQL script (PostgreSQL + MySQL compatible where possible)
- "explanation": brief description in Russian (1-3 sentences)
Rules: USE IF NOT EXISTS, add comments, use VARCHAR over TEXT for MySQL compat, TINYINT(1) for bool.
Output ONLY valid JSON, no markdown fences.`;

// ── Self-Edit Mode промпт — ИИ редактирует платформу через GitHub ──────────
const SELF_EDIT_SYSTEM_PROMPT = (repo: string, branch: string) =>
  `${SENIOR_DEV_ROLE}
## Self-Edit Mode — ACTIVE
You have READ and WRITE access to the Муравей (Ant) platform source code via GitHub API.
Engine Repository: ${repo} (branch: ${branch})

To list files in a directory:
\`\`\`action
{"action":"list","path":"src/lumen"}
\`\`\`

To read ONE file:
\`\`\`action
{"action":"read","path":"src/lumen/LumenApp.tsx"}
\`\`\`

To read MULTIPLE files at once:
\`\`\`action
{"action":"read_multiple","paths":["src/lumen/LumenApp.tsx","src/lumen/ChatPanel.tsx"]}
\`\`\`

To write/modify a file:
\`\`\`action
{"action":"write","path":"src/lumen/SomeFile.tsx","content":"...full file content..."}
\`\`\`

Workflow:
1. Use list to explore directories
2. Use read_multiple to read several files at once (faster!)
3. Plan minimal changes
4. WRITE complete updated file content
5. Confirm changes

Rules:
- Always read before writing
- Prefer read_multiple over multiple single reads
- Write the COMPLETE file content, not just changed parts
- Respond in Russian to the user, keep code in English`;



let msgCounter = 0;

export default function LumenApp() {
  const { authed, login, logout } = useLumenAuth();
  const { ghSettings, saveGhSettings, fetchFromGitHub, pushToGitHub, syncEngine } = useGitHub();

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [deployResult, setDeployResult] = useState<{ id: number; ok: boolean; message: string } | null>(null);
  const [currentFileSha, setCurrentFileSha] = useState<string>("");
  const [currentFilePath, setCurrentFilePath] = useState<string>("");
  const [loadingFromGitHub, setLoadingFromGitHub] = useState(false);
  const [fullCodeContext, setFullCodeContext] = useState<{ html: string; fileName: string } | null>(null);
  const [showRebuildBanner, setShowRebuildBanner] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bottom navigation
  const [activeTab, setActiveTab] = useState<Tab>("home");

  // Self-Edit Mode
  const [selfEditMode, setSelfEditMode] = useState<boolean>(() => {
    try { return localStorage.getItem("lumen_self_edit") === "1"; } catch { return false; }
  });
  const handleSelfEditToggle = (v: boolean) => {
    setSelfEditMode(v);
    try { localStorage.setItem("lumen_self_edit", v ? "1" : "0"); } catch { /* ignore */ }
    setMessages(prev => [...prev, {
      id: ++msgCounter, role: "assistant",
      text: v
        ? "Self-Edit Mode включён. Теперь я могу читать и редактировать файлы платформы через Engine GitHub. Скажи что нужно изменить."
        : "Self-Edit Mode выключен. Работаю в обычном режиме.",
    }]);
  };

  // Sync Engine — скачать исходники платформы
  const [syncingEngine, setSyncingEngine] = useState(false);
  const handleSyncEngine = useCallback(async () => {
    setSyncingEngine(true);
    setCycleStatus("reading");
    setCycleLabel("Синхронизирую Engine...");
    try {
      const result = await syncEngine((msg) => setCycleLabel(msg));
      setCycleStatus(result.ok ? "done" : "error");
      setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: result.message }]);
    } catch (err) {
      setCycleStatus("error");
      setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка Sync Engine: ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setSyncingEngine(false);
    }
  }, [syncEngine]);

  // Сохраняем HTML в localStorage при каждом изменении
  const savePreviewHtml = (html: string | null) => {
    setPreviewHtml(prev => {
      if (prev) setHtmlHistory(h => [...h.slice(-9), prev]); // храним до 10 версий
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

  // Загружаем JSZip через CDN один раз
  useEffect(() => {
    if (!(window as unknown as Record<string, unknown>).JSZip) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      document.head.appendChild(script);
    }
  }, []);

  // Читаем ZIP и отдаём все текстовые файлы
  const readZipFiles = async (file: File): Promise<Record<string, string>> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JSZip = (window as any).JSZip;
    if (!JSZip) throw new Error("JSZip ещё не загружен, попробуйте ещё раз");
    const zip = await JSZip.loadAsync(file);
    const result: Record<string, string> = {};
    const textExts = [".tsx", ".ts", ".jsx", ".js", ".css", ".html", ".json", ".md", ".svg"];
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

  const handleLoadZip = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setConvertingZip(true);
    setCycleStatus("reading");
    setCycleLabel("Читаю архив...");

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const JSZip = (window as any).JSZip;
      if (!JSZip) throw new Error("JSZip ещё не загружен, попробуйте ещё раз");
      const zip = await JSZip.loadAsync(file);

      // Собираем все пути в архиве для диагностики
      const allPaths: string[] = [];
      zip.forEach((relativePath: string, zipEntry: { dir: boolean }) => {
        if (!zipEntry.dir) allPaths.push(relativePath);
      });
      console.log("[ZIP] Все файлы в архиве:", allPaths);

      // Ищем готовый index.html — сначала точные пути, потом любой index.html
      let foundHtml = "";
      let foundPath = "";

      // Точные кандидаты
      const candidates = ["dist/index.html", "build/index.html", "index.html"];
      for (const candidate of candidates) {
        const entry = zip.file(candidate);
        if (entry) {
          foundHtml = await entry.async("string");
          foundPath = candidate;
          break;
        }
      }

      // Любой index.html в любой вложенной папке
      if (!foundHtml) {
        // Приоритет: dist > build > корень > остальное
        const htmlFiles = allPaths.filter(p => p.endsWith("index.html"));
        console.log("[ZIP] Найдены index.html:", htmlFiles);
        const pick = htmlFiles.find(p => p.includes("dist/")) 
          || htmlFiles.find(p => p.includes("build/"))
          || htmlFiles[0];
        if (pick) {
          foundPath = pick;
          foundHtml = await zip.file(pick)!.async("string");
        }
      }

      console.log("[ZIP] Выбран файл:", foundPath, "| длина HTML:", foundHtml.length);

      if (foundHtml) {
        // Инлайним все .css и .js из архива прямо в HTML (без AI)
        setCycleLabel("Встраиваю стили и скрипты...");
        const baseDir = foundPath.includes("/") ? foundPath.slice(0, foundPath.lastIndexOf("/") + 1) : "";

        // Собираем все текстовые файлы из архива
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
        console.log("[ZIP] Assets найдено:", Object.keys(zipAssets));

        // Заменяем <link rel="stylesheet" href="..."> на инлайн <style>
        let inlinedHtml = foundHtml.replace(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi, (match, href) => {
          const normalized = href.startsWith("/") ? href.slice(1) : href;
          const key = zipAssets[baseDir + normalized] !== undefined ? baseDir + normalized
            : zipAssets[normalized] !== undefined ? normalized
            : Object.keys(zipAssets).find(k => k.endsWith(normalized.replace(/^.*\//, "")));
          if (key && zipAssets[key]) {
            console.log("[ZIP] Инлайн CSS:", key);
            return `<style>${zipAssets[key]}</style>`;
          }
          return match;
        });

        // Заменяем <script src="..."> на инлайн <script>
        inlinedHtml = inlinedHtml.replace(/<script([^>]+)src=["']([^"']+)["']([^>]*)><\/script>/gi, (match, pre, src, post) => {
          const normalized = src.startsWith("/") ? src.slice(1) : src;
          const key = zipAssets[baseDir + normalized] !== undefined ? baseDir + normalized
            : zipAssets[normalized] !== undefined ? normalized
            : Object.keys(zipAssets).find(k => k.endsWith(normalized.replace(/^.*\//, "")));
          if (key && zipAssets[key]) {
            console.log("[ZIP] Инлайн JS:", key);
            const attrs = (pre + post).replace(/\s*src=["'][^"']*["']/gi, "").replace(/\s*type=["']module["']/gi, "");
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
        // Готового HTML нет — конвертируем через ИИ
        const files = await readZipFiles(file);
        const fileCount = Object.keys(files).length;
        if (fileCount === 0) throw new Error("В архиве не найдены файлы проекта");

        const filesContext = Object.entries(files)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([path, content]) => `\n\n### Файл: ${path}\n\`\`\`\n${content.slice(0, 6000)}\n\`\`\``)
          .join("");

        const zipPrompt = `Конвертируй этот React/Vite проект (${fileCount} файлов) в один HTML файл. Сохрани все тексты, цвета и структуру точно как в оригинале. Верни ТОЛЬКО HTML.

--- ФАЙЛЫ ПРОЕКТА ---${filesContext}
--- КОНЕЦ ФАЙЛОВ ---`;

        setCycleLabel("Конвертирую...");
        setCycleStatus("generating");

        const rawResponse = await callAI(ZIP_CONVERT_SYSTEM_PROMPT, zipPrompt, (chars) => {
          setCycleLabel(`Конвертирую... ${chars} симв.`);
        });
        const cleanHtml = extractHtml(rawResponse);

        if (!/<[a-z][\s\S]*>/i.test(cleanHtml)) {
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
          text: `Проект «${file.name}» конвертирован (${fileCount} файлов). Опишите что нужно изменить — отредактирую.`,
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

  const extractHtml = (raw: string): string => {
    const mdMatch = raw.match(/```html\s*\n([\s\S]*?)```/i) || raw.match(/```\s*\n([\s\S]*?)```/);
    if (mdMatch) raw = mdMatch[1].trim();
    const tagMatch = raw.match(/(<!DOCTYPE[\s\S]*)/i) || raw.match(/(<html[\s\S]*)/i);
    return tagMatch ? tagMatch[1].trim() : raw.trim();
  };

  // Инжектирует принудительный светлый фон если в HTML нет явного светлого background
  const injectLightTheme = (html: string): string => {
    const forceCss = `<style data-lumen-fix>
      html,body{background:#ffffff!important;color:#111111!important;}
    </style>`;
    if (/<\/head>/i.test(html)) {
      return html.replace(/<\/head>/i, `${forceCss}</head>`);
    }
    if (/<body/i.test(html)) {
      return html.replace(/<body([^>]*)>/i, `<head>${forceCss}</head><body$1>`);
    }
    return forceCss + html;
  };

  // Инжектирует <base href> в HTML чтобы относительные пути assets/ работали через живой домен
  const injectBaseHref = (html: string, baseUrl: string): string => {
    if (!baseUrl) return html;
    const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    // Если уже есть <base> тег — заменяем его
    if (/<base\s[^>]*href/i.test(html)) {
      return html.replace(/<base\s[^>]*href=["'][^"']*["'][^>]*>/i, `<base href="${base}">`);
    }
    // Иначе вставляем сразу после <head>
    if (/<head>/i.test(html)) {
      return html.replace(/<head>/i, `<head>\n  <base href="${base}">`);
    }
    // Fallback — вставляем после <html>
    if (/<html[^>]*>/i.test(html)) {
      return html.replace(/(<html[^>]*>)/i, `$1\n<head><base href="${base}"></head>`);
    }
    return html;
  };

  const buildChatHistory = (currentUserText: string, maxPairs = 8): { role: string; content: string }[] => {
    // Берём последние maxPairs пар (user+assistant) из истории, исключая картинки и длинный HTML
    const history: { role: string; content: string }[] = [];
    const recent = messages.slice(-maxPairs * 2);
    for (const msg of recent) {
      if (msg.html?.startsWith("__IMAGE__:")) continue; // пропускаем картинки
      const content = msg.html
        ? msg.html.length > 8000 ? msg.text + "\n[предыдущий HTML-код сайта обрезан для экономии токенов]" : msg.html
        : msg.text;
      history.push({ role: msg.role === "user" ? "user" : "assistant", content });
    }
    history.push({ role: "user", content: currentUserText });
    return history;
  };

  const callAI = async (systemPrompt: string, userText: string, onProgress?: (chars: number) => void, useHistory = false): Promise<string> => {
    const rawBase = (settings.baseUrl || "").trim().replace(/\/+$/, "");
    const baseUrl = rawBase || "https://proxyapi.ru";
    const isOpenAI = settings.provider === "openai";

    const chatMessages = useHistory
      ? buildChatHistory(userText)
      : [{ role: "user", content: userText }];

    const requestBody = isOpenAI
      ? {
          __provider__: "openai",
          __base_url__: baseUrl,
          __api_key__: settings.apiKey.trim(),
          model: settings.model,
          messages: [
            { role: "system", content: systemPrompt },
            ...chatMessages,
          ],
          max_tokens: 16000,
        }
      : {
          __provider__: "claude",
          __base_url__: baseUrl,
          __api_key__: settings.apiKey.trim(),
          model: settings.model,
          max_tokens: 16000,
          system: systemPrompt,
          messages: chatMessages,
        };

    const proxyUrl = (settings.proxyUrl || "").trim() || (import.meta.env.VITE_AI_PROXY_URL || "https://functions.poehali.dev/60463e71-1a34-44dc-bde3-90a47fc07cba");

    let res: Response;
    try {
      res = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (e) {
      throw new Error(`Сетевая ошибка: ${String(e)}`);
    }

    // Читаем ответ с прогрессом
    const reader = res.body?.getReader();
    const decoder = new TextDecoder();
    let rawText = "";
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawText += decoder.decode(value, { stream: true });
        if (onProgress) onProgress(rawText.length);
      }
    } else {
      rawText = await res.text();
    }

    let data: Record<string, unknown>;
    try { data = JSON.parse(rawText); } catch {
      throw new Error(`Сервер вернул не JSON (HTTP ${res.status}): ${rawText.slice(0, 200)}`);
    }

    if (!res.ok || data.error) {
      const errMsg = data.error as { message?: string } | string | undefined;
      const detail = typeof errMsg === "string" ? errMsg : errMsg?.message;
      throw new Error(`HTTP ${res.status}: ${detail || rawText.slice(0, 200)}`);
    }

    if (isOpenAI) {
      return (data.choices as { message: { content: string } }[])?.[0]?.message?.content ?? "";
    } else {
      return (data.content as { text: string }[])?.[0]?.text ?? "";
    }
  };

  const IMAGE_GENERATE_URL = "https://functions.poehali.dev/0f178db7-a08a-4911-8f10-5f45a0d585a3";

  const handleSendImage = useCallback(async (text: string) => {
    setCycleStatus("generating");
    setCycleLabel("Генерирую картинку...");
    try {
      const r = await fetch(IMAGE_GENERATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const d = await r.json();
      if (d.url) {
        setCycleStatus("done");
        setCycleLabel("");
        setMessages(prev => [...prev, {
          id: ++msgCounter,
          role: "assistant",
          text: `Картинка готова!`,
          html: `__IMAGE__:${d.url}`,
        }]);
      } else {
        throw new Error(d.error || "Ошибка генерации");
      }
    } catch (err) {
      setCycleStatus("error");
      setCycleLabel("");
      const errText = err instanceof Error ? err.message : "Неизвестная ошибка";
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${errText}` }]);
    }
  }, []);

  const readFileFromGitHub = async (path: string, token: string, repo: string, branch: string): Promise<string | null> => {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (!res.ok) return null;
    const data = await res.json() as { content: string };
    return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ""))));
  };

  const handleSendChat = useCallback(async (text: string) => {
    if (!settings.apiKey) { setSettingsOpen(true); return; }
    setCycleStatus("generating");
    setCycleLabel("Думаю...");
    const token = ghSettings.token;
    const repo = ghSettings.repo;
    const branch = ghSettings.branch || "main";
    try {
      const repoInfo = token && repo
        ? `\n\nПодключён GitHub репозиторий: ${repo} (ветка: ${branch}). Если нужно прочитать файл из репозитория — используй action-блок:\n\`\`\`action\n{"action":"read","path":"src/App.tsx"}\n\`\`\``
        : "";
      const chatSystemPrompt = `Ты дружелюбный AI-ассистент Lumen. Отвечай кратко и по делу на русском языке. Помогай с вопросами о сайтах, бизнесе, маркетинге и всём остальном.${repoInfo}
${PROJECT_STRUCTURE}`;
      const response = await callAI(
        chatSystemPrompt,
        text,
        (chars) => setCycleLabel(`Думаю... ${chars} симв.`),
        true
      );

      // Обрабатываем action read — ИИ хочет прочитать файл
      const actionMatch = response.match(/```action\s*([\s\S]*?)```/);
      if (actionMatch && token && repo) {
        let actionData: { action: string; path?: string };
        try { actionData = JSON.parse(actionMatch[1].trim()); } catch { actionData = { action: "none" }; }

        if (actionData.action === "read" && actionData.path) {
          setCycleLabel("Читаю файл...");
          const fileContent = await readFileFromGitHub(actionData.path, token, repo, branch);
          const cleanResponse = response.replace(/```action[\s\S]*?```/, "").trim();
          if (fileContent !== null) {
            const sizeStr = fileContent.length < 1024
              ? `${fileContent.length} байт`
              : `${(fileContent.length / 1024).toFixed(1)} КБ`;
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `${cleanResponse}\n\nПрочитал файл \`${actionData.path}\` (${sizeStr}). Анализирую...`.trim() }]);
            const response2 = await callAI(
              chatSystemPrompt,
              `Файл \`${actionData.path}\`:\n\`\`\`\n${fileContent}\n\`\`\`\n\nТеперь выполни оригинальный запрос: ${text}`,
              (chars) => setCycleLabel(`Анализирую... ${chars} симв.`),
              false
            );
            setCycleStatus("done"); setCycleLabel("");
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response2 }]);
          } else {
            setCycleStatus("error"); setCycleLabel("");
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `${cleanResponse}\n\nНе удалось прочитать файл \`${actionData.path}\` — файл не найден или нет доступа.`.trim() }]);
          }
          return;
        }
      }

      setCycleStatus("done");
      setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response }]);
    } catch (err) {
      setCycleStatus("error");
      setCycleLabel("");
      const errText = err instanceof Error ? err.message : "Неизвестная ошибка";
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${errText}` }]);
    }
  }, [settings, ghSettings, messages]);

  // ── Генерация SQL-миграции по запросу в чате ───────────────────────────────
  const [pendingSql, setPendingSql] = useState<{ sql: string; explanation: string } | null>(null);

  const handleSqlRequest = useCallback(async (text: string) => {
    if (!settings.apiKey) { setSettingsOpen(true); return; }
    setCycleStatus("generating");
    setCycleLabel("Генерирую SQL...");
    try {
      const raw = await callAI(SQL_MIGRATION_SYSTEM_PROMPT, text, (chars) =>
        setCycleLabel(`Генерирую SQL... ${chars} симв.`), true
      );
      let parsed: { sql: string; explanation: string };
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch {
        parsed = { sql: raw, explanation: "SQL-миграция сгенерирована." };
      }
      setPendingSql(parsed);
      setCycleStatus("done");
      setCycleLabel("");
      setMessages(prev => [...prev, {
        id: ++msgCounter, role: "assistant",
        text: `SQL-миграция готова\n\n${parsed.explanation}\n\n${parsed.sql}\n\nНажмите кнопку «Скопировать SQL» ниже.`,
      }]);
    } catch (err) {
      setCycleStatus("error");
      setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${err instanceof Error ? err.message : String(err)}` }]);
    }
  }, [settings, messages]);

  // ── Утилита: список файлов в директории через GitHub API ──────────────────
  const listDirFromGitHub = async (dirPath: string, token: string, repo: string, branch: string): Promise<string | null> => {
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${dirPath}?ref=${branch}`;
    const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (!res.ok) return null;
    const data = await res.json() as { name: string; type: string; size: number }[];
    if (!Array.isArray(data)) return null;
    const lines = data.map(f => `${f.type === "dir" ? "📁" : "📄"} ${dirPath}/${f.name}${f.type === "file" ? ` (${f.size} байт)` : ""}`);
    return lines.join("\n");
  };

  // ── Self-Edit Mode — ИИ читает/пишет файлы платформы через GitHub API ────────
  const handleSelfEditChat = useCallback(async (text: string) => {
    if (!settings.apiKey) { setSettingsOpen(true); return; }
    const engineToken = ghSettings.engineToken || ghSettings.token;
    const engineRepo = ghSettings.engineRepo;
    const engineBranch = ghSettings.engineBranch || "main";

    setCycleStatus("generating");
    setCycleLabel("Self-Edit: думаю...");
    try {
      const systemPrompt = SELF_EDIT_SYSTEM_PROMPT(engineRepo, engineBranch);
      const response = await callAI(systemPrompt, text, (chars) => setCycleLabel(`Self-Edit: ${chars} симв.`), true);

      // Парсим action-блоки из ответа ИИ
      const actionMatch = response.match(/```action\s*([\s\S]*?)```/);
      if (actionMatch && engineToken) {
        let actionData: { action: string; path?: string; paths?: string[]; content?: string };
        try { actionData = JSON.parse(actionMatch[1].trim()); } catch { actionData = { action: "none" }; }

        // action: list — список файлов в директории
        if (actionData.action === "list" && actionData.path) {
          setCycleLabel("Self-Edit: читаю директорию...");
          const listing = await listDirFromGitHub(actionData.path, engineToken, engineRepo, engineBranch);
          const cleanResponse = response.replace(/```action[\s\S]*?```/, "").trim();
          if (listing) {
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `${cleanResponse}\n\nСодержимое \`${actionData.path}\`:\n\`\`\`\n${listing}\n\`\`\``.trim() }]);
            const response2 = await callAI(systemPrompt, `Содержимое директории ${actionData.path}:\n${listing}\n\nТеперь выполни запрос: ${text}`, (chars) => setCycleLabel(`Self-Edit: ${chars} симв.`), true);
            setCycleStatus("done"); setCycleLabel("");
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response2 }]);
          } else {
            setCycleStatus("error"); setCycleLabel("");
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `${cleanResponse}\n\nНе удалось прочитать директорию \`${actionData.path}\`.`.trim() }]);
          }
          return;
        }

        // action: read_multiple — читаем несколько файлов за раз
        if (actionData.action === "read_multiple" && actionData.paths && actionData.paths.length > 0) {
          setCycleLabel("Self-Edit: читаю файлы...");
          const cleanResponse = response.replace(/```action[\s\S]*?```/, "").trim();
          const filesContent: string[] = [];
          for (let i = 0; i < actionData.paths.length; i++) {
            const p = actionData.paths[i];
            setCycleLabel(`Self-Edit: читаю ${i + 1}/${actionData.paths.length}...`);
            const content = await readFileFromGitHub(p, engineToken, engineRepo, engineBranch);
            if (content !== null) {
              const sizeStr = content.length < 1024 ? `${content.length} байт` : `${(content.length / 1024).toFixed(1)} КБ`;
              filesContent.push(`### ${p} (${sizeStr})\n\`\`\`\n${content}\n\`\`\``);
            } else {
              filesContent.push(`### ${p}\n[файл не найден]`);
            }
          }
          setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `${cleanResponse}\n\nПрочитал ${filesContent.length} файл(ов). Анализирую...`.trim() }]);
          const response2 = await callAI(systemPrompt, `Содержимое файлов:\n\n${filesContent.join("\n\n")}\n\nТеперь выполни запрос: ${text}`, (chars) => setCycleLabel(`Self-Edit: ${chars} симв.`), false);
          setCycleStatus("done"); setCycleLabel("");
          setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response2 }]);
          return;
        }

        if (actionData.action === "read" && actionData.path) {
          setCycleLabel("Self-Edit: читаю файл...");
          const fileContent = await readFileFromGitHub(actionData.path, engineToken, engineRepo, engineBranch);
          if (fileContent !== null) {
            const cleanResponse = response.replace(/```action[\s\S]*?```/, "").trim();
            const sizeStr = fileContent.length < 1024 ? `${fileContent.length} байт` : `${(fileContent.length / 1024).toFixed(1)} КБ`;
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `${cleanResponse}\n\nПрочитал файл \`${actionData.path}\` (${sizeStr}). Продолжаю...`.trim() }]);
            const response2 = await callAI(systemPrompt, `Файл ${actionData.path}:\n\`\`\`\n${fileContent}\n\`\`\`\n\nТеперь выполни оригинальный запрос: ${text}`, (chars) => setCycleLabel(`Self-Edit: ${chars} симв.`), true);
            setCycleStatus("done"); setCycleLabel("");
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response2 }]);
            return;
          }
        }

        if (actionData.action === "write" && actionData.path && actionData.content) {
          setCycleLabel("Self-Edit: сохраняю файл...");
          const apiUrl = `https://api.github.com/repos/${engineRepo}/contents/${actionData.path}`;
          // Получаем текущий SHA
          let sha = "";
          try {
            const getRes = await fetch(`${apiUrl}?ref=${engineBranch}`, { headers: { Authorization: `Bearer ${engineToken}`, Accept: "application/vnd.github+json" } });
            if (getRes.ok) { const d = await getRes.json() as { sha: string }; sha = d.sha; }
          } catch { /* новый файл */ }
          const content = btoa(unescape(encodeURIComponent(actionData.content)));
          const reqBody: Record<string, string> = { message: `Lumen Self-Edit: обновил ${actionData.path}`, content, branch: engineBranch };
          if (sha) reqBody.sha = sha;
          const putRes = await fetch(apiUrl, { method: "PUT", headers: { Authorization: `Bearer ${engineToken}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" }, body: JSON.stringify(reqBody) });
          const cleanResponse = response.replace(/```action[\s\S]*?```/, "").trim();
          setCycleStatus(putRes.ok ? "done" : "error"); setCycleLabel("");
          setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: putRes.ok ? `${cleanResponse}\n\nФайл \`${actionData.path}\` успешно обновлён в ${engineRepo}.` : `${cleanResponse}\n\nОшибка сохранения файла: HTTP ${putRes.status}` }]);
          return;
        }
      }

      setCycleStatus("done"); setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response }]);
    } catch (err) {
      setCycleStatus("error"); setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка Self-Edit: ${err instanceof Error ? err.message : String(err)}` }]);
    }
  }, [settings, ghSettings, messages, selfEditMode]);

  const handleSend = useCallback(async (text: string, mode: ChatMode = "site") => {
    abortRef.current = false;
    const userMsg: Message = { id: ++msgCounter, role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setDeployResult(null);
    setPendingSql(null);

    if (mode === "chat") {
      // Self-Edit Mode — ИИ редактирует платформу через GitHub
      if (selfEditMode && ghSettings.engineRepo) {
        await handleSelfEditChat(text);
        return;
      }
      // Если запрос про БД/SQL — генерируем миграцию
      const isSqlRequest = /создай таблиц|добавь колонк|измени схему|миграци|sql|create table|alter table|добавь поле|удали колонк|индекс|foreign key|база данных.*изменить|изменить.*базу/i.test(text);
      if (isSqlRequest) {
        await handleSqlRequest(text);
      } else {
        await handleSendChat(text);
      }
      return;
    }

    if (mode === "image") {
      await handleSendImage(text);
      return;
    }

    // ── Режим "site" ───────────────────────────────────────────────────────
    if (!settings.apiKey) { setSettingsOpen(true); return; }

    try {
      // ── Шаг 1: читаем текущий код ─────────────────────────────────────────
      let currentHtml = "";
      let systemPrompt = CREATE_SYSTEM_PROMPT;

      if (fullCodeContext) {
        currentHtml = fullCodeContext.html;
        systemPrompt = LOCAL_FILE_EDIT_PROMPT(currentHtml, fullCodeContext.fileName);
      } else if (ghSettings.token && ghSettings.repo) {
        setCycleStatus("reading");
        const filePath = (ghSettings.filePath || "index.html").trim().replace(/^\//, "");
        setCycleLabel(`Читаю ${filePath} из GitHub...`);
        const fetched = await fetchFromGitHub();
        if (fetched.ok && fetched.html) {
          currentHtml = fetched.html;
          setCurrentFileSha(fetched.sha);
          setCurrentFilePath(fetched.filePath);
          systemPrompt = EDIT_SYSTEM_PROMPT_FULL(currentHtml);
        }
      }

      if (abortRef.current) return;

      // ── Шаг 1.5: генерируем картинки если нужны ──────────────────────────
      let enrichedText = text;
      const wantsImages = /картинк|фото|изображени|баннер|галере|природ|интерьер|пейзаж|вид|товар|продукт|блюд|еда|ресторан|кафе|кофейн|магазин|спортзал|фитнес|отель|image|photo|banner|gallery|nature|landscape/i.test(text);
      if (wantsImages) {
        setCycleStatus("generating");
        setCycleLabel("Генерирую картинки...");
        const imgPromptsRaw = await callAI(
          `Пользователь просит создать сайт. Определи какие картинки нужны и придумай 2-3 коротких описания на английском языке для генерации изображений через AI.
Правила: описания должны точно соответствовать теме сайта, быть визуально красивыми, фотореалистичными.
Верни ТОЛЬКО JSON массив строк, например: ["modern gym interior with equipment", "fitness trainer with client"].
Без пояснений, только JSON.`,
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
            enrichedText = `${text}

ВАЖНО: Я уже сгенерировал специальные картинки для этого сайта. ОБЯЗАТЕЛЬНО используй их в дизайне:
${urlList}

Требования к использованию картинок:
- Первая картинка — главный баннер/герой секция на всю ширину (object-fit: cover, height: 400-500px)
- Остальные картинки — в галерее, карточках или секциях сайта
- Все <img> должны иметь style="object-fit: cover" и заданные размеры
- НЕ используй placeholder-картинки — только переданные URL`;
          }
        }
      }

      if (abortRef.current) return;

      // ── Шаг 2: генерируем HTML ────────────────────────────────────────────
      setCycleStatus("generating");
      setCycleLabel("Создаю сайт...");

      // При редактировании (есть контекст) — передаём историю чата для памяти изменений
      const passHistory = !!(fullCodeContext || (ghSettings.token && ghSettings.repo && currentHtml));
      const rawResponse = await callAI(systemPrompt, enrichedText, (chars) => {
        setCycleLabel(`Создаю сайт... ${chars} симв.`);
      }, passHistory);
      const cleanHtml = extractHtml(rawResponse);

      if (!/<[a-z][\s\S]*>/i.test(cleanHtml)) {
        throw new Error(`Модель вернула не HTML: "${cleanHtml.slice(0, 200)}". Попробуйте ещё раз.`);
      }

      if (abortRef.current) return;

      const htmlWithBase = liveUrl ? injectBaseHref(cleanHtml, liveUrl) : cleanHtml;
      savePreviewHtml(injectLightTheme(htmlWithBase));
      setMobileTab("preview");

      const assistantId = ++msgCounter;
      const hasGitHub = !!(ghSettings.token && ghSettings.repo);
      setMessages(prev => [...prev, {
        id: assistantId,
        role: "assistant",
        text: currentHtml
          ? hasGitHub ? "Готово! Правки внесены. Загружаю в GitHub..." : "Готово! Правки внесены. Настройте GitHub чтобы сохранить."
          : hasGitHub ? "Готово! Сайт создан. Загружаю в GitHub..." : "Готово! Сайт создан. Настройте GitHub для сохранения.",
        html: cleanHtml,
      }]);

      // ── Показываем баннер о необходимости rebuild/публикации ──────────────
      setShowRebuildBanner(!ghSettings.token || !ghSettings.repo);

      // ── Шаг 3: автодеплой в GitHub ───────────────────────────────────────
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
  }, [settings, ghSettings, fetchFromGitHub, pushToGitHub, currentFilePath, fullCodeContext, liveUrl, handleSendChat, handleSendImage, handleSqlRequest]);

  const handleApply = useCallback(async (msgId: number, html: string) => {
    if (!ghSettings.token) { setSettingsOpen(true); return; }
    setDeployingId(msgId);
    setDeployResult(null);

    const filePath = currentFilePath || (ghSettings.filePath || "index.html").trim().replace(/^\//, "");
    setCycleStatus("generating");
    setCycleLabel(`Сохраняю ${filePath} в GitHub...`);

    const result = await pushToGitHub(html, currentFileSha, filePath);

    if (result.ok) {
      // Обновляем sha после успешного пуша
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
    if (!ghSettings.token || !ghSettings.repo) { setSettingsOpen(true); return; }
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
  }, [ghSettings, fetchFromGitHub]);

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
  }, []);

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
      setSettingsOpen(true);
      throw new Error("GitHub не настроен. Откройте настройки.");
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

  const handleSaveSettings = (s: Settings) => {
    setSettings(s);
    localStorage.setItem("lumen_settings", JSON.stringify(s));
  };

  const topStatus: "idle" | "generating" | "done" | "error" =
    cycleStatus === "reading" ? "generating" : cycleStatus;

  const isGenerating = cycleStatus === "generating" || cycleStatus === "reading";

  return (
    <AnimatePresence mode="wait">
      {!authed ? (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <LumenLoginPage onLogin={login} />
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
          {/* Show TopBar only on chat/preview tabs (desktop-like) */}
          {(activeTab === "chat" || activeTab === "projects") && (
            <LumenTopBar
              status={topStatus}
              cycleLabel={cycleLabel}
              selfEditActive={selfEditMode}
              onSettings={() => setSettingsOpen(true)}
              onLogout={logout}
            />
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".html,.htm"
            className="hidden"
            onChange={handleLoadLocalFile}
          />

          {/* Hidden ZIP input */}
          <input
            ref={zipInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={handleLoadZip}
          />

          {/* Main content area — switches between tabs */}
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <AnimatePresence mode="wait">

              {/* HOME TAB */}
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

              {/* CHAT TAB */}
              {activeTab === "chat" && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {/* Rebuild notification banner */}
                  {showRebuildBanner && (
                    <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-amber-950/60 border-b border-amber-500/30 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-amber-300 font-medium">Внесены правки в код — нажмите «Опубликовать»</span>
                      <button onClick={() => setShowRebuildBanner(false)} className="ml-auto text-amber-400/50 hover:text-amber-400 transition-colors text-[10px] px-2 py-0.5 rounded border border-amber-500/20">✕</button>
                    </div>
                  )}
                  {fullCodeContext && (
                    <div className="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-[#0d0d18] border-b border-cyan-500/20 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="text-white/40">Локальный файл:</span>
                      <span className="text-cyan-400 font-mono font-medium">{fullCodeContext.fileName}</span>
                      <button onClick={() => setFullCodeContext(null)} className="ml-auto text-white/20 hover:text-white/60 transition-colors text-[10px] px-2 py-0.5 rounded border border-white/10">✕</button>
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

                  {/* Mobile tab switcher chat/preview */}
                  <div className="md:hidden flex shrink-0 border-b border-white/[0.06] bg-[#0a0a0f]">
                    {(["chat", "preview"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setMobileTab(tab)}
                        className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                          mobileTab === tab ? "text-[#f59e0b] border-b-2 border-[#f59e0b]" : "text-white/40 border-b-2 border-transparent"
                        }`}
                      >
                        {tab === "chat" ? <><span>💬</span> Чат</> : <><span>🖥️</span> Сайт</>}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden relative md:flex md:gap-2 md:p-2">
                    <div className={`flex flex-col h-full md:w-[420px] md:flex-none bg-[#0a0a0f] md:static ${mobileTab === "chat" ? "absolute inset-0 z-10 flex" : "hidden md:flex"}`}>
                      <ChatPanel
                        status={cycleStatus}
                        cycleLabel={cycleLabel}
                        messages={messages}
                        onSend={handleSend}
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

                  {/* Ant worker animation */}
                  <AntWorker active={isGenerating} label={cycleLabel} />
                </motion.div>
              )}

              {/* PROJECTS TAB */}
              {activeTab === "projects" && (
                <motion.div
                  key="projects"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6"
                >
                  <span className="text-5xl">📁</span>
                  <h2 className="text-white font-bold text-xl">Мои проекты</h2>
                  <p className="text-white/40 text-sm text-center">Здесь будут ваши сохранённые сайты и приложения</p>
                  <button
                    onClick={() => setActiveTab("chat")}
                    className="mt-2 h-11 px-6 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ef4444] text-white font-semibold text-sm"
                  >
                    🐜 Создать первый проект
                  </button>
                </motion.div>
              )}

              {/* PROFILE TAB */}
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
                      🐜
                    </div>
                    <div className="text-center">
                      <h2 className="text-white font-bold text-lg">Профиль</h2>
                      <p className="text-white/40 text-xs">Муравей AI-разработчик</p>
                    </div>
                  </div>
                  <div className="px-4 py-4 flex flex-col gap-2">
                    <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-3 px-4 py-3.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-left hover:bg-white/[0.07] transition-all">
                      <span className="text-xl">⚙️</span>
                      <div>
                        <div className="text-white/80 text-sm font-medium">Настройки</div>
                        <div className="text-white/30 text-xs">API ключи, GitHub, модель</div>
                      </div>
                      <span className="text-white/20 ml-auto">→</span>
                    </button>
                    <button onClick={logout} className="flex items-center gap-3 px-4 py-3.5 bg-red-500/[0.05] border border-red-500/20 rounded-xl text-left hover:bg-red-500/[0.10] transition-all">
                      <span className="text-xl">🚪</span>
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

          {/* Bottom Navigation */}
          <BottomNav active={activeTab} onChange={setActiveTab} />

          <SettingsDrawer
            open={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            settings={settings}
            onSave={handleSaveSettings}
            ghSettings={ghSettings}
            onSaveGh={saveGhSettings}
            selfEditMode={selfEditMode}
            onSelfEditToggle={handleSelfEditToggle}
            onSyncEngine={handleSyncEngine}
            syncingEngine={syncingEngine}
            onLoadZip={() => zipInputRef.current?.click()}
            convertingZip={convertingZip}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}