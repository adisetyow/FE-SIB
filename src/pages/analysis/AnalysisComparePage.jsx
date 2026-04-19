/**
 * pages/analysis/AnalysisComparePage.jsx
 *
 * Halaman untuk menjalankan analisis perbandingan sekuens:
 *   POST /api/v1/analysis/compare-local
 *
 * Flow halaman:
 * ┌─ Step 1: Form Input ──────────────────────────────────────────┐
 * │  - Textarea sample sequence (min 10 karakter)                 │
 * │  - Dropdown pilih reference ethnic sequence (READY saja)      │
 * │  - Tombol "Mulai Analisis"                                    │
 * └───────────────────────────────────────────────────────────────┘
 *           ↓ submit → POST → dapat task_id
 * ┌─ Step 2: Polling ─────────────────────────────────────────────┐
 * │  - Status indicator: PENDING → PROCESSING → COMPLETED/FAILED  │
 * │  - Progress animasi (indeterminate)                           │
 * │  - Auto-refresh setiap 2.5 detik                             │
 * └───────────────────────────────────────────────────────────────┘
 *           ↓ status COMPLETED
 * ┌─ Step 3: Hasil ───────────────────────────────────────────────┐
 * │  - Alignment summary                                          │
 * │  - Total mutasi                                               │
 * │  - Tabel mutasi: posisi, basa referensi, basa sampel          │
 * │  - Link ke riwayat task                                       │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Juga mendukung query param ?reference_id=xxx&ethnicity=xxx
 * yang dikirim dari EthnicSequenceDetailPage tombol "Mulai Analisis"
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  FlaskConical,
  Dna,
  ChevronDown,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  BarChart2,
  ListTodo,
  ArrowRight,
  RefreshCw,
  Microscope,
  AlignJustify,
  Info,
  ChevronRight,
  Hash,
  HeartPulse,
} from "lucide-react";
import clsx from "clsx";

import { analysisApi } from "../../api/analysisApi";
import { ethnicSequencesApi } from "../../api/ethnicSequencesApi";
import { usePolling } from "../../hooks/usePolling";
import { FormField, Textarea } from "../../components/ui/FormField";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  PENDING: {
    label: "Menunggu antrian...",
    color: "text-warning-400",
    bg: "bg-warning-400/10",
    icon: Loader2,
    animate: true,
  },
  PROCESSING: {
    label: "Sedang dianalisis...",
    color: "text-accent-500",
    bg: "bg-accent-500/10",
    icon: Loader2,
    animate: true,
  },
  COMPLETED: {
    label: "Analisis selesai",
    color: "text-success-500",
    bg: "bg-success-500/10",
    icon: CheckCircle2,
    animate: false,
  },
  FAILED: {
    label: "Analisis gagal",
    color: "text-danger-500",
    bg: "bg-danger-500/10",
    icon: XCircle,
    animate: false,
  },
};

// ─── Dropdown pilih reference sequence ────────────────────────────────────────
function ReferenceSelect({ value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["ethnic-sequences-ready"],
    queryFn: () => ethnicSequencesApi.listEthnicSequences({ limit: 1000 }),
    select: (data) => data.filter((s) => s.status === "READY"), // hanya yang READY
  });

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const filtered = sequences.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.ethnicity_name?.toLowerCase().includes(q) ||
      s.data_type?.toLowerCase().includes(q)
    );
  });

  const selected = sequences.find((s) => s.id === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "input flex items-center gap-2 text-left w-full pr-9 cursor-pointer",
          error && "input-error",
          open &&
            "border-[--border-focus] shadow-[0_0_0_3px_rgba(0,191,191,0.12)]",
        )}
      >
        <Dna size={15} className="text-[--text-tertiary] flex-shrink-0" />
        {selected ? (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-[--text-primary] block truncate">
              {selected.ethnicity_name}
            </span>
            <span className="text-xs text-[--text-tertiary]">
              {selected.data_type}
              {selected.original_filename && ` · ${selected.original_filename}`}
            </span>
          </div>
        ) : (
          <span className="text-sm text-[--text-tertiary] flex-1">
            Pilih sekuens referensi etnis...
          </span>
        )}
        <ChevronDown
          size={15}
          className={clsx(
            "absolute right-3 text-[--text-tertiary] transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 glass rounded-xl shadow-glass-md overflow-hidden"
          >
            {/* Search */}
            <div className="p-2 border-b border-[--border]">
              <input
                ref={searchRef}
                type="text"
                placeholder="Cari nama etnis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-[--bg-subtle] border border-[--border]
                  rounded-lg outline-none focus:border-[--border-focus] text-[--text-primary]
                  placeholder:text-[--text-tertiary]"
              />
            </div>

            <div className="max-h-56 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-6 text-center text-sm text-[--text-tertiary]">
                  Memuat...
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[--text-tertiary]">
                  {sequences.length === 0
                    ? "Belum ada sekuens referensi. Upload di menu Ethnic Sequences."
                    : `Tidak ada hasil untuk "${search}"`}
                </div>
              ) : (
                filtered.map((seq) => (
                  <button
                    key={seq.id}
                    type="button"
                    onClick={() => {
                      onChange(seq.id);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      seq.id === value
                        ? "bg-primary-500/10"
                        : "hover:bg-[--bg-muted]",
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500
                      flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                    >
                      {seq.ethnicity_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[--text-primary]">
                        {seq.ethnicity_name}
                      </p>
                      <p className="text-xs text-[--text-tertiary]">
                        <span
                          className={clsx(
                            "font-semibold",
                            seq.data_type === "NORMAL"
                              ? "text-primary-500"
                              : "text-danger-500",
                          )}
                        >
                          {seq.data_type}
                        </span>
                        {seq.file_size_mb &&
                          ` · ${seq.file_size_mb.toFixed(1)} MB`}
                      </p>
                    </div>
                    {seq.id === value && (
                      <Check
                        size={14}
                        className="text-primary-500 flex-shrink-0"
                      />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Status Tracker ───────────────────────────────────────────────────────────
function StatusTracker({ status }) {
  const steps = ["PENDING", "PROCESSING", "COMPLETED"];
  const currentIdx =
    status === "FAILED"
      ? steps.indexOf("PROCESSING") // berhenti di processing jika gagal
      : steps.indexOf(status);

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const isFailed = status === "FAILED" && step === "PROCESSING";
        const isDone = idx < currentIdx || status === "COMPLETED";
        const isCurrent =
          idx === currentIdx && !["COMPLETED", "FAILED"].includes(status);
        const isPending = idx > currentIdx;

        const labels = {
          PENDING: "Antrian",
          PROCESSING: "Analisis",
          COMPLETED: "Selesai",
        };
        const Icon = isFailed
          ? XCircle
          : isDone
            ? CheckCircle2
            : isCurrent
              ? Loader2
              : null;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            {/* Node */}
            <div
              className={clsx(
                "flex flex-col items-center gap-1.5 flex-shrink-0",
              )}
            >
              <div
                className={clsx(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isFailed && "border-danger-500  bg-danger-500/10",
                  isDone && "border-success-500 bg-success-500/10",
                  isCurrent && "border-accent-500  bg-accent-500/10",
                  isPending && "border-[--border]  bg-[--bg-subtle]",
                )}
              >
                {Icon ? (
                  <Icon
                    size={16}
                    className={clsx(
                      isFailed && "text-danger-500",
                      isDone && "text-success-500",
                      isCurrent && "text-accent-500 animate-spin",
                    )}
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[--border]" />
                )}
              </div>
              <span
                className={clsx(
                  "text-[11px] font-medium whitespace-nowrap",
                  isFailed && "text-danger-500",
                  isDone && "text-success-500",
                  isCurrent && "text-accent-500",
                  isPending && "text-[--text-tertiary]",
                )}
              >
                {labels[step]}
              </span>
            </div>

            {/* Connector — tidak untuk item terakhir */}
            {idx < steps.length - 1 && (
              <div
                className={clsx(
                  "flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all duration-500",
                  idx < currentIdx ? "bg-success-500" : "bg-[--border]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Mutation Table ───────────────────────────────────────────────────────────
function MutationTable({ mutations }) {
  if (!mutations?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <CheckCircle2 size={28} className="text-success-500" />
        <p className="text-sm font-medium text-success-500">
          Tidak ada mutasi terdeteksi
        </p>
        <p className="text-xs text-[--text-tertiary]">
          Sekuens sampel identik dengan referensi
        </p>
      </div>
    );
  }

  // Warna per basa
  const BASE_COLOR = {
    A: "text-blue-500",
    T: "text-green-500",
    G: "text-red-500",
    C: "text-yellow-500",
    U: "text-purple-500",
  };

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th className="w-16 text-center">#</th>
            <th>Posisi</th>
            <th>Basa Referensi</th>
            <th>Basa Sampel</th>
            <th>Tipe</th>
          </tr>
        </thead>
        <tbody>
          {mutations.map((mut, idx) => {
            // Tentukan tipe mutasi sederhana
            const mutType =
              mut.reference_base === "-"
                ? "Insertion"
                : mut.sample_base === "-"
                  ? "Deletion"
                  : "Substitusi";

            return (
              <motion.tr
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <td className="text-center text-xs text-[--text-tertiary] font-mono">
                  {idx + 1}
                </td>
                <td>
                  <span className="font-mono text-sm font-bold text-[--text-primary]">
                    {mut.position.toLocaleString()}
                  </span>
                </td>
                <td>
                  <span
                    className={clsx(
                      "font-mono text-base font-bold",
                      BASE_COLOR[mut.reference_base] ||
                        "text-[--text-secondary]",
                    )}
                  >
                    {mut.reference_base}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        "font-mono text-base font-bold",
                        BASE_COLOR[mut.reference_base] ||
                          "text-[--text-secondary]",
                      )}
                    >
                      {mut.reference_base}
                    </span>
                    <ArrowRight size={12} className="text-[--text-tertiary]" />
                    <span
                      className={clsx(
                        "font-mono text-base font-bold",
                        BASE_COLOR[mut.sample_base] ||
                          "text-[--text-secondary]",
                      )}
                    >
                      {mut.sample_base}
                    </span>
                  </div>
                </td>
                <td>
                  <span
                    className={clsx(
                      "badge text-[10px]",
                      mutType === "Substitusi" && "badge-danger",
                      mutType === "Insertion" && "badge-warning",
                      mutType === "Deletion" && "badge-accent",
                    )}
                  >
                    {mutType}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalysisComparePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill dari query params (dikirim dari EthnicSequenceDetailPage)
  const prefilledRefId = searchParams.get("reference_id") || "";
  const prefilledEthnicity = searchParams.get("ethnicity") || "";

  const [sample, setSample] = useState("");
  const [refId, setRefId] = useState(prefilledRefId);
  const [taskId, setTaskId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // ── Submit mutation ────────────────────────────────────────────────────────
  const startMutation = useMutation({
    mutationFn: analysisApi.startAnalysis,
    onSuccess: (res) => {
      setTaskId(res.task_id);
      setSubmitted(true);
      toast.success("Analisis dimulai. Menunggu hasil...");
    },
    onError: (err) => {
      toast.error(err.message || "Gagal memulai analisis");
    },
  });

  // ── Polling ────────────────────────────────────────────────────────────────
  const { task, isPolling } = usePolling(taskId, {
    interval: 2500,
    onCompleted: (t) =>
      toast.success(
        `Analisis selesai! ${t.total_mutations ?? 0} mutasi ditemukan.`,
      ),
    onFailed: () => toast.error("Analisis gagal. Coba ulangi."),
  });

  // ── Validasi ────────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!sample.trim()) e.sample = "Masukkan sekuens sampel";
    else if (sample.replace(/\s/g, "").length < 10)
      e.sample = "Sekuens minimal 10 karakter";
    if (!refId) e.refId = "Pilih sekuens referensi etnis";
    return e;
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setTaskId(null);
    setSubmitted(false);
    startMutation.mutate({
      sample_sequence: sample.replace(/\s/g, ""),
      reference_sequence_id: refId,
    });
  }

  function handleReset() {
    setSample("");
    setRefId(prefilledRefId);
    setTaskId(null);
    setSubmitted(false);
    setErrors({});
  }

  const sampleLen = sample.replace(/\s/g, "").length;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FlaskConical size={22} className="text-primary-500" />
            {t("analyze.title")}
          </h1>
          <p className="page-subtitle">{t("analyze.subtitle")}</p>
          {prefilledEthnicity && (
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full
              bg-primary-500/10 text-primary-500 text-xs font-medium"
            >
              <Dna size={12} />
              Referensi: {prefilledEthnicity}
            </div>
          )}
        </div>
        <button
          onClick={() => navigate("/analysis/tasks")}
          className="btn btn-glass btn-sm gap-1.5"
        >
          <ListTodo size={14} />
          Riwayat Analisis
        </button>
      </motion.div>

      {/* ── Form Input ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass rounded-2xl p-6 space-y-5"
      >
        <h2 className="font-display text-base font-bold text-[--text-primary] border-b border-[--border] pb-3">
          Input Analisis
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Referensi etnis */}
          <FormField
            label="Sekuens Referensi Etnis"
            required
            error={errors.refId}
            helper="Pilih file FASTA referensi dari database etnis. Hanya yang berstatus 'Ready' yang bisa dipilih."
          >
            <ReferenceSelect
              value={refId}
              onChange={(v) => {
                setRefId(v);
                setErrors((p) => ({ ...p, refId: "" }));
              }}
              error={errors.refId}
            />
          </FormField>

          {/* Sample sequence */}
          <FormField
            label="Sekuens Sampel"
            required
            error={errors.sample}
            helper="Masukkan sekuens DNA/RNA sampel yang akan dibandingkan. Minimal 10 karakter."
          >
            <Textarea
              placeholder="ATCGGCTATCGATCGATCGTAGCTAGCTAGCTA..."
              value={sample}
              onChange={(e) => {
                setSample(e.target.value);
                setErrors((p) => ({ ...p, sample: "" }));
              }}
              rows={7}
              error={errors.sample}
              className="font-mono text-xs tracking-wider leading-relaxed"
            />
            {sampleLen > 0 && (
              <p className="text-xs text-[--text-tertiary] mt-1 flex items-center gap-1.5">
                <Hash size={11} />
                {sampleLen.toLocaleString()} karakter
              </p>
            )}
          </FormField>

          {/* Info box proses async */}
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent-500/8 border border-accent-500/15 text-xs text-accent-600 dark:text-accent-400">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Proses berjalan di background (asinkron)
              </p>
              <p className="opacity-85 mt-0.5">
                Analisis alignment bisa memakan waktu beberapa detik hingga
                menit tergantung ukuran file referensi. Halaman ini akan
                otomatis menampilkan hasil saat selesai.
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={startMutation.isPending || isPolling}
              className="btn btn-primary btn-lg relative overflow-hidden group"
            >
              {startMutation.isPending ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <FlaskConical size={17} />
              )}
              {startMutation.isPending ? "Memulai..." : "Mulai Analisis"}
              <span
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15
                to-transparent skew-x-12 pointer-events-none"
              />
            </button>

            {(submitted || task) && (
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-ghost"
              >
                <RefreshCw size={15} /> Analisis Baru
              </button>
            )}
          </div>
        </form>
      </motion.div>

      {/* ── Status & Result ── */}
      <AnimatePresence>
        {taskId && task && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Status Tracker */}
            <div className="glass rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[--text-primary]">
                  Status Analisis
                </h2>
                <span className="font-mono text-xs text-[--text-tertiary]">
                  ID: {taskId.slice(0, 8)}...
                </span>
              </div>

              <StatusTracker status={task.status} />

              {/* Status message */}
              {task.status_message && (
                <p className="text-xs text-[--text-secondary] text-center">
                  {task.status_message}
                </p>
              )}

              {/* Indeterminate progress bar saat polling */}
              {isPolling && (
                <div className="h-1 rounded-full bg-[--bg-muted] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500
                    rounded-full animate-shimmer bg-[length:200%_100%]"
                  />
                </div>
              )}
            </div>

            {/* Hasil COMPLETED */}
            {task.status === "COMPLETED" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Total Mutasi",
                      value: task.total_mutations ?? 0,
                      color:
                        (task.total_mutations ?? 0) > 0
                          ? "text-danger-500"
                          : "text-success-500",
                      icon: Microscope,
                    },
                    {
                      label: "Panjang Sampel",
                      value: task.sample_length
                        ? `${task.sample_length.toLocaleString()} bp`
                        : "—",
                      color: "text-primary-500",
                      icon: AlignJustify,
                    },
                    {
                      label: "Panjang Referensi",
                      value: task.reference_length
                        ? `${task.reference_length.toLocaleString()} bp`
                        : "—",
                      color: "text-accent-500",
                      icon: Dna,
                    },
                    {
                      label: "Status",
                      value: "Selesai",
                      color: "text-success-500",
                      icon: CheckCircle2,
                    },
                  ].map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="glass rounded-xl p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <card.icon size={15} className={card.color} />
                        <span className="text-xs text-[--text-secondary]">
                          {card.label}
                        </span>
                      </div>
                      <p
                        className={clsx(
                          "font-display text-xl font-bold",
                          card.color,
                        )}
                      >
                        {card.value}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Alignment Summary */}
                {task.alignment_summary && (
                  <div className="glass rounded-2xl p-5">
                    <h3 className="font-display text-sm font-bold text-[--text-primary] mb-3 flex items-center gap-2">
                      <BarChart2 size={15} className="text-primary-500" />
                      Ringkasan Alignment
                    </h3>
                    <div className="p-3.5 rounded-xl bg-[--bg-subtle] border border-[--border]">
                      <p className="text-sm text-[--text-secondary] leading-relaxed">
                        {task.alignment_summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tabel Mutasi */}
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-sm font-bold text-[--text-primary] flex items-center gap-2">
                      <Microscope size={15} className="text-danger-500" />
                      Mutasi Terdeteksi
                      {(task.total_mutations ?? 0) > 0 && (
                        <span className="badge badge-danger">
                          {task.total_mutations}
                        </span>
                      )}
                    </h3>
                  </div>
                  <MutationTable mutations={task.mutations} />
                </div>

                {/* Link ke halaman detail diperkaya */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/analysis/tasks/${taskId}`)}
                    className="btn btn-primary gap-1.5"
                  >
                    <HeartPulse size={14} />
                    Lihat Analisis Lengkap
                    <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* FAILED */}
            {task.status === "FAILED" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5 flex items-start gap-3"
              >
                <XCircle
                  size={20}
                  className="text-danger-500 flex-shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-sm font-semibold text-danger-500">
                    Analisis Gagal
                  </p>
                  <p className="text-xs text-[--text-secondary] mt-1">
                    {task.status_message ||
                      "Terjadi kesalahan saat analisis. Silakan coba lagi."}
                  </p>
                  <button
                    onClick={handleReset}
                    className="mt-3 btn btn-glass btn-sm"
                  >
                    <RefreshCw size={13} /> Coba Lagi
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
