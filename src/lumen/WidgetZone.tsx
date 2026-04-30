import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import { Widget } from "./LumenApp";

interface Props {
  widgets: Widget[];
  onAction: (action?: string) => void;
  onRemove: (id: string) => void;
}

export default function WidgetZone({ widgets, onAction, onRemove }: Props) {
  if (widgets.length === 0) return null;

  return (
    <div className="px-3 pb-2 pt-1 shrink-0">
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {widgets.map((w) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, scale: 0.85, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="relative group"
            >
              {w.kind === "button" && (
                <button
                  onClick={() => onAction(w.action)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: w.color || "var(--lumen-accent, #9333ea)",
                    color: "var(--lumen-text, #fff)",
                  }}
                >
                  {w.icon && <Icon name={w.icon} size={13} fallback="Sparkles" />}
                  {w.label || "Кнопка"}
                </button>
              )}

              {w.kind === "icon" && (
                <button
                  onClick={() => onAction(w.action)}
                  title={w.label}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center transition-all"
                  style={{
                    background: "var(--lumen-panel, rgba(255,255,255,0.05))",
                    borderColor: "var(--lumen-border, rgba(255,255,255,0.1))",
                    color: w.color || "var(--lumen-accent, #9333ea)",
                  }}
                >
                  <Icon name={w.icon || "Sparkles"} size={15} fallback="Sparkles" />
                </button>
              )}

              {w.kind === "text" && (
                <div
                  className="px-3 py-1.5 rounded-lg border text-xs"
                  style={{
                    background: "var(--lumen-panel, rgba(255,255,255,0.04))",
                    borderColor: "var(--lumen-border, rgba(255,255,255,0.08))",
                    color: w.color || "var(--lumen-text, #fff)",
                  }}
                >
                  {w.label}
                </div>
              )}

              {w.kind === "image" && w.imageUrl && (
                <div
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: "var(--lumen-border, rgba(255,255,255,0.1))" }}
                >
                  <img
                    src={w.imageUrl}
                    alt={w.label || ""}
                    className="w-24 h-24 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                  />
                </div>
              )}

              {w.kind === "card" && (
                <button
                  onClick={() => onAction(w.action)}
                  className="flex items-center gap-2 h-9 px-3 rounded-xl border text-xs font-medium transition-all"
                  style={{
                    background: "var(--lumen-panel, rgba(255,255,255,0.05))",
                    borderColor: "var(--lumen-border, rgba(255,255,255,0.1))",
                    color: "var(--lumen-text, #fff)",
                  }}
                >
                  {w.icon && (
                    <Icon
                      name={w.icon}
                      size={14}
                      fallback="Sparkles"
                      className=""
                    />
                  )}
                  {w.label || "Карточка"}
                </button>
              )}

              <button
                onClick={() => onRemove(w.id)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Удалить"
              >
                <Icon name="X" size={9} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
