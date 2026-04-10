/**
 * components/ui/ConfirmDialog.jsx
 * Dialog konfirmasi (biasanya untuk delete).
 * Muncul di tengah dengan animasi.
 */
import Modal from "./Modal";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  isLoading,
  variant = "danger", // 'danger' | 'warning'
}) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      hideClose
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-ghost"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="btn btn-danger"
          >
            {isLoading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
            ) : (
              <Trash2 size={15} />
            )}
            {confirmLabel || t("common.delete")}
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 rounded-2xl bg-danger-500/10 flex items-center justify-center">
          <AlertTriangle size={26} className="text-danger-500" />
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-[--text-primary] mb-1">
            {title || t("common.delete")}
          </h3>
          <p className="text-sm text-[--text-secondary] leading-relaxed">
            {description || t("common.confirmDelete")}
          </p>
        </div>
      </div>
    </Modal>
  );
}
