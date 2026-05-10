import { useState, useRef, useEffect, ChangeEvent } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/ui/icon";
import { Message } from "./LumenApp";

export type ChatMode = "site" | "chat" | "image" | "music";

interface ChatPanelProps {
  status: string;
  cycleLabel: string;
  messages: Message[];
  onSend: (text: string, mode: ChatMode) => void;
  onNewMessage: (message: Message) => void;
  onStop: () => void;
  onApply: (msgId: number, html: string) => void;
  deployingId: number | null;
  deployResult: { id: number; ok: boolean; message: string } | null;
  pendingSql: { sql: string; explanation: string } | null;
  hasGitHub: boolean;
  onOpenSettings: () => void;
}

const ScrollToBottom = () => {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => el.current?.scrollIntoView({ behavior: "smooth" }), []);
  return <div ref={el} />;
};

const CHAT_MODES: { id: ChatMode; label: string; icon: any, placeholder: string }[] = [
  { id: "site", label: "Создаю сайт", icon: "Globe", placeholder: "Опишите сайт, который вы хотите создать..." },
  { id: "chat", label: "Чат", icon: "MessageCircle", placeholder: "Напишите что угодно — чат, картинку или песню..." },
  // { id: "image", label: "Генерирую картинку", icon: "Image" },
  // { id: "music", label: "Создаю музыку", icon: "Music" },
];

export default function ChatPanel({
  status,
  cycleLabel,
  messages,
  onSend,
  onNewMessage,
  onStop,
  onApply,
  deployingId,
  deployResult,
  pendingSql,
  hasGitHub,
  onOpenSettings
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<ChatMode>("site");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isGenerating = status === "generating" || status === "reading";
  const currentPlaceholder = CHAT_MODES.find(m => m.id === mode)?.placeholder || "Напишите что угодно...";

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed, mode);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 500)}px`;
    }
  }, [text]);

  const renderMessageContent = (msg: Message) => {
    if (msg.html?.startsWith("__IMAGE__:")) {
        const imageUrl = msg.html.split(":")[1];
        return <img src={imageUrl} alt="Generated image" className="rounded-lg mt-2 max-w-full h-auto" />;
    }
    if (msg.track) {
        return (
          <div className="mt-2 bg-white/5 p-3 rounded-lg flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 rounded-md flex items-center justify-center">
              <Icon name="Music" className="text-white/40" size={24} />
            </div>
            <div className="flex-1">
                <p className="font-semibold text-white/80 text-sm">{msg.track.title}</p>
                <p className="text-white/40 text-xs">{msg.track.artist}</p>
            </div>
             <audio controls src={msg.track.audio_url} className="w-48 h-8"></audio>
          </div>
        );
    }
    return <p className="text-white/60 text-[0.9rem] leading-relaxed whitespace-pre-wrap">{msg.text}</p>;
  }
  
  return (
    <div className="h-full flex flex-col relative">
      {messages.length === 0 && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center px-4 -mt-10">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-5xl shadow-[0_0_40px_#f59e0b50] mb-6">
            🐜
          </div>
          <h1 className="text-white font-bold text-2xl mb-1">Муравей</h1>
          <p className="text-white/40 text-center">Начните с чистого холста и опишите свою идею</p>
          <div className="mt-8 flex gap-2">
            <button onClick={() => onSend("Создай простой сайт-портфолио для фотографа", "site")} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-white/70 hover:bg-white/10 transition-colors">
              Сайт фотографа
            </button>
            <button onClick={() => onSend("Сделай лендинг для мобильного приложения", "site")} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-white/70 hover:bg-white/10 transition-colors">
              Лендинг приложения
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-xl shrink-0">
                🐜
              </div>
            )}
            <div className={`max-w-[85%] ${msg.role === "user" ? "bg-blue-600/20 text-white/80" : "bg-white/[0.03]"} rounded-xl p-3`}>
                {renderMessageContent(msg)}
                {deployResult && deployResult.id === msg.id && (
                    <div className={`mt-2 text-xs flex items-center gap-2 ${deployResult.ok ? 'text-green-400' : 'text-red-400'}`}>
                        <Icon name={deployResult.ok ? "CheckCircle" : "XCircle"} size={14} />
                        {deployResult.message}
                    </div>
                )}
                 {msg.html && !msg.html.startsWith("__IMAGE__:") && (!deployResult || deployResult.id !== msg.id) && (
                     <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                        <button 
                            onClick={() => onApply(msg.id, msg.html || '')} 
                            className="px-2.5 py-1 bg-white/10 rounded-md text-xs text-white/70 hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            disabled={!hasGitHub || deployingId === msg.id}
                        >
                           {deployingId === msg.id ? <Icon name="Loader" className="animate-spin" size={12}/> : <Icon name="UploadCloud" size={12}/>}
                           {deployingId === msg.id ? 'Применяю...' : 'Применить в GitHub'}
                        </button>
                     </div>
                 )}
            </div>
            {msg.role === "user" && <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 shrink-0"> <Icon name="User" size={16} /> </div>}
          </motion.div>
        ))}
        {pendingSql && (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-3"
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center text-xl shrink-0">🐜</div>
                <div className="max-w-[85%] bg-white/[0.03] rounded-xl p-3 w-full">
                    <p className="text-white/60 text-[0.9rem] leading-relaxed whitespace-pre-wrap">{pendingSql.explanation}</p>
                    <pre className="bg-black/20 p-2 rounded-md mt-2 text-xs text-white/50 overflow-x-auto"><code>{pendingSql.sql}</code></pre>
                     <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                        <button className="px-2.5 py-1 bg-green-600/20 rounded-md text-xs text-green-300 hover:bg-green-600/30 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                           <Icon name="Check" size={12}/>
                           Применить миграцию
                        </button>
                         <button className="px-2.5 py-1 bg-white/10 rounded-md text-xs text-white/70 hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center gap-1.5">
                           <Icon name="Edit3" size={12}/>
                           Изменить
                        </button>
                     </div>
                </div>
            </motion.div>
        )}
        <ScrollToBottom />
      </div>

      <div className="shrink-0 p-2 pt-1 border-t border-white/[0.06] bg-[#0a0a0f]">
        <div className="flex items-center gap-2 mb-1.5">
            <div className="text-xs text-white/40 font-medium px-1.5">РЕЖИМ:</div>
             {CHAT_MODES.map(m => (
                <button 
                    key={m.id} 
                    onClick={() => setMode(m.id)} 
                    className={`px-2 py-0.5 rounded text-xs flex items-center gap-1.5 transition-colors ${mode === m.id ? 'bg-white/10 text-white/80' : 'text-white/40 hover:bg-white/5'}`}>
                    <Icon name={m.icon} size={12} />
                    {m.label}
                </button>
            ))}
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={currentPlaceholder}
            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder:text-white/30 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 py-2.5 pl-4 pr-24 transition-all scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            rows={1}
            style={{ maxHeight: 240, minHeight: 46 }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
             {isGenerating ? (
              <button
                onClick={onStop}
                className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/30 transition-colors"
              >
                <Icon name="Square" size={16} />
              </button>
            ) : (
              <>
                {/* <button className="w-8 h-8 flex items-center justify-center bg-white/5 text-white/60 rounded-full hover:bg-white/10 transition-colors"> <Icon name="Mic" size={16} /> </button> */}
                <button
                  onClick={handleSend}
                  disabled={!text.trim()}
                  className="w-8 h-8 flex items-center justify-center bg-amber-500 text-black rounded-full transition-colors disabled:bg-white/10 disabled:text-white/40"
                >
                  <Icon name="ArrowUp" size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
