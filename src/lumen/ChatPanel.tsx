import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/ui/icon";
import { Message } from "./LumenApp";

export type ChatMode = "site" | "chat" | "image" | "music";

export interface MessageAction {
  label: string;
  payload: string;
}

interface ChatPanelProps {
  status: string;
  messages: Message[];
  onSend: (text: string) => void;
  onStop: () => void;
  onApply: (msgId: number) => void;
  deployingId: number | null;
  deployResult: { id: number; ok: boolean; message: string } | null;
  hasGitHub: boolean;
  currentTarget: string;
}

const ScrollToBottom = () => {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => el.current?.scrollIntoView({ behavior: "smooth" }), []);
  return <div ref={el} />;
};

const CHAT_MODES: { id: ChatMode; label: string; icon: any, placeholder: string }[] = [
  { id: "site", label: "Создаю сайт", icon: "Globe", placeholder: "Опишите сайт, который вы хотите создать..." },
  { id: "chat", label: "Чат", icon: "MessageCircle", placeholder: "Напишите что угодно — чат, картинку или песню..." },
];

export default function ChatPanel({
  status,
  messages,
  onSend,
  onStop,
  onApply,
  deployingId,
  deployResult,
  hasGitHub,
  currentTarget,
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<ChatMode>("site");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isGenerating = status === "generating" || status === "reading";
  const currentPlaceholder = CHAT_MODES.find(m => m.id === mode)?.placeholder || "Напишите что угодно...";

  const handleSend = () => {
    if (text.trim() && !isGenerating) {
      onSend(text);
      setText("");
    }
  };
  
  const handleButtonAction = (payload: string) => {
      onSend(payload);
  };

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [text]);

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id || `msg-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`w-auto max-w-full md:max-w-[90%] lg:max-w-[85%] px-4 py-2.5 rounded-2xl ${msg.role === "user"
                ? "bg-[#f59e0b] text-black rounded-br-none"
                : "bg-white/[0.05] text-white/90 rounded-bl-none"}`}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">
                {msg.text}
              </p>
              {deployResult && deployResult.id === msg.id && (
                <div className={`mt-3 pt-2 text-xs border-t ${deployResult.ok ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>
                    {deployResult.message}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {lastMessage?.actions && lastMessage.actions.length > 0 && (
            <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start pt-2"
            >
                <div className="flex flex-wrap gap-2">
                    {lastMessage.actions.map((action, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleButtonAction(action.payload)}
                            className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.15] text-white/80 rounded-lg text-sm transition-colors"
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            </motion.div>
        )}

        <ScrollToBottom />
      </div>

      {/* Fixed controls at the bottom */}
      <div className="p-2 shrink-0 bg-[#0a0a0f] border-t border-white/[0.06]">
        <div className="bg-white/[0.04] rounded-xl flex flex-col">
          <div className="relative flex items-center p-1.5">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={currentPlaceholder}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white/90 placeholder:text-white/40 resize-none focus:outline-none overflow-y-hidden"
              rows={1}
              style={{ maxHeight: "10em" }}
            />
            <div className="flex items-center gap-1.5 self-end p-1">
              {isGenerating ? (
                <button onClick={onStop} className="p-2 text-white/50 hover:text-white/80">
                  <Icon name="Square" size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!text.trim()}
                  className="p-2 rounded-lg bg-[#f59e0b] text-black disabled:opacity-50 disabled:cursor-not-allowed">
                  <Icon name="ArrowUp" size={18} />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between p-2 border-t border-white/[0.05]">
            <div className="flex items-center gap-1.5">
                {CHAT_MODES.map(m => (
                    <button 
                      key={m.id} 
                      onClick={() => setMode(m.id)} 
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${mode === m.id ? 'bg-white/10 text-white/80' : 'text-white/40 hover:bg-white/5'}`}>
                      <Icon name={m.icon} size={13} />
                      <span>{m.label}</span>
                    </button>
                ))}
            </div>
             {hasGitHub && lastMessage?.html && lastMessage.role === 'assistant' && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-white/40">Цель: {currentTarget}</span>
                    <button 
                        onClick={() => onApply(lastMessage.id)}
                        disabled={deployingId === lastMessage.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors bg-white/10 text-white/80 disabled:opacity-50 disabled:cursor-wait"
                    >
                        <Icon name="Github" size={13} />
                        <span>{deployingId === lastMessage.id ? 'Применяю...' : 'Применить в GitHub'}</span>
                    </button>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
