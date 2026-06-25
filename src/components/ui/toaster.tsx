"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Info, TriangleAlert } from "lucide-react";
import { useToastStore } from "@/store/toast";

const ICON = {
  success: <Check size={15} className="text-signal-500" />,
  info: <Info size={15} className="text-info" />,
  error: <TriangleAlert size={15} className="text-danger" />,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-line-strong bg-elevated px-4 py-2.5 text-[13px] font-medium text-ink shadow-[0_12px_40px_-14px_rgba(8,30,33,0.35)]"
          >
            {ICON[t.tone]}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
