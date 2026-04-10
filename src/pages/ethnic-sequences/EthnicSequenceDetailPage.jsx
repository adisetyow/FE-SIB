/**
 * pages/ethnic-sequences/EthnicSequenceDetailPage.jsx
 *
 * Halaman detail satu Ethnic Sequence:
 * - Info lengkap: nama etnis, tipe data, file, ukuran, status, tanggal
 * - Status badge dengan polling otomatis jika status UPLOADING
 * - Tombol "Gunakan untuk Analisis" → navigate ke /analyze dengan reference_id terisi
 * - Tombol Edit metadata
 * - Tombol Hapus dengan confirm dialog
 */
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Beaker,
  Pencil,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  FlaskConical,
  Calendar,
  HardDrive,
  Tag,
  Info,
  Lock,
} from "lucide-react";
import clsx from "clsx";
import { useState } from "react";

import { ethnicSequencesApi } from "../../api/ethnicSequencesApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatSize(mb) {
  if (!mb && mb !== 0) return "—";
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status display ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  READY: {
    label: "Siap Digunakan",
    color: "text-success-500",
    bg: "bg-success-500/10",
    icon: CheckCircle2,
  },
  UPLOADING: {
    label: "Sedang Diunggah",
    color: "text-warning-400",
    bg: "bg-warning-400/10",
    icon: Loader2,
  },
  FAILED: {
    label: "Upload Gagal",
    color: "text-danger-500",
    bg: "bg-danger-500/10",
    icon: XCircle,
  },
};

function StatusDisplay({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UPLOADING;
  const Icon = cfg.icon;
  return (
    <div
      className={clsx(
        "flex items-center gap-2 px-4 py-3 rounded-xl w-fit",
        cfg.bg,
      )}
    >
      <Icon
        size={18}
        className={clsx(cfg.color, status === "UPLOADING" && "animate-spin")}
      />
      <span className={clsx("text-sm font-semibold", cfg.color)}>
        {cfg.label}
      </span>
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, mono, className }) {
  if (!value && value !== 0) return null;
  return (
    <div
      className={clsx(
        "flex items-start gap-3 py-3 border-b border-[--border] last:border-0",
        className,
      )}
    >
      <div className="w-8 h-8 rounded-lg bg-[--bg-muted] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-[--text-tertiary]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-[--text-tertiary]">
          {label}
        </p>
        <p
          className={clsx(
            "text-sm text-[--text-primary] mt-0.5",
            mono && "font-mono",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EthnicSequenceDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: seq,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ethnic-sequence", id],
    queryFn: () => ethnicSequencesApi.getEthnicSequence(id),
    // Polling otomatis jika status UPLOADING — cek setiap 3 detik
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === "UPLOADING" ? 3000 : false;
    },
  });

  // Notifikasi saat status berubah dari UPLOADING → READY/FAILED
  useEffect(() => {
    if (!seq) return;
    if (seq.status === "READY")
      toast.success("File berhasil diunggah dan siap digunakan!");
    if (seq.status === "FAILED")
      toast.error("Upload gagal. Silakan hapus dan coba unggah ulang.");
  }, [seq?.status]);

  const deleteMutation = useMutation({
    mutationFn: () => ethnicSequencesApi.deleteEthnicSequence(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ethnic-sequences"] });
      toast.success("Sekuens etnis berhasil dihapus");
      navigate("/ethnic-sequences");
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus"),
  });

  if (isLoading) return <DetailSkeleton />;

  if (error || !seq) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Beaker size={40} className="text-[--text-tertiary]" />
        <p className="text-[--text-secondary]">Data tidak ditemukan.</p>
        <button
          onClick={() => navigate("/ethnic-sequences")}
          className="btn btn-ghost"
        >
          <ArrowLeft size={15} /> Kembali
        </button>
      </div>
    );
  }

  const isReady = seq.status === "READY";

  return (
    <div className="space-y-5 max-w-3xl">
      {/* ── Breadcrumb + Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={() => navigate("/ethnic-sequences")}
          className="flex items-center gap-2 text-sm text-[--text-secondary]
            hover:text-[--text-primary] transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Kembali ke Daftar
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/ethnic-sequences/${id}/edit`)}
            className="btn btn-glass btn-sm"
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="btn btn-danger btn-sm"
          >
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      </motion.div>

      {/* ── Header Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Avatar etnis */}
          <div
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500
            flex items-center justify-center flex-shrink-0 shadow-glow-primary"
          >
            <span className="text-white text-2xl font-display font-bold">
              {seq.ethnicity_name?.charAt(0)?.toUpperCase()}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold text-[--text-primary]">
                {seq.ethnicity_name}
              </h1>
              <span
                className={clsx(
                  "badge",
                  seq.data_type === "NORMAL" ? "badge-primary" : "badge-danger",
                )}
              >
                {seq.data_type}
              </span>
            </div>
            {seq.description && (
              <p className="text-sm text-[--text-secondary] leading-relaxed">
                {seq.description}
              </p>
            )}
            <div className="mt-3">
              <StatusDisplay status={seq.status} />
            </div>
            {seq.status === "UPLOADING" && (
              <p className="text-xs text-[--text-tertiary] mt-2 flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" />
                Halaman ini akan otomatis diperbarui saat proses selesai...
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Info Detail ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass rounded-2xl p-6"
      >
        <h2 className="font-display text-base font-bold text-[--text-primary] mb-4">
          Informasi File
        </h2>
        <InfoRow
          icon={FileText}
          label="Nama File"
          value={seq.original_filename}
          mono
        />
        <InfoRow
          icon={HardDrive}
          label="Ukuran File"
          value={formatSize(seq.file_size_mb)}
        />
        <InfoRow icon={Tag} label="Tipe Data" value={seq.data_type} />
        <InfoRow
          icon={Calendar}
          label="Diunggah"
          value={formatDate(seq.created_at)}
        />
        <InfoRow
          icon={Calendar}
          label="Diperbarui"
          value={formatDate(seq.updated_at)}
        />
        <InfoRow icon={Info} label="UUID" value={seq.id} mono />
      </motion.div>

      {/* ── Tombol Gunakan untuk Analisis ── */}
      {isReady && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <h2 className="font-display text-base font-bold text-[--text-primary] mb-1">
                Gunakan sebagai Referensi Analisis
              </h2>
              <p className="text-sm text-[--text-secondary]">
                Bandingkan sekuens sampel dengan referensi etnis{" "}
                <strong>{seq.ethnicity_name}</strong> ini untuk mendeteksi
                mutasi dan risiko penyakit spesifik.
              </p>
            </div>
            <button
              onClick={() =>
                navigate(
                  `/analyze?reference_id=${seq.id}&ethnicity=${encodeURIComponent(seq.ethnicity_name)}`,
                )
              }
              className="btn btn-primary btn-lg flex-shrink-0 relative overflow-hidden group"
            >
              <FlaskConical size={18} />
              Mulai Analisis
              <span
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15
                to-transparent skew-x-12 pointer-events-none"
              />
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Peringatan jika FAILED ── */}
      {seq.status === "FAILED" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.11 }}
          className="flex items-start gap-3 p-4 rounded-xl border border-danger-500/20 bg-danger-500/8"
        >
          <XCircle size={18} className="text-danger-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger-500">
              Upload Gagal
            </p>
            <p className="text-xs text-[--text-secondary] mt-0.5">
              Terjadi kesalahan saat mengunggah file. Hapus entri ini dan coba
              unggah ulang.
            </p>
            <button
              onClick={() => setDeleteOpen(true)}
              className="mt-2 text-xs text-danger-500 hover:underline font-medium"
            >
              Hapus dan upload ulang →
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Peringatan file tidak bisa diubah ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.14 }}
        className="flex items-center gap-2.5 text-xs text-[--text-tertiary] px-1"
      >
        <Lock size={12} />
        File FASTA tidak dapat diubah setelah upload. Untuk mengganti file,
        hapus entri ini dan upload ulang.
      </motion.div>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Hapus Sekuens Etnis"
        description={
          `Yakin ingin menghapus sekuens "${seq?.ethnicity_name}" (${seq?.data_type})? ` +
          `File FASTA di server juga akan dihapus secara permanen. ` +
          `Tindakan ini tidak dapat dibatalkan.`
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5 max-w-3xl animate-pulse">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="skeleton h-36 rounded-2xl" />
      <div className="skeleton h-52 rounded-2xl" />
    </div>
  );
}
