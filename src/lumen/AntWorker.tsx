import { motion, AnimatePresence } from "framer-motion";

interface Props {
  active: boolean;
  label?: string;
}

export default function AntWorker({ active, label }: Props) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3 }}
          className="shrink-0 h-10 bg-[#0d0a00] border-t border-[#f59e0b]/20 flex items-center overflow-hidden relative px-3 gap-2"
        >
          {/* Running ant */}
          <motion.div
            animate={{ x: ["0%", "85%", "0%"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="text-lg shrink-0"
            style={{ display: "inline-block" }}
          >
            🐜
          </motion.div>

          {/* Ground */}
          <div className="flex-1 relative h-0.5 bg-white/5 rounded overflow-hidden">
            <motion.div
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#f59e0b]/40 to-transparent"
            />
          </div>

          {/* Label */}
          <span className="text-[#f59e0b]/70 text-xs font-medium shrink-0 max-w-[160px] truncate">
            {label || "Строю сайт..."}
          </span>

          {/* Shovel */}
          <span className="text-sm shrink-0">🔨</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
