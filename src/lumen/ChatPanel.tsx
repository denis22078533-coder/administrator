import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import { Message } from "./LumenApp";
import CoreTab from "./CoreTab";
import { generateMusic } from "./services/SunoService"; // Импортируем сервис
import { useApiAuth } from "./useApiAuth"; // Импортируем для токена

const generateUniqueId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
  deployingId, deployResult, pendingSql, hasGitHub, onOpenSettings,
}: Props) {
  const { token } = useApiAuth(); // Получаем токен
  const [value, setValue] = useState("");
  const [activeMode, setActiveMode] = useState<ChatMode>("site");
  const [kbOffset, setKbOffset] = useState(0);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string; type: "image" | "text" } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any | null>(null);

  const toggleRecording = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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
    recognition.onresult = (e: any) => {
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
      setAttachedFile(null);
    }
    if (!sendText) return;
    
    const mode = detectMode(sendText);
    
    onSend(sendText, mode); 
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    if (mode === 'music') {
        if (!token) {
            onNewMessage({ id: generateUniqueId(), role: 'assistant', text: 'Ошибка: вы не авторизованы.' });
            return;
        }

        const result = await generateMusic(sendText, token);

        if (result.error) {
            onNewMessage({ id: generateUniqueId(), role: 'assistant', text: `Ошибка: ${result.error}` });
        } else if (result.audio_url) {
            onNewMessage({
                id: generateUniqueId(),
                role: 'assistant',
                text: `Ваш трек готов!`,
                html: `__MUSIC__:${result.audio_url}`
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
        </div>
      </div>

      {activeMode === 'core' ? (
        <CoreTab onOpenSettings={onOpenSettings!} />
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {messages.length === 0 && !isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-1 flex flex-col items-center justify-center gap-4 -mt-8"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-3xl shadow-[0_0_30px_#f59e0b40]">
                    🐜
                  </div>
                  <h2 className="text-white font-bold text-xl">
                    Чем могу помочь?
                  </h2>
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setValue(s.text);
                          if (textareaRef.current) {
                            textareaRef.current.focus();
                          }
                        }}
                        className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1] text-white/50 hover:text-white/80 text-xs font-semibold transition-colors"
                      >
                        <Icon name={s.icon as any} size={12} />
                        {s.text}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {msg.role === "assistant" && msg.html?.startsWith("__IMAGE__:") && (
                    <div className="max-w-[90%] bg-white/[0.05] border border-white/[0.08] p-1.5 rounded-xl">
                      <img src={msg.html.replace("__IMAGE__:", "")} alt="Generated image" className="w-full max-w-xs rounded-lg" />
                    </div>
                  )}

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

                  {msg.role === 'assistant' && msg.html && !msg.html.startsWith('__') && hasGitHub && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        onClick={() => onApply(msg.id, msg.html!)}
                        disabled={deployingId === msg.id}
                        className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.12] text-white/50 hover:text-white/80 text-xs font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {deployingId === msg.id ? (
                          <>
                            <Icon name="Loader" className="animate-spin" size={12} />
                            <span>Применяется...</span>
                          </>
                        ) : (
                          <>
                            <Icon name="Github" size={12} />
                            <span>Применить</span>
                          </>
                        )}
                      </button>

                      {deployResult && deployResult.id === msg.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`text-xs font-medium flex items-center gap-1.5 ${deployResult.ok ? 'text-green-400/80' : 'text-red-400/80'}`}>
                          {deployResult.ok ? <Icon name="CheckCircle" size={13} /> : <Icon name="XCircle" size={13} />}
                          <span>{deployResult.message}</span>
                        </motion.div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}

              {isActive && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start max-w-[90%]"
                >
                  <div className="px-3 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/75 rounded-tl-sm flex items-center gap-2">
                    <Icon name="Sparkles" size={14} className="text-amber-400 animate-pulse" />
                    <span className="text-xs text-white/50">{cycleLabel}...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
             <div ref={bottomRef} />
          </div>
          <div className="px-3 pb-3 pt-2 shrink-0 border-t border-white/[0.06]">
            {pendingSql && (
              <div className="px-3 pb-2">
                <div className="bg-white/[0.03] border border-amber-400/20 rounded-lg p-3">
                  <h3 className="text-sm font-semibold text-amber-400">Предложена SQL-миграция</h3>
                  <p className="text-xs text-white/60 mt-1 mb-3">{pendingSql.explanation}</p>
                  <pre className="bg-black/20 p-2 rounded-md text-xs text-white/80 overflow-x-auto">
                    <code>{pendingSql.sql}</code>
                  </pre>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleCopySql}
                      className="flex items-center gap-1.5 h-7 px-3 rounded-md bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-400 text-xs font-semibold transition-colors"
                    >
                      <Icon name={sqlCopied ? "Check" : "Copy"} size={12} />
                      {sqlCopied ? "Скопировано" : "Копировать SQL"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="relative">
              {modeHint && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute bottom-full left-2 mb-1.5 px-2 py-0.5 bg-white/[0.1] text-white/50 text-[10px] font-semibold rounded-full"
                >
                  {modeHint}
                </motion.div>
              )}
              {attachedFile && (
                 <div className="absolute bottom-full left-0 right-0 p-2 bg-[#0a0a0f]">
                   <div className="flex items-start gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg p-2">
                    {attachedFile.type === "image" ? (
                      <img src={attachedFile.content} className="w-12 h-12 rounded-md object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-md bg-white/[0.05] flex items-center justify-center">
                        <Icon name="FileText" size={24} className="text-white/30"/>
                      </div>
                    )}
                     <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/60 font-semibold truncate">{attachedFile.name}</p>
                      <p className="text-[10px] text-white/40">{attachedFile.type === "image" ? "Изображение" : "Текстовый файл"}</p>
                    </div>
                     <button 
                      onClick={() => setAttachedFile(null)} 
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
                    >
                       <Icon name="X" size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div
              className="flex items-end gap-2 bg-white/[0.04] border rounded-xl px-3 py-2.5 transition-all duration-300"
              style={{ borderColor: (value.trim() || attachedFile) ? MODE_COLORS[detectedInputMode] + "50" : "rgba(255,255,255,0.08)" }}
            >
             <input type="file" ref={attachInputRef} onChange={handleAttachFile} className="hidden" />
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
                className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors mb-0.5 ${
                  isRecording ? "bg-red-500/20 text-red-400" : "text-white/30 hover:text-white/70 hover:bg-white/[0.08]"
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <Icon name="Mic" size={13} />
                </motion.button>

              {isActive ? (
                <motion.button
                  onClick={onStop}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white bg-red-500/60 hover:bg-red-500/90 transition-colors mb-0.5"
                  title="Остановить"
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon name="Square" size={12} />
                </motion.button>
              ) : (
                <motion.button
                  onClick={handleSend}
                  disabled={!value.trim() && !attachedFile}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white disabled:opacity-25 transition-all mb-0.5"
                  animate={{ backgroundColor: (value.trim() || attachedFile) ? MODE_COLORS[detectedInputMode] : "rgba(255,255,255,0.08)" }}
                  transition={{ duration: 0.3 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon name="ArrowUp" size={13} />
                </motion.button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
