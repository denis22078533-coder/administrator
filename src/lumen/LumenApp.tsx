import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
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
import { useMuraveyBalance } from "./useMuraveyBalance";
import PaywallModal from "./PaywallModal";

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
- Your response has two parts: 1. A brief summary of your work in Russian. 2. The full code artifact inside a <boltArtifact> block. Example: "Готово, я обновил заголовок.<boltArtifact><!DOCTYPE html>...</html></boltArtifact>". The code artifact must be complete and not contain any markdown fences like \`\`\`html.
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

const CREATE_SYSTEM_PROMPT = `${SENIOR_DEV_ROLE}\n## Task: Create a STUNNING, professional-grade website

## DESIGN QUALITY — THIS IS YOUR TOP PRIORITY:
- Create websites worthy of Awwwards, Dribbble, Behance — NEVER generic templates
- Bold, expressive typography: large hero headings (text-6xl/7xl+), clear hierarchy
- Rich color palette: use gradients, soft shadows, and accent colors — NEVER plain white/gray defaults
- CSS animations: fade-in on scroll (Intersection Observer), smooth hover transitions, subtle parallax
- Cards with depth: border-radius, box-shadow, hover lift effects (transform: translateY(-4px))
- Glassmorphism where fitting: backdrop-filter: blur(), semi-transparent backgrounds
- Micro-interactions: button hover, nav link underlines, icon rotations

## MANDATORY SITE STRUCTURE (all sections, every time):
1. **Navigation** — sticky, logo + menu links + CTA button, blur backdrop
2. **Hero** — full-screen or tall, punchy headline, subheadline, 2 CTA buttons, background visual (gradient/image/pattern)
3. **Social proof** — logos or numbers (e.g., "500+ clients", "10 years on market", "98% satisfaction")
4. **Features/Services** — 3-6 cards with Lucide icons, title, description
5. **About / How it works** — with steps or story
6. **Portfolio / Cases** — if applicable (grid of cards with hover overlay)
7. **Testimonials** — 2-3 cards with name, role, avatar (colored initials circle), quote
8. **FAQ** — accordion, 4-6 questions
9. **CTA Section** — bold background, compelling headline, form or button
10. **Footer** — logo, nav links, contacts, social icons, copyright

## Technical requirements:
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Lucide icons via CDN: <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
- Google Fonts via CDN — always pick 1-2 premium fonts matching the brand tone
- All JS inline in <script> tags. Fully responsive mobile-first
- Scroll animations: use IntersectionObserver to fade-in sections on scroll
- IMAGES: Use provided URLs directly. For placeholders use gradient backgrounds, NOT external image services
- For forms/payments — skeleton with clear comments for ЮKassa/Robokassa/СДЭК integration
- Write REAL persuasive copy — not "Lorem ipsum" or generic placeholders. Make it specific and compelling.`;

const EDIT_SYSTEM_PROMPT_FULL = (currentHtml: string) =>
  `${SENIOR_DEV_ROLE}\n## Task: Edit existing website code
Rules:
- Make EXACTLY the requested changes, nothing more
- Preserve all existing styles, structure, content that was NOT mentioned
- Keep the same framework/library versions already in the code

--- CURRENT SITE CODE ---\n${currentHtml}\n--- END OF CODE ---`;

const ZIP_CONVERT_SYSTEM_PROMPT = `${SENIOR_DEV_ROLE}\n## Task: Convert React/Vite project to single HTML file
Strict rules:
1. DO NOT invent new design or copy — reproduce EXACTLY what's in the source files
2. Preserve all text, headings, color scheme, fonts, spacing from the original
3. Load via CDN: Tailwind CSS, Lucide icons, Google Fonts (if used in source)
4. All JS inline in <script> tags. Fully responsive.`;

const LOCAL_FILE_EDIT_PROMPT = (currentHtml: string, fileName: string) =>
  `${SENIOR_DEV_ROLE}\n## Task: Edit uploaded file «${fileName}»
Make EXACTLY the requested changes — preserve everything else as-is.

--- CURRENT FILE CODE ---\n${currentHtml}\n--- END OF CODE ---`;

// ── SQL migration prompt ────────────────────────────────────────────────────
const SQL_MIGRATION_SYSTEM_PROMPT = `${SENIOR_DEV_ROLE}\n## Task: Generate SQL migration
Output a JSON object with two fields:
- "sql": complete SQL script (PostgreSQL + MySQL compatible where possible)
- "explanation": brief description in Russian (1-3 sentences)
Rules: USE IF NOT EXISTS, add comments, use VARCHAR over TEXT for MySQL compat, TINYINT(1) for bool.
Output ONLY valid JSON, no markdown fences.`;

// ── Self-Edit Mode промпт — ИИ редактирует платформу через GitHub ──────────
const SELF_EDIT_SYSTEM_PROMPT = (repo: string, branch: string) =>
  `${SENIOR_DEV_ROLE}\n## Self-Edit Mode — ACTIVE
You have READ and WRITE access to the Муравей (Ant) platform source code via GitHub API.
Engine Repository: ${repo} (branch: ${branch})\n
To list files in a directory:
\`\`\`action
{"action":"list","path":"src/lumen"}
\`\`\`\n
To read ONE file:
\`\`\`action
{"action":"read","path":"src/lumen/LumenApp.tsx"}
\`\`\`\n
To read MULTIPLE files at once:
\`\`\`action
{"action":"read_multiple","paths":["src/lumen/LumenApp.tsx","src/lumen/ChatPanel.tsx"]}
\`\`\`\n
To write/modify a file:
\`\`\`action
{"action":"write","path":"src/lumen/SomeFile.tsx","content":"...full file content..."}
\`\`\`\n
Workflow:
1. Use list to explore directories
2. Use read_multiple to read several files at once (faster!)
3. Plan minimal changes
4. You can perform multiple actions (read, write, list) in a single response if needed to solve the task.
5. WRITE complete updated file content
6. Confirm changes\n
Rules:
- Always read before writing
- Prefer read_multiple over multiple single reads
- Write the COMPLETE file content, not just changed parts
- Respond in Russian to the user, keep code in English`;



let msgCounter = 0;

export default function LumenApp() {
  const { loggedIn, authed, login, adminLogin, logout } = useLumenAuth();
  const { ghSettings, saveGhSettings, fetchFromGitHub, pushToGitHub, syncEngine } = useGitHub();

  // Баланс запросов (только для обычных пользователей)
  const {
    balance: muraveyBalance,
    spendRequest,
    createPayment,
    checkPayment,
    confirmTestPayment,
    restoreByEmail,
    fetchBalance,
  } = useMuraveyBalance(authed);
  const [paywallOpen, setPaywallOpen] = useState(false);

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

  // Публичный ИИ-режим — разрешает всем пользователям использовать чат
  const [publicAiEnabled, setPublicAiEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem("lumen_public_ai") === "1"; } catch { return false; }
  });
  const handlePublicAiToggle = (v: boolean) => {
    setPublicAiEnabled(v);
    try { localStorage.setItem("lumen_public_ai", v ? "1" : "0"); } catch (_e) { /* ignore */ }
  };
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

  const extractArtifact = (raw: string): { text: string; artifact: string } => {
    const artifactMatch = raw.match(/<boltArtifact>([\s\S]*?)<\/boltArtifact>/i);
    if (artifactMatch && artifactMatch[1]) {
      const artifact = artifactMatch[1].trim();
      const text = raw.substring(0, artifactMatch.index).trim() || "Готово! Внес изменения в код.";
      return { text, artifact };
    }
    // Fallback if the AI forgets the tag
    const mdMatch = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (mdMatch && mdMatch[1]) {
        return { text: "Готово, вот код:", artifact: mdMatch[1].trim() };
    }
    return { text: raw.trim(), artifact: "" };
  };

  // Инжектирует принудительный светлый фон если в HTML нет явного светлого background
  const injectLightTheme = (html: string): string => {
    const forceCss = `<style data-lumen-fix>\n      html,body{background:#ffffff!important;color:#111111!important;}\n    </style>`;
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

  const buildChatHistory = (currentUserText: string, maxPairs = 25): { role: string; content: string }[] => {
    // Берём последние maxPairs пар (user+assistant) из истории, исключая картинки и длинный HTML
    const history: { role: string; content: string }[] = [];
    const recent = messages.slice(-maxPairs * 2);
    for (const msg of recent) {
      if (msg.html?.startsWith("__IMAGE__:")) continue; // пропускаем картинки
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

    const maxTokens = 32000;

    // Определяем endpoint и заголовки для прямого вызова API
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

  // Генерация изображений через pollinations.ai (бесплатно, без API ключа)
  // или через свой сервис, если задан VITE_IMAGE_GENERATE_URL
  const IMAGE_GENERATE_URL = import.meta.env.VITE_IMAGE_GENERATE_URL || "";

  const handleSendImage = useCallback(async (text: string) => {
    setCycleStatus("generating");
    setCycleLabel("Генерирую картинку...");
    try {
      let imageUrl: string;

      if (IMAGE_GENERATE_URL) {
        // Используем свой сервис генерации (если задан VITE_IMAGE_GENERATE_URL)
        const r = await fetch(IMAGE_GENERATE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });
        const d = await r.json();
        if (!d.url) throw new Error(d.error || "Ошибка генерации");
        imageUrl = d.url;
      } else {
        // Pollinations.ai — бесплатный сервис, без API ключа
        const encodedPrompt = encodeURIComponent(text);
        imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&enhance=true`;
        // Проверяем доступность изображения
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

  const readFileFromGitHub = async (path: string, token: string, repo: string, branch: string): Promise<{ content: string; error?: never } | { content?: never; error: string }> => {
    if (!repo || !token) return { error: "Не настроен Engine-репозиторий или токен. Откройте Настройки → Engine GitHub." };
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`;
    let res: Response;
    try {
      res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    } catch (e) {
      return { error: `Сетевая ошибка при чтении ${path}: ${String(e)}` };
    }
    if (res.status === 401) return { error: `Ошибка авторизации (401). Проверьте токен GitHub в настройках Engine.` };
    if (res.status === 403) return { error: `Нет доступа (403) к файлу \`${path}\`. Проверьте права токена.` };
    if (res.status === 404) return { error: `Файл не найден (404): \`${path}\` в репозитории ${repo}` };
    if (!res.ok) return { error: `GitHub API вернул HTTP ${res.status} для \`${path}\`` };

    let data: { content?: string; type?: string; message?: string };
    try { data = await res.json(); } catch { return { error: `Не удалось разобрать ответ GitHub для \`${path}\`` }; }

    if (data.message) return { error: `GitHub: ${data.message}` };
    if (!data.content) return { error: `Файл \`${path}\` пуст или является директорией` };

    // Корректное декодирование base64 → UTF-8 (работает с кириллицей и любыми символами)
    try {
      const b64 = data.content.replace(/\s/g, "");
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      return { content: new TextDecoder("utf-8").decode(bytes) };
    } catch (e) {
      return { error: `Ошибка декодирования файла \`${path}\`: ${String(e)}` };
    }
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
        ? `\n\nПодключён GitHub репозиторий: ${repo} (ветка: ${branch}).
Доступны action-блоки для работы с файлами:
- Список файлов в директории: \`{"action":"list","path":"src/lumen"}\`
- Прочитать один файл: \`{"action":"read","path":"src/App.tsx"}\`
- Прочитать несколько файлов сразу: \`{"action":"read_multiple","paths":["src/App.tsx","src/lumen/LumenApp.tsx"]}\`

Ты можешь выполнять несколько действий (read, write, list) в одном ответе, если это необходимо для решения задачи.`
        : "";
      const chatSystemPrompt = `Давай содержательные отчеты о работе на русском языке. Будь лаконичен в описании, но не ограничивай длину генерируемого кода. Помогай с вопросами о сайтах, бизнесе, маркетинге и всём остальном.${repoInfo}\n${PROJECT_STRUCTURE}`;

      // ── Шаг 1: первый вызов ИИ ────────────────────────────────────────────
      const response = await callAI(
        chatSystemPrompt,
        text,
        (chars) => setCycleLabel(`Думаю... ${chars} симв.`),
        true
      );

      // ── Шаг 2: обрабатываем action-блоки ─────────────────────────────────
      const actionMatch = response.match(/```action\s*([\s\S]*?)```/g);
      if (actionMatch && token && repo) {
        
        const actions: any[] = [];
        for (const match of actionMatch) {
          try {
            actions.push(JSON.parse(match.replace(/```action\s*|```/g, "").trim()));
          } catch (e) { console.error("Invalid action JSON:", e) }
        }

        let currentText = response.replace(/```action[\s\S]*?```/g, "").trim();
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: currentText }]);

        for (const actionData of actions) {
          currentText = ""; // Clear previous action text

          // action: list
          if (actionData.action === "list" && actionData.path) {
            setCycleLabel(`Читаю директорию ${actionData.path}...`);
            const listing = await listDirFromGitHub(actionData.path, token, repo, branch);
            if (listing) {
              currentText = `Содержимое \`${actionData.path}\`:\n\`\`\`\n${listing}\n\`\`\``;
            } else {
              currentText = `Не удалось прочитать директорию \`${actionData.path}\`.`;
              setCycleStatus("error");
            }
          }

          // action: read_multiple
          else if (actionData.action === "read_multiple" && actionData.paths?.length) {
            const filesContent: string[] = [];
            const errors: string[] = [];
            for (let i = 0; i < actionData.paths.length; i++) {
              const p = actionData.paths[i];
              setCycleLabel(`Читаю файл ${i + 1}/${actionData.paths.length}: ${p}`);
              const result = await readFileFromGitHub(p, token, repo, branch);
              if (result.content !== undefined) {
                const sizeStr = result.content.length < 1024 ? `${result.content.length} байт` : `${(result.content.length / 1024).toFixed(1)} КБ`;
                const body = result.content.length > 64000 ? result.content.slice(0, 64000) + "\n... [обрезан]" : result.content;
                filesContent.push(`### ${p} (${sizeStr})\n\`\`\`\n${body}\n\`\`\``);
              } else {
                errors.push(`⚠️ ${p}: ${result.error}`);
                filesContent.push(`### ${p}\n[${result.error}]`);
              }
            }
            const errNote = errors.length ? `\n\n${errors.join("\n")}` : "";
            currentText = `Прочитал ${filesContent.length} файл(ов).${errNote}`;
          }

          // action: read (один файл)
          else if (actionData.action === "read" && actionData.path) {
            setCycleLabel(`Читаю ${actionData.path}...`);
            const result = await readFileFromGitHub(actionData.path, token, repo, branch);
            if (result.content !== undefined) {
              const sizeStr = result.content.length < 1024 ? `${result.content.length} байт` : `${(result.content.length / 1024).toFixed(1)} КБ`;
              const truncated = result.content.length > 64000 ? result.content.slice(0, 64000) + "\n... [обрезан]" : result.content;
              currentText = `Прочитал \`${actionData.path}\` (${sizeStr}).`;
            } else {
              currentText = `❌ ${result.error}`;
              setCycleStatus("error");
            }
          }

          if (currentText) {
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: currentText }]);
          }
        }

        setCycleLabel("Анализирую...");
        const finalResponse = await callAI(chatSystemPrompt, `Я получил запрошенную информацию. Теперь выполни оригинальный запрос: ${text}`, (c) => setCycleLabel(`Анализирую... ${c} симв.`), true);
        setCycleStatus("done"); setCycleLabel("");
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: finalResponse }]);
        return;

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

    // Проверяем обязательные настройки Engine
    if (!engineToken || !engineRepo) {
      setMessages(prev => [...prev, {
        id: ++msgCounter, role: "assistant",
        text: "⚠️ Self-Edit Mode: не настроен Engine-репозиторий или токен.\n\nОткройте **Настройки → Self-Edit / Engine GitHub** и заполните:\n- Engine Token (GitHub Personal Access Token)\n- Engine Repository (например: `your-user/your-repo`)\n- Engine Branch (обычно `main`)",
      }]);
      return;
    }

    setCycleStatus("generating");
    setCycleLabel("Self-Edit: думаю...");
    try {
      const systemPrompt = SELF_EDIT_SYSTEM_PROMPT(engineRepo, engineBranch);
      const response = await callAI(systemPrompt, text, (chars) => setCycleLabel(`Self-Edit: ${chars} симв.`), true);

      // Парсим action-блоки из ответа ИИ
      const actionMatches = response.match(/```action\s*([\s\S]*?)```/g);
      if (actionMatches && engineToken) {
        const actions: any[] = [];
        for (const match of actionMatches) {
          try {
            actions.push(JSON.parse(match.replace(/```action\s*|```/g, "").trim()));
          } catch (e) { console.error("Invalid action JSON:", e) }
        }

        let currentText = response.replace(/```action[\s\S]*?```/g, "").trim();
        if (currentText) {
          setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: currentText }]);
        }

        let followUpPrompt = "";

        for (const actionData of actions) {
          // action: list
          if (actionData.action === "list" && actionData.path) {
            setCycleLabel(`Self-Edit: читаю директорию...`);
            const listing = await listDirFromGitHub(actionData.path, engineToken, engineRepo, engineBranch);
            if (listing) {
              followUpPrompt += `Содержимое директории ${actionData.path}:\n${listing}\n\n`;
            } else {
              followUpPrompt += `Не удалось прочитать директорию ${actionData.path}.\n`;
            }
          }

          // action: read_multiple
          else if (actionData.action === "read_multiple" && actionData.paths && actionData.paths.length > 0) {
            setCycleLabel("Self-Edit: читаю файлы...");
            const filesContent: string[] = [];
            for (let i = 0; i < actionData.paths.length; i++) {
              const p = actionData.paths[i];
              setCycleLabel(`Self-Edit: читаю ${i + 1}/${actionData.paths.length}...`);
              const result = await readFileFromGitHub(p, engineToken, engineRepo, engineBranch);
              if (result.content !== undefined) {
                const sizeStr = result.content.length < 1024 ? `${result.content.length} байт` : `${(result.content.length / 1024).toFixed(1)} КБ`;
                const body = result.content.length > 64000 ? result.content.slice(0, 64000) + "\n... [обрезан]" : result.content;
                filesContent.push(`### ${p} (${sizeStr})\n\`\`\`\n${body}\n\`\`\``);
              } else {
                filesContent.push(`### ${p}\n[${result.error}]`);
              }
            }
            followUpPrompt += `Содержимое файлов:\n\n${filesContent.join("\n\n")}\n\n`;
          }

          // action: read
          else if (actionData.action === "read" && actionData.path) {
            setCycleLabel(`Self-Edit: читаю ${actionData.path}...`);
            const result = await readFileFromGitHub(actionData.path, engineToken, engineRepo, engineBranch);
            if (result.content !== undefined) {
              const sizeStr = result.content.length < 1024 ? `${result.content.length} байт` : `${(result.content.length / 1024).toFixed(1)} КБ`;
              const body = result.content.length > 64000 ? result.content.slice(0, 64000) + "\n... [обрезан]" : result.content;
              followUpPrompt += `Файл ${actionData.path}:\n\`\`\`\n${body}\n\`\`\`\n\n`;
            } else {
              followUpPrompt += `❌ ${result.error}\n`;
            }
          }
          
          // action: write
          else if (actionData.action === "write" && actionData.path && actionData.content) {
            setCycleLabel(`Self-Edit: сохраняю ${actionData.path}...`);
            const apiUrl = `https://api.github.com/repos/${engineRepo}/contents/${encodeURIComponent(actionData.path).replace(/%2F/g, "/")}`;
            let sha = "";
            try {
              const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(engineBranch)}`, {
                headers: { Authorization: `Bearer ${engineToken}`, Accept: "application/vnd.github+json" },
              });
              if (getRes.ok) sha = (await getRes.json()).sha || "";
            } catch {}

            const utf8Bytes = new TextEncoder().encode(actionData.content);
            const contentB64 = btoa(String.fromCharCode(...utf8Bytes));
            
            const reqBody: Record<string, string> = {
              message: `Муравей: обновил ${actionData.path}`,
              content: contentB64,
              branch: engineBranch,
            };
            if (sha) reqBody.sha = sha;

            const putRes = await fetch(apiUrl, {
              method: "PUT",
              headers: { Authorization: `Bearer ${engineToken}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
              body: JSON.stringify(reqBody),
            });

            if (putRes.ok) {
                setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `✅ Файл \`${actionData.path}\` сохранен.` }]);
            } else {
                const putData = await putRes.json().catch(() => ({}));
                setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `❌ Ошибка записи \`${actionData.path}\`: HTTP ${putRes.status} — ${putData.message || "неизвестная ошибка"}` }]);
            }
          }
        }

        if (followUpPrompt) {
            const response2 = await callAI(systemPrompt, `${followUpPrompt}Теперь выполни оригинальный запрос: ${text}`, (chars) => setCycleLabel(`Self-Edit: ${chars} симв.`), true);
            setCycleStatus("done"); setCycleLabel("");
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response2 }]);
        } else {
            setCycleStatus("done"); setCycleLabel("");
        }
        return;
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

    // Проверяем баланс для обычных пользователей
    if (!authed) {
      const canSend = await spendRequest();
      if (!canSend) {
        setPaywallOpen(true);
        return;
      }
    }

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
          const is404 = fetched.message?.includes("404");
          if (!is404) {
            // Реальная ошибка (токен, сеть) — прерываем и сообщаем
            throw new Error(`Не удалось прочитать файл из GitHub: ${fetched.message}`);
          }
          // 404 = файла ещё нет, создаём с нуля (нормально для первого раза)
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
            enrichedText = `${text}\n\nВАЖНО: Я уже сгенерировал специальные картинки для этого сайта. ОБЯЗАТЕЛЬНО используй их в дизайне:\n${urlList}\n\nТребования к использованию картинок:\n- Первая картинка — главный баннер/герой секция на всю ширину (object-fit: cover, height: 400-500px)\n- Остальные картинки — в галерее, карточках или секциях сайта\n- Все <img> должны иметь style="object-fit: cover" и заданные размеры\n- НЕ используй placeholder-картинки — только переданные URL`;
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
      
      const { text: chatText, artifact: cleanHtml } = extractArtifact(rawResponse);

      if (!cleanHtml) {
        setCycleStatus("done");
        setCycleLabel("");
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: chatText }]);
        return;
      }
      
      if (!/<[a-z][\s\S]*>/i.test(cleanHtml)) {
        throw new Error(`Модель вернула некорректный код в блоке <boltArtifact>: "${cleanHtml.slice(0, 200)}". Попробуйте ещё раз.`);
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
  }, [settings, ghSettings, fetchFromGitHub, pushToGitHub, currentFilePath, fullCodeContext, liveUrl, handleSendChat, handleSendImage, handleSqlRequest, authed, spendRequest]);

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

  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState(false);

  const handleAdminLogin = () => {
    const ok = adminLogin(adminPassword);
    if (ok) {
      setAdminModalOpen(false);
      setAdminPassword("");
      setAdminError(false);
      setSettingsOpen(true);
    } else {
      setAdminError(true);
      setAdminPassword("");
    }
  };

  const handleSettingsClick = () => {
    if (authed) {
      setSettingsOpen(true);
    } else {
      setAdminModalOpen(true);
      setAdminError(false);
      setAdminPassword("");
    }
  };

  return (
    <AnimatePresence mode="wait">
      {!loggedIn ? (
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
          {/* Admin password modal */}
          <AnimatePresence>
            {adminModalOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
                onClick={(e) => { if (e.target === e.currentTarget) { setAdminModalOpen(false); setAdminPassword(""); setAdminError(false); } }}
              >
                <motion.div
                  initial={{ scale: 0.92, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.92, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="w-full max-w-sm bg-[#111118] border border-white/[0.08] rounded-2xl p-6 flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#9333ea]/10 border border-[#9333ea]/20 flex items-center justify-center">
                      <Icon name="Lock" size={16} className="text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Доступ к настройкам</h3>
                      <p className="text-white/30 text-xs">Введите пароль администратора</p>
                    </div>
                  </div>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => { setAdminPassword(e.target.value); setAdminError(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdminLogin(); if (e.key === "Escape") { setAdminModalOpen(false); setAdminPassword(""); setAdminError(false); } }}
                    placeholder="Пароль"
                    autoFocus
                    className={`w-full h-10 bg-white/[0.04] border rounded-xl px-3 text-white/80 text-sm placeholder:text-white/20 outline-none transition-colors ${adminError ? "border-red-500/50 focus:border-red-500/70" : "border-white/[0.08] focus:border-[#9333ea]/40"}`}
                  />
                  {adminError && (
                    <p className="text-red-400 text-xs -mt-2">Неверный пароль</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setAdminModalOpen(false); setAdminPassword(""); setAdminError(false); }}
                      className="flex-1 h-9 rounded-xl border border-white/[0.08] text-white/40 text-sm hover:bg-white/[0.04] transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleAdminLogin}
                      className="flex-1 h-9 rounded-xl bg-[#9333ea] hover:bg-[#7e22ce] text-white text-sm font-semibold transition-colors"
                    >
                      Войти
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Show TopBar only on chat/preview tabs (desktop-like) */}
          {(activeTab === "chat" || activeTab === "projects") && (
            <LumenTopBar
              status={topStatus}
              cycleLabel={cycleLabel}
              selfEditActive={selfEditMode}
              isAdmin={authed}
              onSettings={handleSettingsClick}
              onLogout={authed ? logout : undefined}
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
                      {!authed && !publicAiEnabled ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
                          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-3xl">
                            🐜
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
                          onOpenSettings={() => setSettingsOpen(true)}
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
                    {/* Баланс запросов для обычных пользователей */}
                    {!authed && muraveyBalance && (
                      <div className={`flex items-center justify-between px-4 py-3.5 rounded-xl border ${muraveyBalance.total_requests_left === 0 ? "bg-red-500/[0.05] border-red-500/20" : "bg-[#f59e0b]/[0.05] border-[#f59e0b]/20"}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">🐜</span>
                          <div>
                            <div className="text-white/80 text-sm font-medium">Запросы к Муравью</div>
                            <div className={`text-xs ${muraveyBalance.total_requests_left === 0 ? "text-red-400" : "text-[#f59e0b]/70"}`}>
                              {muraveyBalance.total_requests_left === 0
                                ? "Запросы закончились"
                                : `Осталось ${muraveyBalance.total_requests_left} запросов`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setPaywallOpen(true)}
                          className="text-xs font-semibold text-[#f59e0b] hover:text-[#f59e0b]/80 transition-colors shrink-0"
                        >
                          Пополнить →
                        </button>
                      </div>
                    )}
                    <button onClick={handleSettingsClick} className="flex items-center gap-3 px-4 py-3.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-left hover:bg-white/[0.07] transition-all">
                      <span className="text-xl">⚙️</span>
                      <div>
                        <div className="text-white/80 text-sm font-medium">Настройки</div>
                        <div className="text-white/30 text-xs">{authed ? "API ключи, GitHub, модель" : "Только для администратора"}</div>
                      </div>
                      <span className="text-white/20 ml-auto">→</span>
                    </button>
                    {authed && (
                      <button onClick={logout} className="flex items-center gap-3 px-4 py-3.5 bg-red-500/[0.05] border border-red-500/20 rounded-xl text-left hover:bg-red-500/[0.10] transition-all">
                        <span className="text-xl">🚪</span>
                        <div>
                          <div className="text-red-400 text-sm font-medium">Выйти из режима администратора</div>
                          <div className="text-white/30 text-xs">Завершить сессию</div>
                        </div>
                      </button>
                    )}
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
            publicAiEnabled={publicAiEnabled}
            onPublicAiToggle={handlePublicAiToggle}
            onSyncEngine={handleSyncEngine}
            syncingEngine={syncingEngine}
            onLoadZip={() => zipInputRef.current?.click()}
            convertingZip={convertingZip}
          />

          <PaywallModal
            open={paywallOpen}
            onClose={() => setPaywallOpen(false)}
            freeRequestsLeft={muraveyBalance?.free_requests_left ?? 0}
            onCreatePayment={createPayment}
            onCheckPayment={checkPayment}
            onConfirmTest={confirmTestPayment}
            onRestoreByEmail={restoreByEmail}
            onPaid={() => { fetchBalance(); setPaywallOpen(false); }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
