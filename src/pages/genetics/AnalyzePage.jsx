/**
 * pages/genetics/AnalyzePage.jsx
 * Halaman analisis DNA/RNA dengan 3 mode:
 * 1. Text input — paste sequence langsung
 * 2. FASTA small (≤ 50 MB) — upload dan langsung dapat hasil
 * 3. FASTA large (> 50 MB) — streaming NDJSON, update realtime
 *
 * Hasil analisis menampilkan:
 * - Summary
 * - Local matches (dengan similarity score)
 * - Detected mutations + penyakit terkait + etnis berisiko
 * - NCBI BLAST results
 * - Related literature
 */
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  FlaskConical,
  Upload,
  FileText,
  Microscope,
  Dna,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Zap,
  Globe,
  BookOpen,
  BarChart2,
  X,
  Link as LinkIcon,
  FileUp,
  AlignLeft,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";
import { geneticsApi } from "../../api/geneticsApi";
import { FormField, Textarea, Checkbox } from "../../components/ui/FormField";

// ─── Tab types ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "text", label: "Input Teks", icon: AlignLeft },
  { key: "fasta-small", label: "FASTA (≤ 50 MB)", icon: FileText },
  { key: "fasta-large", label: "FASTA (> 50 MB)", icon: FileUp },
];

// ─── Similarity bar ────────────────────────────────────────────────────────────
function SimilarityBar({ value }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 90
      ? "bg-success-500"
      : pct >= 70
        ? "bg-warning-400"
        : "bg-danger-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[--bg-muted] overflow-hidden">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-700",
            color,
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-[--text-primary] w-10 text-right">
        {pct}%
      </span>
    </div>
  );
}

// ─── Mutation Card ─────────────────────────────────────────────────────────────
function MutationCard({ mutation, index }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border border-[--border] rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-[--bg-subtle] transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-danger-500/10 flex items-center justify-center flex-shrink-0">
          <Microscope size={14} className="text-danger-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-[--text-primary]">
              Pos {mutation.position}: {mutation.normal_base} →{" "}
              {mutation.mutation_base}
            </span>
            <span className="badge badge-danger text-[10px]">
              {mutation.mutation_type}
            </span>
            {mutation.code && (
              <span className="badge badge-muted text-[10px] font-mono">
                {mutation.code}
              </span>
            )}
          </div>
          {mutation.disease_name && (
            <p className="text-xs text-[--text-secondary] mt-0.5 truncate">
              Penyakit: {mutation.disease_name}
            </p>
          )}
        </div>
        <ChevronDown
          size={15}
          className={clsx(
            "text-[--text-tertiary] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-2 border-t border-[--border]">
              {mutation.disease_description && (
                <p className="text-xs text-[--text-secondary] mt-3">
                  {mutation.disease_description}
                </p>
              )}
              {mutation.icd_code && (
                <p className="text-xs text-[--text-tertiary]">
                  ICD:{" "}
                  <span className="font-mono text-[--text-primary]">
                    {mutation.icd_code}
                  </span>
                </p>
              )}
              {mutation.at_risk_ethnicities?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-[--text-tertiary]">
                    Etnis berisiko:
                  </span>
                  {mutation.at_risk_ethnicities.map((e) => (
                    <span key={e} className="badge badge-primary text-[10px]">
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Analysis Results ─────────────────────────────────────────────────────────
function AnalysisResults({ result, title }) {
  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Header summary */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <BarChart2 size={18} className="text-primary-500" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-[--text-primary]">
              {title || "Hasil Analisis"}
            </h3>
            <p className="text-xs text-[--text-tertiary] font-mono mt-0.5">
              Panjang: {result.query_length?.toLocaleString()} bp
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span
              className={clsx(
                "badge",
                result.total_mutations_detected > 0
                  ? "badge-danger"
                  : "badge-success",
              )}
            >
              {result.total_mutations_detected} mutasi
            </span>
            <span className="badge badge-muted">
              {result.local_matches?.length || 0} matches
            </span>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[--bg-subtle] border border-[--border]">
          <p className="text-sm text-[--text-secondary] leading-relaxed">
            {result.analysis_summary}
          </p>
        </div>
      </div>

      {/* Local matches */}
      {result.local_matches?.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h4 className="section-title text-sm flex items-center gap-2">
            <Dna size={15} className="text-primary-500" />
            Kecocokan Database Lokal ({result.local_matches.length})
          </h4>
          {result.local_matches.map((match, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-[--border] bg-[--bg-subtle] space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[--text-primary]">
                    {match.name}
                  </p>
                  <p className="text-xs text-[--text-tertiary] font-mono">
                    {match.accession_id} · {match.seq_type}
                  </p>
                </div>
              </div>
              <SimilarityBar value={match.similarity} />
              {match.matched_mutations?.length > 0 && (
                <p className="text-xs text-danger-500">
                  {match.matched_mutations.length} mutasi dideteksi
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mutations */}
      {result.mutations?.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h4 className="section-title text-sm flex items-center gap-2">
            <Microscope size={15} className="text-danger-500" />
            Mutasi Terdeteksi ({result.mutations.length})
          </h4>
          {result.mutations.map((mut, idx) => (
            <MutationCard key={idx} mutation={mut} index={idx} />
          ))}
        </div>
      )}

      {/* Related Literature */}
      {result.related_literature?.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h4 className="section-title text-sm flex items-center gap-2">
            <BookOpen size={15} className="text-accent-500" />
            Literatur Terkait ({result.related_literature.length})
          </h4>
          {result.related_literature.map((lit, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-[--border] bg-[--bg-subtle]"
            >
              <p className="text-sm font-medium text-[--text-primary]">
                {lit.title}
              </p>
              <p className="text-xs text-[--text-secondary] mt-0.5">
                {lit.authors}
              </p>
              {lit.ncbi_link && (
                <a
                  href={lit.ncbi_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary-500 hover:underline mt-1"
                >
                  <LinkIcon size={11} /> NCBI Link
                </a>
              )}
              {lit.summary && (
                <p className="text-xs text-[--text-tertiary] mt-1 line-clamp-2">
                  {lit.summary}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyzePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("text");

  // Text analyze state
  const [sequence, setSequence] = useState("");
  const [checkNcbi, setCheckNcbi] = useState(false);
  const [searchLit, setSearchLit] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  // FASTA small state
  const [fastaFile, setFastaFile] = useState(null);
  const [uploadProgress, setProgress] = useState(0);
  const [fastaResult, setFastaResult] = useState(null);

  // FASTA large stream state
  const [streamFile, setStreamFile] = useState(null);
  const [streamChunks, setStreamChunks] = useState([]); // array of chunk results
  const [streamMeta, setStreamMeta] = useState(null);
  const [streamSummary, setStreamSummary] = useState(null);
  const [streaming, setStreaming] = useState(false);

  const fileInputRef = useRef(null);
  const streamFileRef = useRef(null);

  // ── Text analyze ───────────────────────────────────────────────────────────
  async function handleTextAnalyze() {
    if (!sequence.trim()) {
      toast.error("Masukkan sekuens terlebih dahulu");
      return;
    }
    if (sequence.trim().length < 10) {
      toast.error("Sekuens minimal 10 karakter");
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await geneticsApi.analyzeSequence({
        sample_sequence: sequence.trim(),
        check_ncbi: checkNcbi,
        search_literature: searchLit,
      });
      setResult(res);
      toast.success("Analisis selesai");
    } catch (err) {
      toast.error(err.message || "Analisis gagal");
    } finally {
      setAnalyzing(false);
    }
  }

  // ── FASTA small ────────────────────────────────────────────────────────────
  async function handleFastaSmall() {
    if (!fastaFile) {
      toast.error("Pilih file FASTA terlebih dahulu");
      return;
    }
    setAnalyzing(true);
    setFastaResult(null);
    setProgress(0);
    try {
      const res = await geneticsApi.analyzeFastaSmall(
        fastaFile,
        checkNcbi,
        searchLit,
        setProgress,
      );
      setFastaResult(res);
      toast.success(
        `Analisis selesai: ${res.sequences_analyzed} sekuens diproses`,
      );
    } catch (err) {
      toast.error(err.message || "Analisis FASTA gagal");
    } finally {
      setAnalyzing(false);
      setProgress(0);
    }
  }

  // ── FASTA stream ───────────────────────────────────────────────────────────
  function handleFastaStream() {
    if (!streamFile) {
      toast.error("Pilih file FASTA terlebih dahulu");
      return;
    }
    setStreaming(true);
    setStreamChunks([]);
    setStreamMeta(null);
    setStreamSummary(null);

    geneticsApi.analyzeFastaStream(
      streamFile,
      checkNcbi,
      searchLit,
      (chunk) => {
        if (chunk.type === "metadata") setStreamMeta(chunk);
        else if (chunk.type === "summary") setStreamSummary(chunk);
        else if (chunk.type === "sequence_result")
          setStreamChunks((p) => [...p, chunk]);
      },
      () => {
        setStreaming(false);
        toast.success("Streaming selesai");
      },
      (err) => {
        setStreaming(false);
        toast.error(err.message || "Streaming gagal");
      },
    );
  }

  // ── Drop handler ───────────────────────────────────────────────────────────
  function onDrop(e, setter) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setter(file);
  }

  const FASTA_EXT = [
    ".fasta",
    ".fa",
    ".fna",
    ".ffn",
    ".faa",
    ".frn",
    ".fas",
    ".txt",
  ];

  return (
    <div className="space-y-5 max-w-5xl">
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
        </div>
        <button
          onClick={() => navigate("/analysis/tasks")}
          className="btn btn-glass btn-sm"
        >
          Riwayat Analisis →
        </button>
      </motion.div>

      {/* ── Mode Tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="glass rounded-2xl p-5 space-y-5">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[--bg-muted] rounded-xl w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setResult(null);
                  setFastaResult(null);
                }}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  activeTab === tab.key
                    ? "bg-[--bg-surface] text-[--text-primary] shadow-card"
                    : "text-[--text-secondary] hover:text-[--text-primary]",
                )}
              >
                <tab.icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── Text Input Mode ── */}
          {activeTab === "text" && (
            <div className="space-y-4">
              <FormField
                label={t("analyze.inputSequence")}
                helper="Masukkan sekuens DNA/RNA dalam format IUPAC. Minimal 10 karakter."
              >
                <Textarea
                  placeholder={t("analyze.sequencePlaceholder")}
                  value={sequence}
                  onChange={(e) => setSequence(e.target.value)}
                  rows={7}
                  className="font-mono text-xs tracking-wider"
                />
              </FormField>
              {sequence && (
                <p className="text-xs text-[--text-tertiary]">
                  Panjang:{" "}
                  <span className="font-mono font-bold text-[--text-primary]">
                    {sequence.trim().length}
                  </span>{" "}
                  karakter
                </p>
              )}
              <AnalysisOptions
                checkNcbi={checkNcbi}
                setCheckNcbi={setCheckNcbi}
                searchLit={searchLit}
                setSearchLit={setSearchLit}
              />
              <button
                onClick={handleTextAnalyze}
                disabled={analyzing || !sequence.trim()}
                className="btn btn-primary btn-lg w-full sm:w-auto relative overflow-hidden group"
              >
                {analyzing ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    {t("analyze.analyzing")}
                  </>
                ) : (
                  <>
                    <Zap size={17} />
                    {t("analyze.analyzeBtn")}
                  </>
                )}
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none" />
              </button>
            </div>
          )}

          {/* ── FASTA Small Mode ── */}
          {activeTab === "fasta-small" && (
            <div className="space-y-4">
              <FileDropZone
                file={fastaFile}
                onFile={setFastaFile}
                onClear={() => setFastaFile(null)}
                inputRef={fileInputRef}
                accept={FASTA_EXT.join(",")}
                label="Drop file FASTA di sini, atau klik untuk memilih"
                hint="Mendukung .fasta, .fa, .fna, .ffn, .faa, .frn, .fas, .txt · Maksimum 50 MB"
                onDrop={(e) => onDrop(e, setFastaFile)}
              />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[--text-secondary]">
                    <span>Mengunggah...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[--bg-muted] overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <AnalysisOptions
                checkNcbi={checkNcbi}
                setCheckNcbi={setCheckNcbi}
                searchLit={searchLit}
                setSearchLit={setSearchLit}
                ncbiWarning
              />
              <button
                onClick={handleFastaSmall}
                disabled={analyzing || !fastaFile}
                className="btn btn-primary btn-lg w-full sm:w-auto"
              >
                {analyzing ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <Upload size={17} />
                    {t("analyze.uploadFastaSmall")}
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── FASTA Large Stream Mode ── */}
          {activeTab === "fasta-large" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-warning-400/10 border border-warning-400/20 flex items-start gap-2.5 text-sm text-warning-600 dark:text-warning-400">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    Mode Streaming (file besar hingga 3 GB)
                  </p>
                  <p className="text-xs mt-0.5 opacity-80">
                    Hasil dikirim per-sekuens secara realtime. Jangan tutup
                    halaman ini selama proses berlangsung.
                  </p>
                </div>
              </div>
              <FileDropZone
                file={streamFile}
                onFile={setStreamFile}
                onClear={() => {
                  setStreamFile(null);
                  setStreamChunks([]);
                }}
                inputRef={streamFileRef}
                accept={FASTA_EXT.join(",")}
                label="Drop file FASTA besar di sini"
                hint="Mendukung file hingga 3 GB · Maksimum 100.000 sekuens"
                onDrop={(e) => onDrop(e, setStreamFile)}
              />
              <AnalysisOptions
                checkNcbi={checkNcbi}
                setCheckNcbi={setCheckNcbi}
                searchLit={searchLit}
                setSearchLit={setSearchLit}
                ncbiWarning
              />
              <button
                onClick={handleFastaStream}
                disabled={streaming || !streamFile}
                className="btn btn-primary btn-lg w-full sm:w-auto"
              >
                {streaming ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Streaming...
                  </>
                ) : (
                  <>
                    <FileUp size={17} />
                    {t("analyze.uploadFastaLarge")}
                  </>
                )}
              </button>

              {/* Stream progress */}
              {(streaming || streamChunks.length > 0) && (
                <div className="space-y-2 pt-2">
                  {streamMeta && (
                    <p className="text-xs text-[--text-secondary]">
                      File:{" "}
                      <span className="font-mono">{streamMeta.filename}</span> ·{" "}
                      {streamMeta.file_size_mb?.toFixed(1)} MB
                    </p>
                  )}
                  <p className="text-sm font-medium text-[--text-primary]">
                    {streamChunks.length} sekuens diproses
                    {streaming && (
                      <Loader2
                        size={13}
                        className="inline ml-2 animate-spin text-primary-500"
                      />
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Results ── */}
      {/* Text result */}
      {result && (
        <AnalysisResults result={result} title="Hasil Analisis Sekuens" />
      )}

      {/* FASTA small result */}
      {fastaResult && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[--text-primary]">
              Hasil FASTA: {fastaResult.filename}
            </h3>
            <div className="flex gap-2">
              <span className="badge badge-primary">
                {fastaResult.sequences_analyzed} dianalisis
              </span>
              <span className="badge badge-muted">
                {fastaResult.total_sequences} total
              </span>
            </div>
          </div>
          <p className="text-sm text-[--text-secondary]">
            {fastaResult.batch_summary}
          </p>
          <div className="space-y-4">
            {fastaResult.results?.map((r, idx) => (
              <details
                key={idx}
                className="border border-[--border] rounded-xl overflow-hidden"
              >
                <summary className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-[--bg-subtle] transition-colors">
                  <span className="text-xs font-mono text-[--text-tertiary]">
                    #{r.sequence_index}
                  </span>
                  <span className="text-sm font-medium text-[--text-primary] truncate flex-1">
                    {r.fasta_name}
                  </span>
                  <span className="badge badge-muted text-[10px]">
                    {r.sequence_type_detected}
                  </span>
                  {r.total_mutations_detected > 0 ? (
                    <span className="badge badge-danger text-[10px]">
                      {r.total_mutations_detected} mutasi
                    </span>
                  ) : (
                    <span className="badge badge-success text-[10px]">
                      Normal
                    </span>
                  )}
                </summary>
                <div className="p-4 border-t border-[--border]">
                  <AnalysisResults result={r} title={r.fasta_name} />
                </div>
              </details>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stream chunks */}
      {streamChunks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-base font-bold text-[--text-primary]">
            Hasil Streaming ({streamChunks.length} sekuens)
          </h3>
          {streamChunks.map((chunk, idx) => (
            <details
              key={idx}
              className="glass border border-[--border] rounded-xl overflow-hidden"
            >
              <summary className="flex items-center gap-3 p-3.5 cursor-pointer">
                <span className="text-xs font-mono text-[--text-tertiary]">
                  #{chunk.sequence_index}
                </span>
                <span className="text-sm font-medium text-[--text-primary] truncate flex-1">
                  {chunk.fasta_name}
                </span>
                <span className="badge badge-muted text-[10px]">
                  {chunk.sequence_type_detected}
                </span>
                {chunk.total_mutations_detected > 0 ? (
                  <span className="badge badge-danger text-[10px]">
                    {chunk.total_mutations_detected} mutasi
                  </span>
                ) : (
                  <span className="badge badge-success text-[10px]">
                    Normal
                  </span>
                )}
              </summary>
              <div className="p-4 border-t border-[--border]">
                <AnalysisResults result={chunk} />
              </div>
            </details>
          ))}
          {streamSummary && (
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-[--text-secondary]">
                <strong className="text-[--text-primary]">Ringkasan:</strong>{" "}
                {streamSummary.total_sequences} sekuens total
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function AnalysisOptions({
  checkNcbi,
  setCheckNcbi,
  searchLit,
  setSearchLit,
  ncbiWarning,
}) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-[--bg-subtle] border border-[--border]">
      <Checkbox
        label={t("analyze.searchLiterature")}
        checked={searchLit}
        onChange={(e) => setSearchLit(e.target.checked)}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          label={t("analyze.checkNCBI")}
          checked={checkNcbi}
          onChange={(e) => setCheckNcbi(e.target.checked)}
        />
        {ncbiWarning && checkNcbi && (
          <span className="text-xs text-warning-500 flex items-center gap-1">
            <AlertCircle size={11} /> Sangat lambat untuk multi-sekuens
          </span>
        )}
      </div>
    </div>
  );
}

function FileDropZone({
  file,
  onFile,
  onClear,
  inputRef,
  accept,
  label,
  hint,
  onDrop,
}) {
  const [dragging, setDragging] = useState(false);

  return file ? (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-primary-500/30 bg-primary-500/5">
      <FileText size={20} className="text-primary-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[--text-primary] truncate">
          {file.name}
        </p>
        <p className="text-xs text-[--text-tertiary]">
          {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>
      <button
        onClick={onClear}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  ) : (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        setDragging(false);
        onDrop(e);
      }}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        "border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all duration-200",
        dragging
          ? "border-primary-500 bg-primary-500/10"
          : "border-[--border-hover] hover:border-primary-500/50 hover:bg-primary-500/5",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => onFile(e.target.files[0])}
        className="hidden"
      />
      <Upload
        size={28}
        className={clsx(
          "transition-colors",
          dragging ? "text-primary-500" : "text-[--text-tertiary]",
        )}
      />
      <div className="text-center">
        <p className="text-sm font-medium text-[--text-primary]">{label}</p>
        <p className="text-xs text-[--text-tertiary] mt-0.5">{hint}</p>
      </div>
    </div>
  );
}
