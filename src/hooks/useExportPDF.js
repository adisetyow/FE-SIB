/**
 * hooks/useExportPDF.js
 * Custom hook yang menyederhanakan pemanggilan export PDF.
 * Mengelola loading state dan error handling.
 *
 * Cara pakai:
 *   const { exportPDF, isExporting } = useExportPDF()
 *   await exportPDF(() => exportDataToPDF({ ... }))
 */
import { useState, useCallback } from "react";
import toast from "react-hot-toast";

export function useExportPDF() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = useCallback(async (exportFn) => {
    setIsExporting(true);
    const loadingToast = toast.loading("Membuat PDF...");
    try {
      await exportFn();
      toast.success("PDF berhasil digenerate", { id: loadingToast });
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Gagal membuat PDF", { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportPDF, isExporting };
}
