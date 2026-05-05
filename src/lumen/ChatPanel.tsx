import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import { Message } from "./LumenApp";
import CoreTab from "./CoreTab";
import { generateMusic } from "./services/SunoService"; // Импортируем сервис
import { useApiAuth } from "./useApiAuth"; // Импортируем для токена

type CycleStatus = "idle" | "reading" | "generating" | "done" | "error";
export type ChatMode = "chat" | "image" | "site" | "core" | "music"; // Добавляем 'music'

interface Props {
  status: CycleStatus;
  cycleLabel: string;
  messages: Message[];
  onSend: (text: string, mode: ChatMode) => void;
  onNewMessage: (message: Message) => void; // Добавляем для отправки ответа от Suno
  onStop: () => void;
  onApply: (msgId: number, html: string) => Promise<void>;
  deployingId: number | null;
  deployResult: { id: number; ok: boolean; message: string } | null;
  liveUrl: string;
  onOpenPreview?: () => void;
  onLoadFromGitHub?: () => void;
  loadingFromGitHub?: boolean;
  currentFilePath?: string;
  onLoadLocalFile?: () => void;
  hasLocalFile?: boolean;
  localFileName?: string;
  pendingSql?: { sql: string; explanation: string } | null;
  hasGitHub?: boolean;
  onOpenSettings?: () => void;
}

const SUGGESTIONS = [
  { text: "Сайт кофейни с меню и фотографиями", icon: "Globe" },
  { text: "Нарисуй красивый закат над морем", icon: "Image" },
  { text: "Создай песню про космос в стиле рок", icon: "Music" },
  { text: "Лендинг для фитнес-клуба с тарифами", icon: "Globe" },
];

function detectMode(text: string): ChatMode {
  const t = text.toLowerCase();
  const siteWords = /сайт|лендинг|страниц|портфолио|интернет.магазин|визитк|html|создай сайт|сделай сайт|напиши сайт/i;
  if (siteWords.test(t)) return "site";
  const imageWords = /^нарисуй|^сгенери|^создай фото|^создай картин|^сделай фото|^генер|нарисуй|draw |painting |photo of |image of /i;
  if (imageWords.test(t)) return "image";
  const musicWords = /создай песн|напиши песн|сделай трек|музык/i;
  if (musicWords.test(t)) return "music";
  const pureImageWords = /^(красив|сгенер|нарисуй|покажи|создай изображ)/i;
  if (pureImageWords.test(t)) return "image";
  return "chat";
}

const CYCLE_STEPS: { key: CycleStatus; label: string; icon: string }[] = [
  { key: "reading",    label: "Читаю текущий код...", icon: "Download" },
  { key: "generating", label: "Генерирую...",          icon: "Sparkles" },
];

const MODE_COLORS: Record<ChatMode, string> = {
  chat:  "#3b82f6",
  image: "#10b981",
  site:  "#9333ea",
  core:  "#f59e0b",
  music: "#ef4444", // Цвет для Музыки
};

const MODE_LABELS: Record<ChatMode, { icon: string; text: string }> = {
  chat:  { icon: "MessageCircle", text: "Отвечаю..." },
  image: { icon: "Image",         text: "Рисую картинку..." },
  site:  { icon: "Globe",         text: "Создаю сайт..." },
  core:  { icon: "Cpu",           text: "Ядро проекта" },
  music: { icon: "Music",         text: "Создаю музыку..." }, // Иконка и текст для Музыки
};

export default function ChatPanel({
  status, cycleLabel, messages, onSend, onNewMessage, onStop, onApply,
  deployingId, deployResult, liveUrl, onOpenPreview,
  onLoadFromGitHub, loadingFromGitHub, currentFilePath,
  onLoadLocalFile, hasLocalFile, localFileName, pendingSql,
  hasGitHub, onOpenSettings,
}: Props) {
  const { token } = useApiAuth(); // Получаем токен
  const [value, setValue] = useState("");
  const [activeMode, setActiveMode] = useState<ChatMode>("site");
  const [kbOffset, setKbOffset] = useState(0);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; type: "image" | "text" } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const toggleRecording = useCallback(() => {
    const SpeechRecognitionAPI = (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition || (window as Window & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert("Ваш браузер не поддерживает голосовой ввод. Попробуйте Chrome или Safari.");
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalTranscript = value;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += (finalTranscript ? " " : "") + t;
        else interim = t;
      }
      const display = finalTranscript + (interim ? (finalTranscript ? " " : "") + interim : "");
      setValue(display);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
      }
    };
    recognition.onend = () => { setIsRecording(false); };
    recognition.onerror = () => { setIsRecording(false); };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, value]);

  const handleCopySql = () => {
    if (!pendingSql) return;
    navigator.clipboard.writeText(pendingSql.sql).then(() => {
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    });
  };
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKbOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => { vv.removeEventListener("resize", onResize); vv.removeEventListener("scroll", onResize); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  const isActive = status === "reading" || status === "generating";
  const detectedInputMode = value.trim() ? detectMode(value) : "chat";
  const activeColor = MODE_COLORS[activeMode];

  const handleAttachFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setAttachedFile({ name: file.name, content: dataUrl, type: "image" });
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setAttachedFile({ name: file.name, content: text, type: "text" });
      };
      reader.readAsText(file, "utf-8");
    }
  }, []);

  const handleSend = async () => {
    if ((!value.trim() && !attachedFile) || isActive) return;
    let sendText = value.trim();
    if (attachedFile) {
      // ... (file attachment logic is unchanged)
      setAttachedFile(null);
    }
    if (!sendText) return;
    
    const mode = detectMode(sendText);
    
    // Сначала отправляем сообщение пользователя в чат
    onSend(sendText, mode); 
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Если режим - музыка, вызываем наш новый сервис
    if (mode === 'music') {
        if (!token) {
            onNewMessage({ id: Date.now(), role: 'assistant', text: 'Ошибка: вы не авторизованы.' });
            return;
        }

        const result = await generateMusic(sendText, token);

        if (result.error) {
            onNewMessage({ id: Date.now(), role: 'assistant', text: `Ошибка: ${result.error}` });
        } else if (result.audio_url) {
            onNewMessage({
                id: Date.now(),
                role: 'assistant',
                text: `Ваш трек готов!`,
                html: `__MUSIC__:${result.audio_url}` // Специальный префикс для музыки
            });
        }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const modeHint = value.trim() ? (
    detectedInputMode === "music" ? "🎵 Создам музыку" :
    detectedInputMode === "image" ? "🎨 Создам картинку" :
    detectedInputMode === "site"  ? "🌐 Создам сайт" :
    "💬 Отвечу на вопрос"
  ) : null;

  return (
    <div
      className="w-full h-full flex flex-col bg-[#0a0a0f] overflow-hidden"
      style={{ paddingBottom: kbOffset > 0 ? kbOffset : undefined }}
    >
      {/* Header with Mode Switcher */}
      <div className="px-4 py-2 border-b border-white/[0.06] flex items-center gap-2 shrink-0">
         <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg">
          {(Object.keys(MODE_LABELS) as ChatMode[]).filter(m => m !== 'image' && m !== 'chat').map(mode => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`h-7 px-3 rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors ${
                activeMode === mode ? "text-white bg-white/[0.08]" : "text-white/30 hover:bg-white/[0.05]"
              }`}
            >
              <Icon name={MODE_LABELS[mode].icon as any} size={12} className={activeMode === mode ? "opacity-100" : "opacity-50"} />
              {MODE_LABELS[mode].text.replace("...", "")}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {/* ... (GitHub status unchanged) */}
        </div>
      </div>

      {/* Content based on active mode */}
      {activeMode === 'core' ? (
        <CoreTab onOpenSettings={onOpenSettings!} />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {messages.length === 0 && !isActive && (
                <motion.div /* ... */ >
                  {/* ... (suggestions unchanged) */}
                </motion.div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  /* ... */
                  className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {/* Рендер картинки */}
                  {msg.role === "assistant" && msg.html?.startsWith("__IMAGE__:") && (
                    <div /* ... */ >
                       {/* ... (image display unchanged) */}
                    </div>
                  )}

                  {/* Рендер музыки */}
                  {msg.role === "assistant" && msg.html?.startsWith("__MUSIC__:") && (
                    <div className="flex flex-col gap-2 items-start max-w-[92%] w-full">
                       <audio controls src={msg.html.replace("__MUSIC__:", "")} className="w-full h-12 rounded-lg border border-white/[0.10]" />
                       <a
                        href={msg.html.replace("__MUSIC__:", "")}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 h-6 px-2.5 rounded-md bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.12] text-white/50 hover:text-white/80 text-[10px] font-semibold transition-colors"
                      >
                        <Icon name="Download" size={10} />
                        Скачать
                      </a>
                    </div>
                  )}


                  {!(msg.role === "assistant" && (msg.html?.startsWith("__IMAGE__:") || msg.html?.startsWith("__MUSIC__:"))) && (
                    <div
                      className={`max-w-[90%] px-3 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                        msg.role === "user"
                          ? "text-white rounded-tr-sm"
                          : "bg-white/[0.05] border border-white/[0.08] text-white/75 rounded-tl-sm"
                      }`}
                      style={msg.role === "user" ? { backgroundColor: "#9333ea99" } : {}}
                    >
                      {msg.text}
                    </div>
                  )}

                  {/* ... (download/preview buttons for site unchanged) */}
                </motion.div>
              ))}

              {isActive && (
                 <motion.div /* ... */ >
                    {/* ... (loading indicators unchanged) */}
                 </motion.div>
              )}

              <div ref={bottomRef} />
            </AnimatePresence>
          </div>
          {/* Input */}
          <div className="px-3 pb-3 pt-2 shrink-0 border-t border-white/[0.06]">
            {/* ... (file attachment, recording indicator, mode hint are mostly unchanged) */}
            
            <div
              className="flex items-end gap-2 bg-white/[0.04] border rounded-xl px-3 py-2.5 transition-all duration-300"
              style={{ borderColor: (value.trim() || attachedFile) ? MODE_COLORS[detectedInputMode] + "50" : "rgba(255,255,255,0.08)" }}
            >
             <button
                onClick={() => attachInputRef.current?.click()}
                disabled={isActive}
                className="shrink-0 mb-0.5 w-6 h-6 rounded-md flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.08] transition-colors disabled:opacity-30"
                title="Прикрепить файл или фото"
              >
                <Icon name="Plus" size={13} />
              </button>

              <motion.div className="shrink-0 mb-0.5 opacity-50" animate={{ color: MODE_COLORS[detectedInputMode] }} transition={{ duration: 0.3 }}>
                <Icon name={detectedInputMode === "music" ? "Music" : detectedInputMode === "image" ? "Image" : detectedInputMode === "site" ? "Globe" : "MessageCircle"} size={14} />
              </motion.div>
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Напишите что угодно — чат, картинку или сайт..."
                disabled={isActive}
                rows={1}
                className="flex-1 bg-transparent text-white/80 placeholder-white/20 text-xs resize-none outline-none leading-relaxed disabled:opacity-50"
                style={{ maxHeight: 120 }}
              />
              <motion.button
                onClick={toggleRecording}
                /* ... */
              >
                 {/* ... (mic icon) */}
              </motion.button>

              <motion.button
                onClick={handleSend}
                disabled={(!value.trim() && !attachedFile) || isActive}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white disabled:opacity-25 transition-all mb-0.5"
                animate={{ backgroundColor: (value.trim() || attachedFile) && !isActive ? MODE_COLORS[detectedInputMode] : "rgba(255,255,255,0.08)" }}
                transition={{ duration: 0.3 }}
                whileTap={{ scale: 0.9 }}
              >
                <Icon name="ArrowUp" size={13} />
              </motion.button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
