/**
 * pages/analysis/AnalysisComparePage.jsx
 *
 * Halaman analisis perbandingan sekuens:
 *   POST /api/v1/analysis/compare-local
 *
 * Input sekuens sampel mendukung DUA mode:
 *   1. Teks Manual  — paste sekuens langsung di textarea
 *   2. Upload FASTA — drag & drop / pilih file .fasta .fa .fna .ffn .fas .txt
 *      → File diparsing di browser (tidak dikirim ke server sebagai file)
 *      → Sekuens yang sudah diparsing dikirim sebagai string ke API
 *
 * Flow:
 *   Form Input → POST → task_id → Polling 2.5s → Hasil / Error → Detail Lengkap
 */

import { useState, useEffect, useRef, useCallback } from "react";
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
  Upload,
  X,
  FileCode2,
  AlertTriangle,
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

const BASE_COLOR = {
  A: "text-blue-500",
  T: "text-green-500",
  G: "text-red-500",
  C: "text-yellow-500",
  U: "text-purple-500",
};

// ─── Parser FASTA browser-side ────────────────────────────────────────────────
function parseFasta(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const sequences = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith(">")) {
      if (current) sequences.push(current);
      current = { header: trimmed.slice(1), sequence: "" };
    } else if (current) {
      // Hapus whitespace & karakter non-FASTA
      current.sequence += trimmed.replace(/\s/g, "").toUpperCase();
    }
  }
  if (current) sequences.push(current);
  return sequences;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ─── Upload FASTA Component ────────────────────────────────────────────────────
function FastaUploadZone({ onSequenceParsed, onClear, parsedResult }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef(null);

  const ALLOWED_EXTS = [
    ".fasta",
    ".fa",
    ".fna",
    ".ffn",
    ".fas",
    ".faa",
    ".txt",
  ];

  function isValidFile(file) {
    const name = file.name.toLowerCase();
    return ALLOWED_EXTS.some((ext) => name.endsWith(ext));
  }

  async function processFile(file) {
    if (!isValidFile(file)) {
      toast.error(`Format tidak didukung. Gunakan: ${ALLOWED_EXTS.join(", ")}`);
      return;
    }
    // Batas ukuran 50 MB untuk parsing di browser
    if (file.size > 50 * 1024 * 1024) {
      toast.error(
        "File terlalu besar untuk di-parse di browser (maks 50 MB). Paste sekuens secara manual atau gunakan fitur Analisis FASTA di menu Analisis.",
      );
      return;
    }

    setIsParsing(true);
    try {
      const text = await file.text();
      const sequences = parseFasta(text);

      if (sequences.length === 0) {
        toast.error(
          "File tidak mengandung sekuens FASTA yang valid. Pastikan ada baris header (>)",
        );
        setIsParsing(false);
        return;
      }

      if (sequences.length > 1) {
        toast(
          `File mengandung ${sequences.length} sekuens. Menggunakan sekuens pertama: "${sequences[0].header}"`,
          { icon: "📋" },
        );
      }

      onSequenceParsed({
        fileName: file.name,
        fileSize: file.size,
        header: sequences[0].header,
        sequence: sequences[0].sequence,
        totalSeqs: sequences.length,
      });
      toast.success(
        `Sekuens berhasil dibaca: ${sequences[0].sequence.length.toLocaleString()} karakter`,
      );
    } catch (err) {
      toast.error("Gagal membaca file: " + err.message);
    } finally {
      setIsParsing(false);
    }
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  // Sudah ada hasil parsing → tampilkan preview
  if (parsedResult) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-success-500/25 bg-success-500/5 p-4 space-y-3"
      >
        {/* Header file */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-success-500/15 flex items-center justify-center flex-shrink-0">
              <FileCode2 size={17} className="text-success-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[--text-primary] truncate">
                {parsedResult.fileName}
              </p>
              <p className="text-xs text-[--text-tertiary]">
                {formatBytes(parsedResult.fileSize)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[--text-tertiary]
              hover:text-danger-500 hover:bg-danger-500/10 transition-colors flex-shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        {/* Info sekuens */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            {
              label: "Panjang Sekuens",
              value: `${parsedResult.sequence.length.toLocaleString()} bp`,
            },
            {
              label: "Jumlah Sekuens",
              value: `${parsedResult.totalSeqs} (pakai seq. 1)`,
            },
            {
              label: "Karakter Unik",
              value: [...new Set(parsedResult.sequence)].sort().join(" "),
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-[--bg-subtle] rounded-lg p-2.5 border border-[--border]"
            >
              <p className="text-[10px] text-[--text-tertiary] uppercase tracking-wider">
                {item.label}
              </p>
              <p className="text-xs font-mono font-semibold text-[--text-primary] mt-0.5">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Header FASTA */}
        <div className="bg-[--bg-subtle] rounded-lg px-3 py-2 border border-[--border]">
          <p className="text-[10px] text-[--text-tertiary] uppercase tracking-wider mb-1">
            Header FASTA
          </p>
          <p className="text-xs font-mono text-primary-500 truncate">
            &gt;{parsedResult.header}
          </p>
        </div>

        {/* Preview 60 karakter pertama */}
        <div className="bg-[--bg-subtle] rounded-lg px-3 py-2 border border-[--border]">
          <p className="text-[10px] text-[--text-tertiary] uppercase tracking-wider mb-1">
            Preview Sekuens (60 bp pertama)
          </p>
          <p className="text-xs font-mono text-[--text-primary] tracking-widest leading-relaxed break-all">
            {parsedResult.sequence.slice(0, 60)}
            {parsedResult.sequence.length > 60 && (
              <span className="text-[--text-tertiary]">
                …+{(parsedResult.sequence.length - 60).toLocaleString()} bp
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400">
          <CheckCircle2 size={13} />
          Siap dianalisis — klik "Mulai Analisis"
        </div>
      </motion.div>
    );
  }

  // Drop zone kosong
  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => fileInputRef.current?.click()}
      className={clsx(
        "relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3",
        "cursor-pointer transition-all duration-200 select-none",
        isDragging
          ? "border-primary-500 bg-primary-500/8 scale-[1.01]"
          : "border-[--border] bg-[--bg-subtle] hover:border-primary-400 hover:bg-primary-500/5",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".fasta,.fa,.fna,.ffn,.fas,.faa,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processFile(f);
        }}
      />

      {isParsing ? (
        <>
          <Loader2 size={32} className="text-primary-500 animate-spin" />
          <p className="text-sm font-medium text-primary-500">
            Membaca file FASTA...
          </p>
        </>
      ) : (
        <>
          <motion.div
            animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
            className={clsx(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
              isDragging ? "bg-primary-500/20" : "bg-[--bg-muted]",
            )}
          >
            <Upload
              size={26}
              className={
                isDragging ? "text-primary-500" : "text-[--text-tertiary]"
              }
            />
          </motion.div>

          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-[--text-primary]">
              {isDragging ? "Lepaskan untuk upload" : "Drag & drop file FASTA"}
            </p>
            <p className="text-xs text-[--text-tertiary]">
              atau{" "}
              <span className="text-primary-500 underline underline-offset-2">
                klik untuk pilih file
              </span>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mt-1">
            {[".fasta", ".fa", ".fna", ".ffn", ".fas"].map((ext) => (
              <span
                key={ext}
                className="text-[10px] px-2 py-0.5 rounded-full bg-[--bg-muted] text-[--text-tertiary] font-mono border border-[--border]"
              >
                {ext}
              </span>
            ))}
          </div>

          <p className="text-[10px] text-[--text-tertiary]">
            Maks. 50 MB · Sekuens pertama akan digunakan
          </p>
        </>
      )}
    </div>
  );
}

// ─── Toggle Input Mode ────────────────────────────────────────────────────────
function InputModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[--bg-subtle] border border-[--border] w-fit">
      {[
        { id: "text", label: "Teks Manual", icon: Hash },
        { id: "fasta", label: "Upload FASTA", icon: Upload },
      ].map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
            mode === id
              ? "bg-primary-500 text-white shadow-sm"
              : "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-muted]",
          )}
        >
          <Icon size={12} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Reference Sequence Dropdown ──────────────────────────────────────────────
function ReferenceSelect({ value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["ethnic-sequences-ready"],
    queryFn: () => ethnicSequencesApi.listEthnicSequences({ limit: 1000 }),
    select: (data) => data.filter((s) => s.status === "READY"),
    staleTime: 5 * 60 * 1000,
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
              {selected.file_size_mb &&
                ` · ${selected.file_size_mb.toFixed(1)} MB`}
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
                        {seq.original_filename && ` · ${seq.original_filename}`}
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
  const currentIdx = status === "FAILED" ? 1 : steps.indexOf(status);
  const labels = {
    PENDING: "Antrian",
    PROCESSING: "Analisis",
    COMPLETED: "Selesai",
  };

  return (
    <div className="flex items-center gap-0">
      {steps.map((step, idx) => {
        const isFailed = status === "FAILED" && step === "PROCESSING";
        const isDone = idx < currentIdx || status === "COMPLETED";
        const isCurrent =
          idx === currentIdx && !["COMPLETED", "FAILED"].includes(status);
        const isPending = idx > currentIdx && status !== "FAILED";
        const Icon = isFailed
          ? XCircle
          : isDone
            ? CheckCircle2
            : isCurrent
              ? Loader2
              : null;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
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

  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            <th className="w-12 text-center">#</th>
            <th>Posisi</th>
            <th>Basa Ref</th>
            <th>Perubahan</th>
            <th>Tipe</th>
          </tr>
        </thead>
        <tbody>
          {mutations.map((mut, idx) => {
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
                      "font-mono text-base font-black",
                      BASE_COLOR[mut.reference_base],
                    )}
                  >
                    {mut.reference_base}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-1.5 font-mono text-base font-black">
                    <span
                      className={
                        BASE_COLOR[mut.reference_base] ||
                        "text-[--text-secondary]"
                      }
                    >
                      {mut.reference_base}
                    </span>
                    <ArrowRight size={11} className="text-[--text-tertiary]" />
                    <span
                      className={
                        BASE_COLOR[mut.sample_base] || "text-[--text-secondary]"
                      }
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AnalysisComparePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const prefilledRefId = searchParams.get("reference_id") || "";
  const prefilledEthnicity = searchParams.get("ethnicity") || "";

  // ── State ──────────────────────────────────────────────────────────────────
  const [inputMode, setInputMode] = useState("text"); // 'text' | 'fasta'
  const [sampleText, setSampleText] = useState("");
  const [parsedFasta, setParsedFasta] = useState(null); // { fileName, fileSize, header, sequence, totalSeqs }
  const [refId, setRefId] = useState(prefilledRefId);
  const [taskId, setTaskId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // ── Derived: sekuens aktual yang akan dikirim ──────────────────────────────
  const activeSample =
    inputMode === "fasta"
      ? parsedFasta?.sequence || ""
      : sampleText.replace(/\s/g, "");

  const sampleLen = activeSample.length;

  // ── Submit mutation ────────────────────────────────────────────────────────
  const startMutation = useMutation({
    mutationFn: analysisApi.startAnalysis,
    onSuccess: (res) => {
      setTaskId(res.task_id);
      setSubmitted(true);
      toast.success("Analisis dimulai. Menunggu hasil...");
    },
    onError: (err) => toast.error(err.message || "Gagal memulai analisis"),
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
    if (inputMode === "fasta") {
      if (!parsedFasta) e.sample = "Upload file FASTA terlebih dahulu";
      else if (sampleLen < 10)
        e.sample = "Sekuens dari file terlalu pendek (min 10 bp)";
    } else {
      if (!sampleText.trim()) e.sample = "Masukkan sekuens sampel";
      else if (sampleLen < 10) e.sample = "Sekuens minimal 10 karakter";
    }
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
      sample_sequence: activeSample,
      reference_sequence_id: refId,
    });
  }

  function handleReset() {
    setSampleText("");
    setParsedFasta(null);
    setRefId(prefilledRefId);
    setTaskId(null);
    setSubmitted(false);
    setErrors({});
  }

  function handleModeSwitch(mode) {
    setInputMode(mode);
    setErrors((p) => ({ ...p, sample: "" }));
    // Bersihkan input mode sebelumnya
    if (mode === "text") setParsedFasta(null);
    if (mode === "fasta") setSampleText("");
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
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
          <ListTodo size={14} /> Riwayat Analisis
        </button>
      </motion.div>

      {/* Form */}
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
          {/* Referensi */}
          <FormField
            label="Sekuens Referensi Etnis"
            required
            error={errors.refId}
            helper="Pilih file FASTA referensi dari database etnis (hanya status READY)."
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

          {/* ── Input Mode Toggle ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-semibold text-[--text-primary]">
                  Sekuens Sampel <span className="text-danger-500">*</span>
                </p>
                <p className="text-xs text-[--text-secondary] mt-0.5">
                  {inputMode === "text"
                    ? "Paste langsung sekuens DNA/RNA sampel Anda"
                    : "Upload file FASTA — sekuens dibaca di browser, tidak perlu upload ke server"}
                </p>
              </div>
              <InputModeToggle mode={inputMode} onChange={handleModeSwitch} />
            </div>

            {/* Error sample */}
            {errors.sample && (
              <p className="flex items-center gap-1.5 text-xs text-danger-500">
                <AlertCircle size={12} /> {errors.sample}
              </p>
            )}

            {/* ── Mode: Teks Manual ── */}
            <AnimatePresence mode="wait">
              {inputMode === "text" && (
                <motion.div
                  key="text"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                >
                  <Textarea
                    placeholder={`ATCGGCTATCGATCGATCGTAGCTAGCTAGCTA...\n\nTips: Pastikan hanya berisi karakter basa (ATCGURYMKSWHBVDN) tanpa spasi di tengah.`}
                    value={sampleText}
                    onChange={(e) => {
                      setSampleText(e.target.value);
                      setErrors((p) => ({ ...p, sample: "" }));
                    }}
                    rows={8}
                    error={errors.sample}
                    className="font-mono text-xs tracking-wider leading-relaxed"
                  />
                  {sampleText.length > 0 && (
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-[--text-tertiary]">
                      <span className="flex items-center gap-1">
                        <Hash size={11} /> {sampleLen.toLocaleString()} karakter
                      </span>
                      {sampleLen < 10 && sampleLen > 0 && (
                        <span className="text-warning-500 flex items-center gap-1">
                          <AlertTriangle size={11} /> Minimal 10 karakter
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Mode: Upload FASTA ── */}
              {inputMode === "fasta" && (
                <motion.div
                  key="fasta"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.18 }}
                >
                  <FastaUploadZone
                    parsedResult={parsedFasta}
                    onSequenceParsed={(result) => {
                      setParsedFasta(result);
                      setErrors((p) => ({ ...p, sample: "" }));
                    }}
                    onClear={() => {
                      setParsedFasta(null);
                      setErrors((p) => ({ ...p, sample: "" }));
                    }}
                  />
                  {parsedFasta && sampleLen > 0 && (
                    <p className="text-xs text-[--text-tertiary] mt-1.5 flex items-center gap-1.5">
                      <Hash size={11} /> {sampleLen.toLocaleString()} bp akan
                      dikirim ke analisis
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Info async */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-lg bg-accent-500/8 border border-accent-500/15
            text-xs text-accent-600 dark:text-accent-400"
          >
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">
                Proses berjalan di background (asinkron)
              </p>
              <p className="opacity-85 mt-0.5">
                Analisis alignment bisa memakan waktu beberapa detik hingga
                menit tergantung ukuran file referensi. Halaman akan otomatis
                menampilkan hasil saat selesai.
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

      {/* Status & Result */}
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
              {task.status_message && (
                <p className="text-xs text-[--text-secondary] text-center">
                  {task.status_message}
                </p>
              )}
              {isPolling && (
                <div className="h-1 rounded-full bg-[--bg-muted] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 via-accent-500 to-primary-500
                    rounded-full animate-shimmer bg-[length:200%_100%]"
                  />
                </div>
              )}
            </div>

            {/* COMPLETED */}
            {task.status === "COMPLETED" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                {/* KPI */}
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

                {/* Alignment summary */}
                {task.alignment_summary && (
                  <div className="glass rounded-2xl p-5">
                    <h3 className="font-display text-sm font-bold text-[--text-primary] mb-3 flex items-center gap-2">
                      <BarChart2 size={15} className="text-primary-500" />{" "}
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

                {/* Lihat detail */}
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
