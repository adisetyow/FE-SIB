/**
 * pages/search/SearchPage.jsx
 * Route: /search
 *
 * Halaman Search terpadu — dua mode dalam satu UI:
 *
 * MODE 1: Global Search (GET /api/v1/search/global?q=)
 *   - Input: teks bebas (nama penyakit, kode mutasi, nama etnis, nama gene, dst.)
 *   - Output: hasil per kategori (Penyakit, Mutasi, Etnis, Sequence)
 *             ditampilkan sebagai Accordion — bisa collapse/expand per kategori
 *   - Jika hasil lokal kosong → backend menyarankan NCBI / PubMed
 *
 * MODE 2: BLAST Search (GET /api/v1/search/blast?sequence=)
 *   - Input: DNA/RNA sequence (min. 10 basa), format teks
 *   - Output: tabel hits NCBI dengan e-value, identity, score, gaps
 *             tiap row bisa di-expand untuk melihat detail alignment
 *   - Peringatan: bisa lambat 10–60 detik karena query ke server NCBI eksternal
 *
 * Catatan implementasi:
 *   - Kedua endpoint response schema-nya "{}" di API docs — tidak terdefinisi eksplisit.
 *     Kita handle secara defensive dengan optional chaining + fallback.
 *   - useQuery digunakan dengan "enabled: false" + manual trigger (refetch on submit)
 *     agar pencarian tidak auto-run saat mount.
 */
import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Dna,
  FlaskConical,
  AlertTriangle,
  Globe,
  Zap,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
  BookOpen,
  Users,
  Activity,
  Layers,
  Info,
  Copy,
  Check,
} from "lucide-react";
import clsx from "clsx";

import { searchApi } from "../../api/searchApi";

// ─── Constants ────────────────────────────────────────────────────────────────
const MODES = [
  {
    key: "global",
    label: "Global Search",
    icon: Globe,
    desc: "Cari di semua data lokal: penyakit, mutasi, etnis, sequence",
    placeholder: "Cari penyakit, gen, kode mutasi, nama etnis...",
  },
  {
    key: "blast",
    label: "BLAST Search",
    icon: Zap,
    desc: "Query sekuens DNA/RNA ke database NCBI (memerlukan koneksi internet)",
    placeholder: "Masukkan sekuens DNA/RNA, minimal 10 basa (ATCG...)",
  },
];

// Kategori yang diharapkan dari global search response
const CATEGORY_CONFIG = {
  diseases: {
    label: "Penyakit",
    icon: AlertTriangle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    route: (item) => `/diseases/${item.id}`,
    fields: [
      { key: "name", primary: true },
      { key: "icd_code", label: "ICD", mono: true },
      { key: "description", secondary: true },
    ],
  },
  mutations: {
    label: "Mutasi",
    icon: FlaskConical,
    color: "text-accent-500",
    bg: "bg-accent-500/10",
    route: (item) => `/mutations/${item.id}`,
    fields: [
      { key: "code", primary: true, mono: true },
      { key: "mutation_type", label: "Tipe" },
      { key: "disease_name", label: "Penyakit" },
    ],
  },
  ethnicities: {
    label: "Etnis",
    icon: Users,
    color: "text-primary-500",
    bg: "bg-primary-500/10",
    route: (item) => `/ethnicities/${item.id}`,
    fields: [
      { key: "name", primary: true },
      { key: "region_distribution", label: "Region" },
    ],
  },
  sequences: {
    label: "Sequence",
    icon: Dna,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    route: (item) => `/sequences/${item.id}`,
    fields: [
      { key: "name", primary: true },
      { key: "accession_id", label: "Accession", mono: true },
      { key: "seq_type", label: "Tipe" },
      { key: "gene_symbol", label: "Gene", mono: true },
    ],
  },
  literature: {
    label: "Literatur",
    icon: BookOpen,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    route: (item) => `/literature/${item.id}`,
    fields: [
      { key: "title", primary: true },
      { key: "authors", secondary: true },
    ],
  },
};

// ─── Mode Tab ────────────────────────────────────────────────────────────────
function ModeTab({ mode, active, onClick }) {
  const Icon = mode.icon;
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex-1 sm:flex-initial",
        active
          ? "bg-primary-500/15 text-primary-500 ring-1 ring-primary-500/30"
          : "text-[--text-secondary] hover:bg-[--bg-muted] hover:text-[--text-primary]",
      )}
    >
      <Icon size={16} />
      {mode.label}
    </button>
  );
}

// ─── Sequence input dengan colorize preview ──────────────────────────────────
const BASE_COLOR = {
  A: "#2d6cff",
  T: "#22c55e",
  C: "#f59e0b",
  G: "#ef4444",
  U: "#8b5cf6",
};

function SequenceInput({ value, onChange, error }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const cleanSeq = value.replace(/\s/g, "").toUpperCase();
  const len = cleanSeq.length;
  const isValid = len >= 10;

  // Colorize preview (max 200 char untuk performa)
  const preview = cleanSeq.slice(0, 200);
  const colorized = [...preview]
    .map((ch) => {
      const color = BASE_COLOR[ch] || "#888";
      return `<span style="color:${color}">${ch}</span>`;
    })
    .join("");

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="ATCGGCTATCGATCGATCGATCG..."
          rows={5}
          className={clsx(
            "w-full px-4 py-3 rounded-xl border bg-[--bg-surface] text-[--text-primary]",
            "font-mono text-sm tracking-wider resize-none outline-none transition-all",
            "placeholder:text-[--text-tertiary] placeholder:font-sans placeholder:tracking-normal",
            error
              ? "border-danger-400 focus:ring-2 focus:ring-danger-400/20"
              : "border-[--border] focus:border-[--border-focus] focus:ring-2 focus:ring-primary-400/15",
          )}
        />
        {value && (
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-2.5 right-2.5 flex items-center gap-1 text-xs text-[--text-tertiary] hover:text-[--text-primary] transition-colors px-2 py-1 rounded-lg hover:bg-[--bg-muted]"
          >
            {copied ? (
              <Check size={12} className="text-emerald-500" />
            ) : (
              <Copy size={12} />
            )}
            {copied ? "Disalin" : "Salin"}
          </button>
        )}
      </div>

      {/* Live stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={clsx(
              "text-xs font-mono",
              isValid ? "text-emerald-500" : "text-[--text-tertiary]",
            )}
          >
            {len.toLocaleString()} basa
          </span>
          {len > 0 && len < 10 && (
            <span className="text-xs text-amber-500">
              Min. 10 basa diperlukan
            </span>
          )}
          {isValid && (
            <span className="text-xs text-emerald-500">✓ Siap di-BLAST</span>
          )}
        </div>
        {len > 0 && (
          <span className="text-[10px] text-[--text-tertiary]">
            {preview.length < cleanSeq.length ? `Preview 200/${len}` : ""}
          </span>
        )}
      </div>

      {/* Colorized sequence preview */}
      {len >= 10 && (
        <div className="rounded-xl border border-[--border] bg-[--bg-subtle] p-3 overflow-hidden">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary] mb-1.5">
            Preview Warna Basa
          </p>
          <pre
            className="font-mono text-xs leading-relaxed break-all whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html:
                colorized +
                (cleanSeq.length > 200
                  ? '<span style="color:var(--text-tertiary)">...</span>'
                  : ""),
            }}
          />
          <div className="flex gap-3 mt-2 pt-2 border-t border-[--border]">
            {Object.entries(BASE_COLOR).map(([base, color]) => (
              <span
                key={base}
                className="flex items-center gap-1 text-[10px] font-mono font-bold"
                style={{ color }}
              >
                {base}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger-500">{error}</p>}
    </div>
  );
}

// ─── Accordion Category Section ───────────────────────────────────────────────
function CategoryAccordion({ categoryKey, items, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const navigate = useNavigate();

  const cfg = CATEGORY_CONFIG[categoryKey] || {
    label: categoryKey,
    icon: Layers,
    color: "text-[--text-secondary]",
    bg: "bg-[--bg-muted]",
    route: () => "#",
    fields: [{ key: "name", primary: true }],
  };

  const Icon = cfg.icon;

  if (!items?.length) return null;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Accordion header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[--bg-muted]/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              cfg.bg,
            )}
          >
            <Icon size={15} className={cfg.color} />
          </div>
          <span className="font-semibold text-[--text-primary] text-sm">
            {cfg.label}
          </span>
          <span
            className={clsx(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              cfg.bg,
              cfg.color,
            )}
          >
            {items.length}
          </span>
        </div>
        {open ? (
          <ChevronDown size={16} className="text-[--text-tertiary]" />
        ) : (
          <ChevronRight size={16} className="text-[--text-tertiary]" />
        )}
      </button>

      {/* Accordion body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-[--border] divide-y divide-[--border]">
              {items.map((item, idx) => {
                const primaryField = cfg.fields.find((f) => f.primary);
                const primaryVal = primaryField
                  ? item[primaryField.key]
                  : `#${item.id || idx}`;
                const secondaryFields = cfg.fields.filter(
                  (f) => !f.primary && !f.secondary,
                );
                const secondaryTextField = cfg.fields.find((f) => f.secondary);
                const route = cfg.route(item);

                return (
                  <div
                    key={item.id ?? idx}
                    onClick={() => route !== "#" && navigate(route)}
                    className={clsx(
                      "flex items-start gap-3 px-5 py-3.5 transition-colors",
                      route !== "#" &&
                        "cursor-pointer hover:bg-[--bg-muted]/60",
                    )}
                  >
                    {/* Icon avatar */}
                    <div
                      className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        cfg.bg,
                      )}
                    >
                      <Icon size={12} className={cfg.color} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={clsx(
                          "text-sm font-semibold text-[--text-primary] truncate",
                          primaryField?.mono && "font-mono",
                        )}
                      >
                        {primaryVal || (
                          <span className="text-[--text-tertiary]">—</span>
                        )}
                      </p>

                      {/* Secondary text field */}
                      {secondaryTextField && item[secondaryTextField.key] && (
                        <p className="text-xs text-[--text-secondary] mt-0.5 line-clamp-1">
                          {item[secondaryTextField.key]}
                        </p>
                      )}

                      {/* Badge fields */}
                      {secondaryFields.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {secondaryFields.map((f) => {
                            const val = item[f.key];
                            if (!val) return null;
                            return (
                              <span
                                key={f.key}
                                className={clsx(
                                  "text-[10px] px-2 py-0.5 rounded-full border",
                                  "border-[--border] bg-[--bg-subtle] text-[--text-secondary]",
                                  f.mono && "font-mono",
                                )}
                              >
                                {f.label && (
                                  <span className="opacity-60 mr-1">
                                    {f.label}:
                                  </span>
                                )}
                                {val}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Navigate arrow */}
                    {route !== "#" && (
                      <ChevronRight
                        size={14}
                        className="text-[--text-tertiary] flex-shrink-0 mt-1"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── BLAST Results ────────────────────────────────────────────────────────────
function BlastResultRow({ hit, index }) {
  const [expanded, setExpanded] = useState(false);

  // BLAST response structure dari NCBI via backend — field names bersifat dinamis
  // kita handle dengan optional chaining
  const title =
    hit?.title ?? hit?.def ?? hit?.description ?? `Hit #${index + 1}`;
  const accession = hit?.accession ?? hit?.id ?? null;
  const eValue = hit?.e_value ?? hit?.evalue ?? hit?.hsps?.[0]?.evalue ?? null;
  const identity =
    hit?.identity ?? hit?.identities ?? hit?.hsps?.[0]?.identities ?? null;
  const score =
    hit?.score ?? hit?.bit_score ?? hit?.hsps?.[0]?.bit_score ?? null;
  const gaps = hit?.gaps ?? hit?.hsps?.[0]?.gaps ?? null;
  const querySeq = hit?.hseq ?? hit?.hsps?.[0]?.hseq ?? null;
  const hitSeq = hit?.qseq ?? hit?.hsps?.[0]?.qseq ?? null;
  const midline = hit?.midline ?? hit?.hsps?.[0]?.midline ?? null;

  // Hitung persen identity jika raw integer
  const queryLen = hit?.hsps?.[0]?.align_length ?? hit?.length ?? 1;
  const identityPct =
    typeof identity === "number" && identity <= 1
      ? (identity * 100).toFixed(1)
      : typeof identity === "number"
        ? ((identity / queryLen) * 100).toFixed(1)
        : null;

  // Kualitas hit berdasarkan e-value
  const eNum = parseFloat(eValue);
  const quality =
    eNum === 0 || eNum < 1e-100
      ? {
          label: "Excellent",
          color: "text-emerald-500",
          bg: "bg-emerald-500/10 border-emerald-500/20",
        }
      : eNum < 1e-50
        ? {
            label: "Very Good",
            color: "text-teal-500",
            bg: "bg-teal-500/10 border-teal-500/20",
          }
        : eNum < 1e-10
          ? {
              label: "Good",
              color: "text-primary-500",
              bg: "bg-primary-500/10 border-primary-500/20",
            }
          : eNum < 0.01
            ? {
                label: "Fair",
                color: "text-amber-500",
                bg: "bg-amber-500/10 border-amber-500/20",
              }
            : {
                label: "Weak",
                color: "text-[--text-tertiary]",
                bg: "bg-[--bg-muted] border-[--border]",
              };

  // Link ke NCBI
  const ncbiUrl = accession
    ? `https://www.ncbi.nlm.nih.gov/nucleotide/${accession}`
    : null;

  return (
    <div className="border border-[--border] rounded-xl overflow-hidden bg-[--bg-surface]">
      {/* Row header — selalu terlihat */}
      <div
        onClick={() => setExpanded((v) => !v)}
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer hover:bg-[--bg-muted]/60 transition-colors"
      >
        {/* Rank */}
        <div className="w-7 h-7 rounded-lg bg-[--bg-muted] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[--text-tertiary]">
          {index + 1}
        </div>

        {/* Info utama */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[--text-primary] line-clamp-1">
            {title}
          </p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {accession && (
              <span className="font-mono text-[10px] text-[--text-secondary] bg-[--bg-muted] px-2 py-0.5 rounded">
                {accession}
              </span>
            )}
            {eValue !== null && (
              <span className="text-[10px] text-[--text-secondary]">
                E-value:{" "}
                <span className="font-mono font-semibold">{eValue}</span>
              </span>
            )}
            {identityPct && (
              <span className="text-[10px] text-[--text-secondary]">
                Identity: <span className="font-semibold">{identityPct}%</span>
              </span>
            )}
            {score !== null && (
              <span className="text-[10px] text-[--text-secondary]">
                Score:{" "}
                <span className="font-mono font-semibold">
                  {typeof score === "number" ? score.toFixed(1) : score}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Quality badge */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={clsx(
              "text-[10px] font-semibold px-2.5 py-1 rounded-full border",
              quality.bg,
              quality.color,
            )}
          >
            {quality.label}
          </span>
          {expanded ? (
            <ChevronDown size={14} className="text-[--text-tertiary]" />
          ) : (
            <ChevronRight size={14} className="text-[--text-tertiary]" />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-[--border] px-4 py-4 space-y-4">
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "E-value", value: eValue },
                  {
                    label: "Identity",
                    value: identityPct ? `${identityPct}%` : identity,
                  },
                  {
                    label: "Bit Score",
                    value:
                      score !== null
                        ? typeof score === "number"
                          ? score.toFixed(1)
                          : score
                        : null,
                  },
                  { label: "Gaps", value: gaps },
                ].map(({ label, value }) =>
                  value !== null && value !== undefined ? (
                    <div
                      key={label}
                      className="rounded-xl bg-[--bg-subtle] border border-[--border] px-3 py-2.5"
                    >
                      <p className="text-[10px] text-[--text-tertiary] uppercase tracking-wider">
                        {label}
                      </p>
                      <p className="text-sm font-mono font-semibold text-[--text-primary] mt-0.5">
                        {value}
                      </p>
                    </div>
                  ) : null,
                )}
              </div>

              {/* Alignment — jika ada */}
              {(querySeq || hitSeq) && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[--text-tertiary]">
                    Alignment
                  </p>
                  <div className="rounded-xl bg-[--bg-subtle] border border-[--border] p-3 overflow-x-auto">
                    <pre className="font-mono text-[11px] leading-5 text-[--text-secondary] whitespace-pre">
                      {hitSeq && `Sbjct  ${hitSeq}\n`}
                      {midline && `       ${midline}\n`}
                      {querySeq && `Query  ${querySeq}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* Deskripsi full */}
              {hit?.description && hit.description !== title && (
                <p className="text-xs text-[--text-secondary] leading-relaxed">
                  {hit.description}
                </p>
              )}

              {/* Link NCBI */}
              {ncbiUrl && (
                <a
                  href={ncbiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary-500 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={12} />
                  Lihat di NCBI Nucleotide
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ query, suggestions }) {
  return (
    <div className="glass rounded-2xl p-8 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-[--bg-muted] flex items-center justify-center mx-auto">
        <Search size={22} className="text-[--text-tertiary]" />
      </div>
      <p className="text-sm font-semibold text-[--text-primary]">
        Tidak ada hasil untuk "{query}"
      </p>
      <p className="text-xs text-[--text-secondary] max-w-sm mx-auto">
        Data tidak ditemukan di database lokal. Coba BLAST Search untuk mencari
        di database NCBI.
      </p>
      {/* Saran dari backend jika ada */}
      {suggestions && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[--border] bg-[--bg-subtle] px-4 py-3 text-left max-w-sm mx-auto">
          <Info size={14} className="text-primary-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[--text-secondary] leading-relaxed">
            {suggestions}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── BLAST Loading Indicator ──────────────────────────────────────────────────
function BlastLoader() {
  const steps = [
    "Mengirim sekuens ke server NCBI...",
    "Menjalankan algoritma BLAST...",
    "Menganalisis database nukleotida...",
    "Mengumpulkan dan menyortir hits...",
  ];
  const [step, setStep] = useState(0);

  useState(() => {
    const timer = setInterval(
      () => setStep((s) => (s + 1) % steps.length),
      3500,
    );
    return () => clearInterval(timer);
  });

  return (
    <div className="glass rounded-2xl p-8 text-center space-y-4">
      <div className="relative mx-auto w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-primary-500/20" />
        <div className="absolute inset-0 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-accent-500/20" />
        <div
          className="absolute inset-2 rounded-full border-2 border-accent-500 border-b-transparent animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap size={18} className="text-primary-500" />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-[--text-primary]">
          BLAST Search berjalan
        </p>
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="text-xs text-[--text-secondary] mt-1"
          >
            {steps[step]}
          </motion.p>
        </AnimatePresence>
      </div>
      <p className="text-[11px] text-[--text-tertiary]">
        BLAST memerlukan waktu 10–60 detik karena query ke server NCBI
        eksternal.
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const [mode, setMode] = useState("global");
  const [globalQuery, setGlobalQuery] = useState("");
  const [blastQuery, setBlastQuery] = useState("");
  const [blastError, setBlastError] = useState("");

  // ── Global Search ──────────────────────────────────────────────────────────
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [submittedGlobal, setSubmittedGlobal] = useState("");

  const {
    data: globalData,
    isFetching: globalLoading,
    isError: globalError,
    error: globalErrMsg,
    refetch: refetchGlobal,
  } = useQuery({
    queryKey: ["search-global", submittedGlobal],
    queryFn: () => searchApi.globalSearch(submittedGlobal),
    enabled: globalEnabled && !!submittedGlobal,
    retry: false,
    staleTime: 60_000,
  });

  function handleGlobalSearch(e) {
    e?.preventDefault();
    if (!globalQuery.trim()) return;
    setSubmittedGlobal(globalQuery.trim());
    setGlobalEnabled(true);
  }

  // ── BLAST Search ───────────────────────────────────────────────────────────
  const [blastEnabled, setBlastEnabled] = useState(false);
  const [submittedBlast, setSubmittedBlast] = useState("");

  const {
    data: blastData,
    isFetching: blastLoading,
    isError: blastIsError,
    error: blastErrMsg,
    refetch: refetchBlast,
  } = useQuery({
    queryKey: ["search-blast", submittedBlast],
    queryFn: () => searchApi.blastSearch(submittedBlast),
    enabled: blastEnabled && !!submittedBlast,
    retry: false,
    staleTime: 120_000,
  });

  function handleBlastSearch(e) {
    e?.preventDefault();
    setBlastError("");
    const cleanSeq = blastQuery.replace(/\s/g, "");
    if (cleanSeq.length < 10) {
      setBlastError("Sekuens minimal 10 basa diperlukan");
      return;
    }
    setSubmittedBlast(cleanSeq);
    setBlastEnabled(true);
  }

  // ── Parse global results ───────────────────────────────────────────────────
  // Response struktur tidak terdefinisi eksplisit di API docs.
  // Kita coba berbagai kemungkinan key yang umum dari FastAPI search endpoint.
  const parsedGlobal = globalData
    ? Object.entries(globalData).reduce((acc, [key, val]) => {
        if (Array.isArray(val) && val.length > 0) acc[key] = val;
        return acc;
      }, {})
    : null;

  const hasGlobalResults = parsedGlobal && Object.keys(parsedGlobal).length > 0;
  const ncbiSuggestion =
    globalData?.ncbi_suggestion ??
    globalData?.suggestion ??
    globalData?.pubmed ??
    null;

  // ── Parse BLAST hits ───────────────────────────────────────────────────────
  const blastHits =
    blastData?.hits ??
    blastData?.BlastOutput?.BlastOutput_iterations?.Iteration?.Iteration_hits
      ?.Hit ??
    blastData?.results ??
    (Array.isArray(blastData) ? blastData : null);

  const hasBlastResults = Array.isArray(blastHits) && blastHits.length > 0;

  // Mapping key order untuk accordion (prioritas kategori yang lebih penting di atas)
  const categoryOrder = [
    "diseases",
    "mutations",
    "sequences",
    "ethnicities",
    "literature",
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="page-title flex items-center gap-2">
          <Search size={22} className="text-primary-500" />
          Search
        </h1>
        <p className="page-subtitle">
          Cari data di seluruh database lokal atau BLAST ke NCBI
        </p>
      </motion.div>

      {/* ── Mode Tabs ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="glass rounded-2xl p-4"
      >
        {/* Tab selector */}
        <div className="flex gap-2 mb-4">
          {MODES.map((m) => (
            <ModeTab
              key={m.key}
              mode={m}
              active={mode === m.key}
              onClick={() => setMode(m.key)}
            />
          ))}
        </div>

        {/* Mode description */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {/* ── Global Search Input ── */}
            {mode === "global" && (
              <form onSubmit={handleGlobalSearch} className="space-y-3">
                <div className="flex items-start gap-2 text-xs text-[--text-secondary] bg-[--bg-subtle] rounded-xl px-3 py-2.5 border border-[--border]">
                  <Info
                    size={13}
                    className="text-primary-400 mt-0.5 flex-shrink-0"
                  />
                  Mencari di semua data: Penyakit, Mutasi, Etnis, Sequence, dan
                  Literatur sekaligus. Jika hasil lokal kosong, backend akan
                  menyarankan pencarian ke NCBI/PubMed.
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-tertiary]"
                    />
                    <input
                      type="text"
                      value={globalQuery}
                      onChange={(e) => setGlobalQuery(e.target.value)}
                      placeholder="Cari penyakit, gen, kode mutasi, nama etnis..."
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[--border] bg-[--bg-surface] text-[--text-primary] placeholder:text-[--text-tertiary] outline-none focus:border-[--border-focus] focus:ring-2 focus:ring-primary-400/15 text-sm transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!globalQuery.trim() || globalLoading}
                    className="btn btn-primary px-5 flex-shrink-0 disabled:opacity-60"
                  >
                    {globalLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    <span className="hidden sm:inline">Cari</span>
                  </button>
                </div>
              </form>
            )}

            {/* ── BLAST Search Input ── */}
            {mode === "blast" && (
              <form onSubmit={handleBlastSearch} className="space-y-3">
                <div className="flex items-start gap-2 text-xs text-[--text-secondary] bg-amber-500/5 rounded-xl px-3 py-2.5 border border-amber-500/20">
                  <AlertTriangle
                    size={13}
                    className="text-amber-500 mt-0.5 flex-shrink-0"
                  />
                  BLAST query dikirim ke server NCBI eksternal. Proses bisa
                  memakan waktu
                  <strong className="text-[--text-primary]">
                    {" "}
                    10–60 detik
                  </strong>
                  . Disarankan matikan BLAST jika menganalisis banyak sequence
                  sekaligus.
                </div>
                <SequenceInput
                  value={blastQuery}
                  onChange={setBlastQuery}
                  error={blastError}
                />
                <button
                  type="submit"
                  disabled={
                    blastQuery.replace(/\s/g, "").length < 10 || blastLoading
                  }
                  className="btn btn-primary w-full sm:w-auto disabled:opacity-60"
                >
                  {blastLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}
                  {blastLoading ? "BLAST berjalan..." : "Jalankan BLAST"}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ── Results Area ── */}
      <AnimatePresence mode="wait">
        {/* ── Global Results ── */}
        {mode === "global" && submittedGlobal && (
          <motion.div
            key="global-results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {/* Result header */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-[--text-secondary]">
                {globalLoading
                  ? "Mencari..."
                  : globalError
                    ? "Pencarian gagal"
                    : hasGlobalResults
                      ? `Hasil untuk "${submittedGlobal}"`
                      : `Tidak ada hasil untuk "${submittedGlobal}"`}
              </p>
              {hasGlobalResults && (
                <p className="text-xs text-[--text-tertiary]">
                  {Object.values(parsedGlobal).reduce(
                    (s, arr) => s + arr.length,
                    0,
                  )}{" "}
                  item ditemukan
                </p>
              )}
            </div>

            {/* Loading */}
            {globalLoading && (
              <div className="glass rounded-2xl p-6 flex items-center gap-3">
                <Loader2
                  size={18}
                  className="animate-spin text-primary-500 flex-shrink-0"
                />
                <p className="text-sm text-[--text-secondary]">
                  Mencari di seluruh database...
                </p>
              </div>
            )}

            {/* Error */}
            {!globalLoading && globalError && (
              <div className="glass rounded-2xl p-5 flex items-start gap-3 border border-danger-500/20">
                <AlertTriangle
                  size={18}
                  className="text-danger-500 mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-[--text-primary]">
                    Pencarian gagal
                  </p>
                  <p className="text-xs text-[--text-secondary] mt-0.5">
                    {globalErrMsg?.message}
                  </p>
                </div>
              </div>
            )}

            {/* Results — Accordion per kategori */}
            {!globalLoading && !globalError && hasGlobalResults && (
              <div className="space-y-3">
                {categoryOrder
                  .filter((k) => parsedGlobal[k])
                  .map((k, i) => (
                    <CategoryAccordion
                      key={k}
                      categoryKey={k}
                      items={parsedGlobal[k]}
                      defaultOpen={i === 0}
                    />
                  ))}
                {/* Kategori tak terduga dari backend */}
                {Object.keys(parsedGlobal)
                  .filter((k) => !categoryOrder.includes(k))
                  .map((k) => (
                    <CategoryAccordion
                      key={k}
                      categoryKey={k}
                      items={parsedGlobal[k]}
                      defaultOpen={false}
                    />
                  ))}
              </div>
            )}

            {/* Empty */}
            {!globalLoading && !globalError && !hasGlobalResults && (
              <EmptyState
                query={submittedGlobal}
                suggestions={
                  typeof ncbiSuggestion === "string"
                    ? ncbiSuggestion
                    : ncbiSuggestion
                      ? "Backend menyarankan pencarian ke NCBI. Gunakan tab BLAST Search untuk mencari di database NCBI."
                      : null
                }
              />
            )}
          </motion.div>
        )}

        {/* ── BLAST Results ── */}
        {mode === "blast" && submittedBlast && (
          <motion.div
            key="blast-results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            {/* Loading */}
            {blastLoading && <BlastLoader />}

            {/* Error */}
            {!blastLoading && blastIsError && (
              <div className="glass rounded-2xl p-5 flex items-start gap-3 border border-danger-500/20">
                <AlertTriangle
                  size={18}
                  className="text-danger-500 mt-0.5 flex-shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-[--text-primary]">
                    BLAST gagal
                  </p>
                  <p className="text-xs text-[--text-secondary] mt-0.5">
                    {blastErrMsg?.message}
                  </p>
                  <button
                    onClick={() => refetchBlast()}
                    className="text-xs text-primary-500 hover:underline mt-2"
                  >
                    Coba lagi →
                  </button>
                </div>
              </div>
            )}

            {/* BLAST Hits */}
            {!blastLoading && !blastIsError && hasBlastResults && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[--text-secondary]">
                    <span className="font-semibold text-[--text-primary]">
                      {blastHits.length}
                    </span>{" "}
                    hits ditemukan di NCBI
                  </p>
                  <span className="text-[11px] text-[--text-tertiary] bg-[--bg-muted] px-2 py-1 rounded-lg">
                    Diurutkan berdasarkan E-value
                  </span>
                </div>
                <div className="space-y-2">
                  {blastHits.map((hit, i) => (
                    <BlastResultRow
                      key={hit?.accession ?? i}
                      hit={hit}
                      index={i}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No BLAST hits */}
            {!blastLoading && !blastIsError && !hasBlastResults && (
              <div className="glass rounded-2xl p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[--bg-muted] flex items-center justify-center mx-auto">
                  <Zap size={22} className="text-[--text-tertiary]" />
                </div>
                <p className="text-sm font-semibold text-[--text-primary]">
                  Tidak ada BLAST hits
                </p>
                <p className="text-xs text-[--text-secondary]">
                  Tidak ada sequence yang cocok ditemukan di database NCBI untuk
                  sekuens ini.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Idle state (belum pernah search) ── */}
        {((mode === "global" && !submittedGlobal) ||
          (mode === "blast" && !submittedBlast)) && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass rounded-2xl p-10 text-center space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400/20 to-accent-500/20 flex items-center justify-center mx-auto">
              {mode === "global" ? (
                <Globe size={26} className="text-primary-500" />
              ) : (
                <Zap size={26} className="text-primary-500" />
              )}
            </div>
            <p className="text-sm font-semibold text-[--text-primary]">
              {mode === "global"
                ? "Masukkan kata kunci untuk mulai mencari"
                : "Masukkan sekuens DNA/RNA untuk BLAST ke NCBI"}
            </p>
            <p className="text-xs text-[--text-secondary] max-w-sm mx-auto">
              {mode === "global"
                ? "Contoh: nama penyakit (Diabetes), kode gen (BRCA1), kode mutasi (c.185delAG), atau nama etnis (Jawa)"
                : "Contoh: ATCGGCTATCGATCGATCGATCGATCGATCG..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
