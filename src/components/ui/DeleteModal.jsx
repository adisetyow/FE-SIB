import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Loader2, X } from "lucide-react";

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading,
}) {
  const { t } = useTranslation();

  // Tutup modal jika user menekan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={isLoading ? undefined : onClose}
          />

          {/* Modal Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="glass relative w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[--border] overflow-hidden"
          >
            {/* Tombol Close (X) */}
            <button
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[--text-tertiary] hover:bg-[--bg-muted] hover:text-[--text-primary] transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col sm:flex-row gap-4 items-start mt-2">
              {/* Icon Warning */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-danger-500/10 flex items-center justify-center border border-danger-500/20">
                <AlertTriangle size={24} className="text-danger-500" />
              </div>

              {/* Teks */}
              <div className="flex-1 pt-1">
                <h3 className="text-lg font-bold text-[--text-primary] leading-tight">
                  {title || "Konfirmasi Hapus"}
                </h3>
                <p className="text-sm text-[--text-secondary] mt-2">
                  {description ||
                    t(
                      "common.confirmDelete",
                      "Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.",
                    )}
                </p>
              </div>
            </div>

            {/* Aksi Button */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="btn-ghost"
              >
                {t("common.cancel", "Batal")}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className="btn-danger min-w-[100px]"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  t("common.delete", "Hapus")
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
