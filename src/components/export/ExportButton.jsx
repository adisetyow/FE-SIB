/**
 * components/export/ExportButton.jsx
 * Reusable export button dengan dropdown PDF + Excel.
 *
 * Cara pakai:
 *   <ExportButton
 *     onExportPDF={async () => { await exportDataToPDF({...}) }}
 *     onExportExcel={() => { exportToExcel([...]) }}
 *   />
 */
import { useState, useRef, useEffect } from "react";
import {
  Download,
  FileText,
  FileSpreadsheet,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

export default function ExportButton({
  onExportPDF,
  onExportExcel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  async function handlePDF() {
    setOpen(false);
    if (!onExportPDF) return;
    setLoadingPDF(true);
    try {
      await onExportPDF();
    } finally {
      setLoadingPDF(false);
    }
  }

  function handleExcel() {
    setOpen(false);
    onExportExcel?.();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || loadingPDF}
        className="btn btn-glass btn-sm gap-1.5"
      >
        {loadingPDF ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Download size={14} />
        )}
        <span className="hidden sm:inline">Export</span>
        <ChevronDown
          size={12}
          className={clsx("transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 z-50 glass rounded-xl shadow-glass-md overflow-hidden min-w-[140px]"
          >
            {onExportPDF && (
              <button
                onClick={handlePDF}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[--text-primary] hover:bg-[--bg-muted] transition-colors"
              >
                <FileText size={14} className="text-danger-500" />
                Export PDF
              </button>
            )}
            {onExportExcel && (
              <button
                onClick={handleExcel}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[--text-primary] hover:bg-[--bg-muted] transition-colors"
              >
                <FileSpreadsheet size={14} className="text-success-500" />
                Export Excel
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
