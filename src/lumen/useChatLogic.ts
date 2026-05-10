
import { useState, useCallback, useRef } from "react";
import {
  CREATE_SYSTEM_PROMPT,
  EDIT_SYSTEM_PROMPT_FULL,
  LOCAL_FILE_EDIT_PROMPT,
  SQL_MIGRATION_SYSTEM_PROMPT,
} from "./prompts";
import { MusicService } from "../lib/MusicService";
import type { Message } from "./LumenApp";
import type { ChatMode } from "./ChatPanel";
import type { Settings } from "./LumenApp";
import type { GitHubSettings, GitHubFile } from "./useGitHub";

type CycleStatus = "idle" | "reading" | "generating" | "done" | "error";

let msgCounter = 0;

const IMAGE_GENERATE_URL = import.meta.env.VITE_IMAGE_GENERATE_URL || "";

interface UseChatLogicProps {
  settings: Settings;
  ghSettings: GitHubSettings;
  adminMode: boolean;
  selfEditMode: boolean;
  fullCodeContext: { html: string; fileName: string } | null;
  currentFile: GitHubFile | null;
  liveUrl: string;
  fetchFromGitHub: () => Promise<any>;
  pushToGitHub: (content: string, sha: string, path: string) => Promise<{ ok: boolean; message: string }>;
  savePreviewHtml: (html: string | null) => void;
  setMobileTab: (tab: "chat" | "preview") => void;
  setCurrentFile: (file: GitHubFile | null) => void;
}

export function useChatLogic({
  settings,
  ghSettings,
  adminMode,
  selfEditMode,
  fullCodeContext,
  currentFile,
  liveUrl,
  fetchFromGitHub,
  pushToGitHub,
  savePreviewHtml,
  setMobileTab,
  setCurrentFile,
}: UseChatLogicProps) {
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>("idle");
  const [cycleLabel, setCycleLabel] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [deployResult, setDeployResult] = useState<{ id: number; ok: boolean; message: string } | null>(null);
  const [pendingSql, setPendingSql] = useState<{ sql: string; explanation: string } | null>(null);
  const abortRef = useRef(false);

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

  const callAI = async (systemPrompt: string, userText: string, useHistory = false, timeoutMs = 300000): Promise<string> => {
    const rawBase = (settings.baseUrl || "").trim().replace(/\/+$/, "");
    const isOpenAI = settings.provider === "openai";

    const chatMessages = useHistory ? buildChatHistory(userText) : [{ role: "user", content: userText }];
    const maxTokens = 16000;
    const PROXYAPI_HOSTS = new Set(["proxyapi.ru", "www.proxyapi.ru", "api.proxyapi.ru"]);

    let endpoint: string;
    let reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
    let requestBody: Record<string, unknown>;

    if (isOpenAI) {
      const base = rawBase || (import.meta.env.VITE_DEFAULT_OPENAI_BASE || "https://api.proxyapi.ru/openai");
      const parsedHost = base.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
      endpoint = PROXYAPI_HOSTS.has(parsedHost) ? "https://api.proxyapi.ru/openai/v1/chat/completions" : base.endsWith("/v1") ? `${base}/chat/completions` : base.endsWith("/chat/completions") ? base : `${base}/v1/chat/completions`;
      reqHeaders["Authorization"] = `Bearer ${settings.apiKey.trim()}`;
      requestBody = { model: settings.model, messages: [{ role: "system", content: systemPrompt }, ...chatMessages], max_tokens: maxTokens };
    } else {
      const base = rawBase || (import.meta.env.VITE_DEFAULT_CLAUDE_BASE || "https://api.proxyapi.ru/anthropic");
      const parsedHost = base.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
      endpoint = PROXYAPI_HOSTS.has(parsedHost) ? "https://api.proxyapi.ru/anthropic/v1/messages" : base.endsWith("/v1") ? `${base}/messages` : base.endsWith("/messages") ? base : `${base}/v1/messages`;
      reqHeaders["x-api-key"] = settings.apiKey.trim();
      reqHeaders["anthropic-version"] = "2023-06-01";
      requestBody = { model: settings.model, max_tokens: maxTokens, system: systemPrompt, messages: chatMessages };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(endpoint, { method: "POST", headers: reqHeaders, body: JSON.stringify(requestBody), signal: controller.signal });
    } catch (e) {
      clearTimeout(timeoutId);
      if ((e as Error)?.name === "AbortError") throw new Error(`Превышено время ожидания (${timeoutMs / 1000} сек).`);
      throw new Error(`Сетевая ошибка: ${String(e)}`);
    }

    const rawText = await res.text();
    clearTimeout(timeoutId);
    
    let data: Record<string, unknown>;
    try { data = JSON.parse(rawText); } catch { throw new Error(`Сервер вернул не JSON (HTTP ${res.status}): ${rawText.slice(0, 300)}`); }

    if (!res.ok || data.error) {
      const errMsg = data.error as { message?: string } | string | undefined;
      const detail = typeof errMsg === "string" ? errMsg : errMsg?.message;
      throw new Error(`HTTP ${res.status}: ${detail || rawText.slice(0, 300)}`);
    }

    const content = isOpenAI ? (data.choices as any)?.[0]?.message?.content : (data.content as any)?.[0]?.text;
    if (!content) throw new Error("ИИ вернул пустой ответ. Проверьте настройки модели.");
    return content;
  };

  const extractArtifact = (raw: string): { text: string; artifact: string } => {
    const artifactMatch = raw.match(/<boltArtifact>([\s\S]*?)<\/boltArtifact>/i);
    if (artifactMatch?.[1]) {
      const artifact = artifactMatch[1].trim();
      const text = raw.substring(0, artifactMatch.index).trim() || "Готово! Внес изменения в код.";
      return { text, artifact };
    }
    const mdMatch = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
    if (mdMatch?.[1]) return { text: "Готово, вот код:", artifact: mdMatch[1].trim() };
    return { text: raw.trim(), artifact: "" };
  };

  const handleSendMusic = useCallback(async (text: string) => {
    setCycleStatus("generating");
    setCycleLabel("Создаю песню...");
    try {
      const tracks = await MusicService.generate(text);
      if (!tracks || tracks.length === 0) throw new Error("Не удалось создать песню.");
      setCycleStatus("done");
      setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Композиция готова: **${tracks[0].title}**`, track: tracks[0] }]);
    } catch (err) {
      setCycleStatus("error");
      setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${err instanceof Error ? err.message : "Неизвестная ошибка"}` }]);
    }
  }, []);

  const handleSendImage = useCallback(async (text: string) => {
    setCycleStatus("generating");
    setCycleLabel("Генерирую картинку...");
    try {
      let imageUrl: string;
      if (IMAGE_GENERATE_URL) {
        const r = await fetch(IMAGE_GENERATE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: text }) });
        const d = await r.json();
        if (!d.url) throw new Error(d.error || "Ошибка генерации");
        imageUrl = d.url;
      } else {
        imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=1024&height=768&nologo=true&enhance=true`;
        const check = await fetch(imageUrl, { method: "HEAD" });
        if (!check.ok) throw new Error(`Ошибка генерации: HTTP ${check.status}`);
      }
      setCycleStatus("done");
      setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Картинка готова!`, html: `__IMAGE__:${imageUrl}` }]);
    } catch (err) {
      setCycleStatus("error");
      setCycleLabel("");
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${err instanceof Error ? err.message : "Неизвестная ошибка"}` }]);
    }
  }, []);

  const handleSqlRequest = useCallback(async (text: string) => {
    setCycleStatus("generating");
    setCycleLabel("Проектирую SQL миграцию...");
    try {
        const response = await callAI(SQL_MIGRATION_SYSTEM_PROMPT, text);
        const match = response.match(/```sql\s*([\s\S]*?)```/);
        const sql = match ? match[1].trim() : "";
        const explanation = response.replace(/```sql[\s\S]*?```/, '').trim();
        if (!sql) {
            setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response }]);
        } else {
            setPendingSql({ sql, explanation });
        }
        setCycleStatus("done");
        setCycleLabel("");
    } catch (err) {
        setCycleStatus("error");
        setCycleLabel("");
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${err instanceof Error ? err.message : "Неизвестная ошибка"}` }]);
    }
  }, [settings, messages]);

  const handleSend = useCallback(async (text: string, mode: ChatMode = "site") => {
    abortRef.current = false;
    setMessages(prev => [...prev, { id: ++msgCounter, role: "user", text }]);
    setDeployResult(null);
    setPendingSql(null);

    if (!settings.apiKey) {
      setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: "API-ключ не найден. Администратору необходимо его ввести." }]);
      return;
    }

    try {
      if (mode === "music") { await handleSendMusic(text); return; }
      if (mode === "image") { await handleSendImage(text); return; }
      
      if (mode === "chat") {
        const isSqlRequest = /создай таблиц|добавь колонк|измени схему|миграци|sql|create table|alter table/i.test(text);
        if (isSqlRequest) { await handleSqlRequest(text); return; }
        
        setCycleStatus("generating");
        setCycleLabel("Думаю...");
        const response = await callAI("Ты — Муравей, дружелюбный и полезный ИИ-ассистент.", text, true);
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: response }]);
        setCycleStatus("done");
        setCycleLabel("");
        return;
      }

      // Default mode: "site"
      let currentHtml = "";
      const customAddition = settings.customPrompt?.trim() ? `\n\n## Дополнительные инструкции:\n${settings.customPrompt.trim()}` : "";
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
          setCurrentFile(fetched);
          systemPrompt = EDIT_SYSTEM_PROMPT_FULL(currentHtml) + customAddition;
        } else {
          // ИЗМЕНЕНИЕ: Показываем ошибку пользователю
          setCycleStatus("error");
          setCycleLabel("");
          setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Не удалось загрузить файл: ${fetched.message || 'Неизвестная ошибка GitHub'}` }]);
          return;
        }
      }

      if (abortRef.current) return;

      // ... (Image generation logic can be added here if needed)

      setCycleStatus("generating");
      setCycleLabel("Создаю сайт...");
      const passHistory = !!(fullCodeContext || (ghSettings.token && ghSettings.repo && currentHtml));
      const rawResponse = await callAI(systemPrompt, text, passHistory);
      
      const { text: chatText, artifact: cleanHtml } = extractArtifact(rawResponse);
      if (!cleanHtml || !/<[a-z][\s\S]*>/i.test(cleanHtml)) {
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: cleanHtml || chatText }]);
        setCycleStatus("done");
        setCycleLabel("");
        return;
      }

      if (abortRef.current) return;
      
      const injectBaseHref = (html: string, baseUrl: string): string => {
        if (!baseUrl) return html;
        const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
        if (/<base\s[^>]*href/i.test(html)) return html.replace(/<base\s[^>]*href=['"][^'"]*[''][^>]*>/i, `<base href=\"${base}\"/>`);
        if (/<head>/i.test(html)) return html.replace(/<head>/i, `<head>\n  <base href=\"${base}\"/>`);
        return html;
      };

      const htmlWithBase = liveUrl ? injectBaseHref(cleanHtml, liveUrl) : cleanHtml;
      savePreviewHtml(htmlWithBase);
      setMobileTab("preview");

      const assistantId = ++msgCounter;
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", text: chatText, html: cleanHtml }]);

      if (ghSettings.token && ghSettings.repo) {
        setCycleLabel("Загружаю в GitHub...");
        const filePath = currentFile?.filePath || (ghSettings.filePath || "index.html").trim().replace(/^\//, "");
        const pushResult = await pushToGitHub(cleanHtml, currentFile?.sha || "", filePath);
        if (pushResult.ok) {
          try {
            const fresh = await fetchFromGitHub();
            if (fresh.ok) setCurrentFile(fresh);
          } catch {}
        }
        setDeployResult({ id: assistantId, ...pushResult });
        setTimeout(() => setDeployResult(null), pushResult.ok ? 8000 : 30000);
      }
      setCycleStatus("done");
      setCycleLabel("");

    } catch (err) {
      if (!abortRef.current) {
        setCycleStatus("error");
        setCycleLabel("");
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: `Ошибка: ${err instanceof Error ? err.message : "Неизвестная ошибка"}` }]);
      }
    }
  }, [
    settings, ghSettings, fullCodeContext, currentFile, liveUrl, adminMode, selfEditMode, messages,
    fetchFromGitHub, pushToGitHub, savePreviewHtml, setMobileTab, setCurrentFile,
    handleSendMusic, handleSendImage, handleSqlRequest
  ]);
  
  const handleNewMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };
  
  const handleStop = () => {
    abortRef.current = true;
    setCycleStatus("idle");
    setCycleLabel("");
  };

  const handleApply = useCallback(async (msgId: number, html: string) => {
    if (!ghSettings.token) {
        setMessages(prev => [...prev, { id: ++msgCounter, role: "assistant", text: "GitHub-репозиторий не настроен." }]);
        return;
    }
    setDeployingId(msgId);
    setDeployResult(null);

    const filePath = currentFile?.filePath || (ghSettings.filePath || "index.html").trim().replace(/^\//, "");
    setCycleStatus("generating");
    setCycleLabel(`Сохраняю ${filePath} в GitHub...`);

    const result = await pushToGitHub(html, currentFile?.sha || "", filePath);
    if (result.ok) {
      try {
        const fresh = await fetchFromGitHub();
        if (fresh.ok) setCurrentFile(fresh);
      } catch {}
    }
    setCycleStatus(result.ok ? "done" : "error");
    setCycleLabel("");
    setDeployingId(null);
    setDeployResult({ id: msgId, ...result });
    setTimeout(() => setDeployResult(null), result.ok ? 6000 : 30000);
  }, [ghSettings, pushToGitHub, fetchFromGitHub, currentFile, setCurrentFile]);


  return {
    cycleStatus,
    cycleLabel,
    messages,
    deployingId,
    deployResult,
    pendingSql,
    handleSend,
    handleNewMessage,
    handleStop,
    handleApply,
    setMessages,
    savePreviewHtml
  };
}

