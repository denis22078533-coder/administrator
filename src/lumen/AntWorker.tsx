import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
  active: boolean;
  label?: string;
}

function parseLabel(label: string): { step: string; chars?: number; detail?: string } {
  const fileMatch = label.match(/(\d+)\/(\d+)/);
  const charsMatch = label.match(/(\d+)\s*симв/);
  if (fileMatch) {
    return { step: label.replace(/\d+\/\d+.*/, "").replace(/\.\.\./g, "").trim(), detail: `${fileMatch[1]}/${fileMatch[2]}` };
  }
  if (charsMatch) {
    return { step: label.replace(/\d+\s*симв.*/, "").trim(), chars: parseInt(charsMatch[1]) };
  }
  return { step: label };
}

export default function AntWorker({ active, label }: Props) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (!active) { setDots("."); return; }
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, [active]);

  const { step, chars, detail } = parseLabel(label || "Строю сайт");

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="shrink-0 bg-[#0d0900] border-t border-[#f59e0b]/25 overflow-hidden"
        >
          {/* Animated progress bar */}
          <div className="h-0.5 bg-white/5 relative overflow-hidden">
            <motion.div
              animate={{ x: ["-100%", "150%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-y-0 w-2/5 bg-gradient-to-r from-transparent via-[#f59e0b] to-transparent"
            />
          </div>

          {/* Row */}
          <div className="flex items-center gap-2.5 px-3 py-2">
            <motion.span
              animate={{ rotate: [0, 8, 0, -8, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
              className="text-base shrink-0 select-none"
            >
              🐜
            </motion.span>

            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-[#f59e0b]/90 text-xs font-medium truncate">
                {step}{dots}
              </span>
              {chars !== undefined && chars > 0 && (
                <span className="text-white/30 text-[10px] shrink-0 tabular-nums">
                  {chars < 1024 ? `${chars} симв` : `${(chars / 1024).toFixed(1)} КБ`}
                </span>
              )}
              {detail && (
                <span className="bg-[#f59e0b]/15 text-[#f59e0b] text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0">
                  {detail}
                </span>
              )}
            </div>

            <motion.span
              animate={{ rotate: [0, -20, 0] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="text-sm shrink-0 select-none"
            >
              ⛏️
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
