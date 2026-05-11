import { useState, useCallback, useRef } from "react";
import { CREATE_SYSTEM_PROMPT, EDIT_SYSTEM_PROMPT_FULL } from "./prompts";
import type { Message, Settings } from "./LumenApp";
import type { GitHubSettings, ProjectFile } from "./useGitHub";

type CycleStatus = "idle" | "reading" | "generating" | "done" | "error";
type CreationStep = 'idle' | 'awaiting_style' | 'awaiting_sections' | 'complete';

interface CreationState {
  step: CreationStep;
  siteType: string | null;
  style: string | null;
  sections: string[] | null;
}

let msgCounter = 0;
const generateUniqueId = () => Date.now() + (++msgCounter);

const STYLE_OPTIONS = ["Минимализм", "Яркий", "Корпоративный"];
const SECTIONS_OPTIONS = ["Главная", "О нас", "Услуги", "Проекты", "Контакты"];

interface UseChatLogicProps {
  settings: Settings;
  ghSettings: GitHubSettings;
  fullCodeContext: { html: string; files: ProjectFile[] };
  savePreviewHtml: (html: string | null) => void;
  setMobileTab: (tab: "chat" | "preview") => void;
  onApplyToGitHub: () => Promise<{ ok: boolean, message: string }>;
}

export function useChatLogic({
  settings,
  ghSettings,
  fullCodeContext,
  savePreviewHtml,
  setMobileTab,
  onApplyToGitHub,
}: UseChatLogicProps) {
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>("idle");
  const [cycleLabel, setCycleLabel] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [deployingId, setDeployingId] = useState<number | null>(null);
  const [deployResult, setDeployResult] = useState<{ id: number; ok: boolean; message: string } | null>(null);
  const [creationState, setCreationState] = useState<CreationState>({ step: 'idle', siteType: null, style: null, sections: null });
  const abortRef = useRef(false);

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...message, id: generateUniqueId() }]);
  }, []);

  const buildChatHistory = useCallback((currentUserText: string, maxPairs = 25): { role: string; content: string }[] => {
    const history: { role: string; content: string }[] = [];
    const recent = messages.slice(-maxPairs * 2);
    for (const msg of recent) {
      if (msg.html?.startsWith("__IMAGE__:")) continue;
      if (msg.track) continue;
      const content = msg.html ? msg.html.length > 64000 ? msg.text + "\n[HTML REDACTED]" : `<boltArtifact>${msg.html}</boltArtifact>` : msg.text;
      history.push({ role: msg.role === "user" ? "user" : "assistant", content });
    }
    history.push({ role: "user", content: currentUserText });
    return history;
  }, [messages]);

  const callAI = useCallback(async (systemPrompt: string, userText: string, useHistory = false, timeoutMs = 300000): Promise<string> => {
    const chatMessages = useHistory ? buildChatHistory(userText) : [{ role: "user", content: userText }];
    const maxTokens = 16000;
    const PROXYAPI_HOSTS = new Set(["proxyapi.ru", "www.proxyapi.ru", "api.proxyapi.ru"]);

    let endpoint: string;
    let reqHeaders: Record<string, string> = { "Content-Type": "application/json" };
    let requestBody: Record<string, unknown>;
    
    const base = (settings.baseUrl || "").trim().replace(/\/+$/, "");
    const parsedHost = base.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
    const useProxy = PROXYAPI_HOSTS.has(parsedHost);

    switch (settings.provider) {
        case "openai":
            endpoint = useProxy ? "https://api.proxyapi.ru/openai/v1/chat/completions" : `${base}/v1/chat/completions`;
            reqHeaders["Authorization"] = `Bearer ${settings.apiKey.trim()}`;
            requestBody = { model: settings.model, messages: [{ role: "system", content: systemPrompt }, ...chatMessages], max_tokens: maxTokens };
            break;
        case "claude":
            endpoint = useProxy ? "https://api.proxyapi.ru/anthropic/v1/messages" : `${base}/v1/messages`;
            reqHeaders["x-api-key"] = settings.apiKey.trim();
            reqHeaders["anthropic-version"] = "2023-06-01";
            requestBody = { model: settings.model, max_tokens: maxTokens, system: systemPrompt, messages: chatMessages };
            break;
        case "google":
            endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.googleGeminiKey.trim()}`;
            const googleMessages = chatMessages.map((m, i) => i === chatMessages.length - 1 ? { ...m, content: `${systemPrompt}\n\n${m.content}` } : m);
            requestBody = { contents: googleMessages.map(m => ({ role: m.role, parts: [{ text: m.content }] })) };
            break;
        case "deepseek":
            endpoint = "https://api.deepseek.com/chat/completions";
            reqHeaders["Authorization"] = `Bearer ${settings.deepseekApiKey.trim()}`;
            requestBody = { model: settings.model, messages: [{ role: "system", content: systemPrompt }, ...chatMessages], max_tokens: maxTokens };
            break;
        default:
            throw new Error(`Неизвестный провайдер: ${settings.provider}`);
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
    let content: string | undefined;
    switch (settings.provider) {
        case "openai": case "deepseek": content = (data.choices as any)?.[0]?.message?.content; break;
        case "claude": content = (data.content as any)?.[0]?.text; break;
        case "google": content = (data.candidates as any)?.[0]?.content?.parts?.[0]?.text; break;
    }
    if (!content) throw new Error("ИИ вернул пустой ответ. Проверьте настройки модели.");
    return content;
  }, [settings, buildChatHistory]);

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

  const triggerGeneration = useCallback(async (state: CreationState) => {
    const finalStyle = state.style || "Минимализм";
    const finalSections = state.sections || ["Главная", "О нас", "Услуги", "Контакты"];
    const siteType = state.siteType || "сайт";

    const prompt = `Создай ${siteType} в стиле «${finalStyle}» с разделами: ${finalSections.join(", ")}.`;
    
    addMessage({ role: "assistant", text: `Принято! Начинаю сборку (стиль: ${finalStyle}, разделы: ${finalSections.join(", ")})...` });

    setCreationState({ step: 'idle', siteType: null, style: null, sections: null }); // Reset state

    setCycleStatus("generating");
    setCycleLabel("Создаю сайт...");
    try {
      const rawResponse = await callAI(CREATE_SYSTEM_PROMPT, prompt, false);
      const { text: chatText, artifact: cleanHtml } = extractArtifact(rawResponse);

      if (!cleanHtml || !/<[a-z][\s\S]*>/i.test(cleanHtml)) {
        addMessage({ role: "assistant", text: cleanHtml || chatText });
      } else {
        savePreviewHtml(cleanHtml);
        setMobileTab("preview");
        addMessage({ role: "assistant", text: chatText, html: cleanHtml });
      }
      setCycleStatus("done");
    } catch (err) {
        setCycleStatus("error");
        addMessage({ role: "assistant", text: `Ошибка: ${err instanceof Error ? err.message : "Неизвестная ошибка"}` });
    }
    setCycleLabel("");

  }, [addMessage, callAI, savePreviewHtml, setMobileTab]);

  const processCreationFlow = useCallback(async (text: string, currentState: CreationState): Promise<boolean> => {
    let state = { ...currentState };
    const lowerText = text.toLowerCase();
    const isForceCreation = /создавай|приступай|генерируй|начинай/i.test(lowerText);
    
    if (isForceCreation) {
        await triggerGeneration(state);
        return true;
    }

    if (state.step === 'awaiting_style') {
        state.style = text;
        state.step = 'awaiting_sections';
        addMessage({
            role: 'assistant',
            text: `Отлично. Теперь выберите разделы для сайта. Вы можете добавить свои или выбрать из предложенных. Когда закончите, нажмите «Создавать».`,
            actions: SECTIONS_OPTIONS.map(s => ({ label: s, payload: `_action:add_section:${s}` }))
        });
    } else if (state.step === 'awaiting_sections') {
        let newSections = state.sections || [];
        if (text.startsWith('_action:add_section:')) {
            const section = text.replace('_action:add_section:', '');
            if (!newSections.includes(section)) newSections.push(section);
        } else {
             // Allow free text for sections
            const userSections = text.split(/[,\s]+/).filter(Boolean);
            newSections.push(...userSections);
        }
        state.sections = [...new Set(newSections)]; // a unique
        addMessage({
            role: 'assistant',
            text: `Добавлены разделы: **${state.sections.join(", ")}**. Добавьте еще или нажмите «Создавать».`,
            actions: SECTIONS_OPTIONS.filter(s => !state.sections?.includes(s)).map(s => ({ label: s, payload: `_action:add_section:${s}` }))
        });
    }

    setCreationState(state);
    return true; // Indicates the message was handled by the creation flow

  }, [addMessage, triggerGeneration]);


  const handleSend = useCallback(async (text: string) => {
    abortRef.current = false;
    if (!text.startsWith('_action:')) {
        addMessage({ role: "user", text });
    }
    setDeployResult(null);

    const activeApiKey = settings.provider === 'google' ? settings.googleGeminiKey : settings.provider === 'deepseek' ? settings.deepseekApiKey : settings.apiKey;
    if (!activeApiKey) {
        addMessage({ role: "assistant", text: "API-ключ не найден. Администратору необходимо его ввести." });
        return;
    }

    try {
        if (creationState.step !== 'idle') {
            await processCreationFlow(text, creationState);
            return;
        }

        const isSiteCreationIntent = /создай сайт|новый сайт|сделай сайт/i.test(text);
        if (isSiteCreationIntent && !fullCodeContext.html) {
            const siteType = text.replace(/создай|новый/i, '').trim();
            const newState: CreationState = { step: 'awaiting_style', siteType: siteType, style: null, sections: null };
            setCreationState(newState);
            addMessage({
                role: 'assistant',
                text: `Конечно! Давайте создадим ${siteType}. Какой стиль предпочитаете?`,
                actions: STYLE_OPTIONS.map(s => ({ label: s, payload: s }))
            });
            return;
        }

        // Default edit/chat logic
        setCycleStatus("generating");
        setCycleLabel(fullCodeContext.html ? "Редактирую..." : "Думаю...");

        const systemPrompt = fullCodeContext.html ? EDIT_SYSTEM_PROMPT_FULL(fullCodeContext.html) : CREATE_SYSTEM_PROMPT;
        const rawResponse = await callAI(systemPrompt, text, !!fullCodeContext.html);
        
        const { text: chatText, artifact: cleanHtml } = extractArtifact(rawResponse);
        if (!cleanHtml || !/<[a-z][\s\S]*>/i.test(cleanHtml)) {
            addMessage({ role: "assistant", text: cleanHtml || chatText });
        } else {
            savePreviewHtml(cleanHtml);
            setMobileTab("preview");
            addMessage({ role: "assistant", text: chatText, html: cleanHtml });
        }

        setCycleStatus("done");
        setCycleLabel("");

    } catch (err) {
        if (!abortRef.current) {
            setCycleStatus("error");
            setCycleLabel("");
            addMessage({ role: "assistant", text: `Ошибка: ${err instanceof Error ? err.message : "Неизвестная ошибка"}` });
        }
    }
  }, [ settings, fullCodeContext, creationState, addMessage, callAI, processCreationFlow, savePreviewHtml, setMobileTab ]);
    
  const handleStop = () => {
    abortRef.current = true;
    setCycleStatus("idle");
    setCycleLabel("");
  };

  const handleApply = useCallback(async (msgId: number) => {
    if (!ghSettings.token) {
        addMessage({ role: "assistant", text: "GitHub-репозиторий не настроен." });
        return;
    }
    setDeployingId(msgId);
    setDeployResult(null);
    setCycleStatus("generating");
    setCycleLabel(`Сохраняю проект в GitHub...`);

    const result = await onApplyToGitHub();

    setCycleStatus(result.ok ? "done" : "error");
    setCycleLabel("");
    setDeployingId(null);

    const finalMessage = result.ok ? "Код отправлен. Ракета GitHub запущена!" : result.message;
    setDeployResult({ id: msgId, ok: result.ok, message: finalMessage });
    
    setTimeout(() => setDeployResult(null), result.ok ? 6000 : 30000);
  }, [ghSettings, onApplyToGitHub, addMessage]);

  return {
    cycleStatus,
    cycleLabel,
    messages,
    deployingId,
    deployResult,
    handleSend,
    handleStop,
    handleApply,
    setMessages,
  };
}
