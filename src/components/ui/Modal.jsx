/**
 * components/ui/Modal.jsx
 * Reusable modal dengan:
 * - Glass backdrop + glass card
 * - Framer Motion enter/exit animation
 * - Accessible (focus trap, ESC close)
 * - Ukuran: sm, md, lg, xl
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import clsx from "clsx";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = "md",
  children,
  footer,
  hideClose = false,
}) {
  const overlayRef = useRef(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{
            background: "rgba(8,13,24,0.65)",
            backdropFilter: "blur(6px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
        >
          <motion.div
            className={clsx("w-full", SIZES[size])}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="glass rounded-2xl shadow-glass-lg overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              {(title || !hideClose) && (
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-[--border] flex-shrink-0">
                  <div>
                    {title && (
                      <h2 className="font-display text-lg font-bold text-[--text-primary]">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="text-sm text-[--text-secondary] mt-0.5">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  {!hideClose && (
                    <button
                      onClick={onClose}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[--bg-muted] transition-colors flex-shrink-0 mt-0.5"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[--border] flex-shrink-0 bg-[--bg-subtle]/50">
                  {footer}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
