/**
 * pages/search/SearchPage.jsx
 * Dua mode pencarian:
 * 1. Global Search → /api/v1/search/global?q=...
 *    Hasil dikelompokkan: Diseases, Mutations, Ethnicities, Sequences
 * 2. BLAST Search → /api/v1/search/blast?sequence=...
 *    Hasil berupa hits NCBI dengan e-value dan identity score
 *
 * Support pre-fill dari query param ?q=... atau ?mode=blast
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Search,
  Dna,
  HeartPulse,
  Globe,
  Microscope,
  Loader2,
  AlertCircle,
  ExternalLink,
  FlaskConical,
  ChevronRight,
  Zap,
  SearchX,
  Info,
} from "lucide-react";
import clsx from "clsx";

import { searchApi } from "../../api/searchApi";

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { key: "global", label: "Global Search", icon: Search },
  { key: "blast", label: "BLAST Search", icon: Dna },
];

// ─── Result group config ──────────────────────────────────────────────────────
const GROUP_CFG = {
  diseases: {
    label: "Penyakit",
    icon: HeartPulse,
    color: "text-warning-500",
    bg: "bg-warning-400/10",
    route: "/diseases",
  },
  mutations: {
    label: "Mutasi",
    icon: Microscope,
    color: "text-danger-500",
    bg: "bg-danger-500/10",
    route: "/mutations",
  },
  ethnicities: {
    label: "Etnis",
    icon: Globe,
    color: "text-primary-500",
    bg: "bg-primary-500/10",
    route: "/ethnicities",
  },
  sequences: {
    label: "Sekuens",
    icon: Dna,
    color: "text-accent-500",
    bg: "bg-accent-500/10",
    route: "/sequences",
  },
};

// ─── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({ item, groupKey, onClick }) {
  const cfg = GROUP_CFG[groupKey];
  const Icon = cfg?.icon || Search;

  const title =
    item.name || item.full_name || item.code || item.title || `ID #${item.id}`;
  const sub =
    item.icd_code ||
    item.mutation_type ||
    item.region_distribution ||
    item.seq_type ||
    item.ethnicity_name ||
    "";
  const desc = item.description || item.disease_name || item.authors || "";

  const isClickable = groupKey !== "ethnicities";

  const content = (
    <>
      <div
        className={clsx(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
          cfg?.bg || "bg-[--bg-muted]",
        )}
      >
        <Icon size={15} className={cfg?.color || "text-[--text-tertiary]"} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-[--text-primary]">{title}</p>
          {sub && <span className="badge badge-muted text-[10px]">{sub}</span>}
        </div>
        {desc && (
          <p className="text-xs text-[--text-tertiary] mt-0.5 line-clamp-1">
            {desc}
          </p>
        )}
      </div>

      {isClickable && (
        <ChevronRight
          size={14}
          className="text-[--text-tertiary] flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform"
        />
      )}
    </>
  );

  if (isClickable) {
    return (
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onClick}
        className="w-full flex items-start gap-3 p-3.5 rounded-xl hover:bg-[--bg-muted] transition-colors text-left group cursor-pointer"
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-full flex items-start gap-3 p-3.5 rounded-xl text-left"
    >
      {content}
    </motion.div>
  );
}

// ─── BLAST Result Item ────────────────────────────────────────────────────────
function BlastHit({ hit, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="p-4 rounded-xl border border-[--border] bg-[--bg-subtle] space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[--text-primary] truncate">
            {hit.title ||
              hit.description ||
              hit.accession ||
              `Hit #${index + 1}`}
          </p>
          {hit.accession && (
            <p className="text-xs font-mono text-[--text-tertiary] mt-0.5">
              {hit.accession}
            </p>
          )}
        </div>
        {hit.url && (
          <a
            href={hit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-accent-500 hover:bg-accent-500/10 transition-colors flex-shrink-0"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      {/* Score metrics */}
      <div className="flex flex-wrap gap-3">
        {hit.e_value !== undefined && (
          <div className="text-xs">
            <span className="text-[--text-tertiary]">E-value: </span>
            <span className="font-mono font-bold text-[--text-primary]">
              {hit.e_value}
            </span>
          </div>
        )}
        {hit.identity !== undefined && (
          <div className="text-xs">
            <span className="text-[--text-tertiary]">Identity: </span>
            <span className="font-mono font-bold text-primary-500">
              {hit.identity}%
            </span>
          </div>
        )}
        {hit.score !== undefined && (
          <div className="text-xs">
            <span className="text-[--text-tertiary]">Score: </span>
            <span className="font-mono font-bold text-[--text-primary]">
              {hit.score}
            </span>
          </div>
        )}
        {hit.bit_score !== undefined && (
          <div className="text-xs">
            <span className="text-[--text-tertiary]">Bit score: </span>
            <span className="font-mono font-bold text-[--text-primary]">
              {hit.bit_score}
            </span>
          </div>
        )}
      </div>

      {/* Identity bar */}
      {hit.identity !== undefined && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-[--bg-muted] overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all",
                hit.identity >= 90
                  ? "bg-success-500"
                  : hit.identity >= 70
                    ? "bg-warning-400"
                    : "bg-danger-500",
              )}
              style={{ width: `${Math.min(100, hit.identity)}%` }}
            />
          </div>
          <span className="text-xs font-mono text-[--text-secondary]">
            {hit.identity}%
          </span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preQ = searchParams.get("q") || "";
  const preMode = searchParams.get("mode") || "global";

  const [mode, setMode] = useState(preMode);
  const [query, setQuery] = useState(preQ);
  const [blastSeq, setBlastSeq] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // global results
  const [blastResults, setBlastResults] = useState(null);
  const [error, setError] = useState("");

  const inputRef = useRef(null);

  // Auto-search jika ada pre-fill query param
  useEffect(() => {
    if (preQ && mode === "global") handleGlobalSearch(preQ);
    inputRef.current?.focus();
  }, []);

  async function handleGlobalSearch(q = query) {
    const trimmed = q.trim();
    if (!trimmed) {
      toast.error("Masukkan kata kunci pencarian");
      return;
    }
    setLoading(true);
    setResults(null);
    setError("");
    try {
      const res = await searchApi.globalSearch(trimmed);
      setResults(res);
    } catch (err) {
      setError(err.message || "Pencarian gagal");
    } finally {
      setLoading(false);
    }
  }

  async function handleBlastSearch() {
    const seq = blastSeq.replace(/\s/g, "");
    if (!seq) {
      toast.error("Masukkan sekuens DNA/RNA");
      return;
    }
    if (seq.length < 10) {
      toast.error("Sekuens minimal 10 basa");
      return;
    }
    setLoading(true);
    setBlastResults(null);
    setError("");
    try {
      const res = await searchApi.blastSearch(seq);
      setBlastResults(res);
    } catch (err) {
      setError(err.message || "BLAST search gagal");
    } finally {
      setLoading(false);
    }
  }

  // Parse global results — API mengembalikan open object, kita handle flexibel
  // Parse global results
  function parseGlobalResults(raw) {
    if (!raw) return [];

    // 1. Arahkan target pencarian ke raw.local_data (jika ada)
    const targetData = raw.local_data || raw;

    const groups = [];
    for (const [key, cfg] of Object.entries(GROUP_CFG)) {
      // 2. Ambil array data dari dalam targetData
      const items =
        targetData[key] ||
        targetData[key + "_results"] ||
        targetData[`${key}_list`] ||
        [];

      if (Array.isArray(items) && items.length > 0) {
        groups.push({ key, cfg, items });
      }
    }

    // Handle flat array result (fallback aman)
    if (groups.length === 0 && Array.isArray(raw)) {
      groups.push({ key: "sequences", cfg: GROUP_CFG.sequences, items: raw });
    }

    return groups;
  }

  // Parse blast results
  function parseBlastResults(raw) {
    if (!raw) return [];

    // 1. Cek struktur dari respons API yang baru (berada di dalam blast_result.data.hits)
    if (raw.blast_result?.data?.hits) {
      return raw.blast_result.data.hits;
    }

    // 2. Fallback jika struktur berada di luar (raw.hits)
    const hits = raw.hits || raw.results || raw.blast_hits || [];
    if (Array.isArray(hits)) return hits;
    if (Array.isArray(raw)) return raw;

    return [];
  }

  const totalGlobalResults = results
    ? parseGlobalResults(results).reduce((sum, g) => sum + g.items.length, 0)
    : 0;

  const blastHits = blastResults ? parseBlastResults(blastResults) : [];

  function getRoute(groupKey, item) {
    const cfg = GROUP_CFG[groupKey];
    if (!cfg || !item.id) return null;
    return `${cfg.route}/${item.id}`;
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Search size={22} className="text-primary-500" />
            {t("search.title")}
          </h1>
          <p className="page-subtitle">
            Cari di seluruh database atau BLAST ke NCBI
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
      >
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex gap-1 p-1 bg-[--bg-muted] rounded-xl w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setMode(tab.key);
                  setResults(null);
                  setBlastResults(null);
                  setError("");
                }}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  mode === tab.key
                    ? "bg-[--bg-surface] text-[--text-primary] shadow-card"
                    : "text-[--text-secondary] hover:text-[--text-primary]",
                )}
              >
                <tab.icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Global Search Input */}
          {mode === "global" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                  />
                  <input
                    ref={inputRef}
                    type="search"
                    placeholder={t("search.placeholder")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
                    className="input pl-10 w-full"
                  />
                </div>
                <button
                  onClick={() => handleGlobalSearch()}
                  disabled={loading}
                  className="btn btn-primary flex-shrink-0"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  <span className="hidden sm:inline">Cari</span>
                </button>
              </div>

              <div className="flex items-start gap-2 text-xs text-[--text-tertiary]">
                <Info size={13} className="flex-shrink-0 mt-0.5" />
                <span>
                  Mencari sekaligus di: Penyakit, Mutasi, Etnis, dan Sekuens
                  Genetik. Jika hasil lokal kosong, sistem akan menyarankan
                  pencarian ke NCBI.
                </span>
              </div>
            </div>
          )}

          {/* BLAST Search Input */}
          {mode === "blast" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-accent-500/8 border border-accent-500/15 text-xs text-accent-600 dark:text-accent-400">
                <Dna size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">BLAST Search ke NCBI</p>
                  <p className="opacity-85 mt-0.5">
                    Masukkan sekuens DNA/RNA minimal 10 basa. Sistem akan
                    mengirim permintaan ke NCBI dan mengembalikan hasil
                    similarity. Proses ini mungkin memakan waktu beberapa detik.
                  </p>
                </div>
              </div>
              <textarea
                placeholder={t("search.blastPlaceholder")}
                value={blastSeq}
                onChange={(e) => setBlastSeq(e.target.value)}
                rows={5}
                className="input font-mono text-xs tracking-wider leading-relaxed resize-none w-full"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-[--text-tertiary]">
                  {blastSeq.replace(/\s/g, "").length > 0 &&
                    `${blastSeq.replace(/\s/g, "").length} basa`}
                </p>
                <button
                  onClick={handleBlastSearch}
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Zap size={16} />
                  )}
                  Jalankan BLAST
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2.5 p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-sm"
        >
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="glass rounded-2xl p-8 flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-primary-500 animate-spin" />
          <p className="text-sm text-[--text-secondary]">
            {mode === "blast" ? "Mengirim ke NCBI BLAST..." : "Mencari..."}
          </p>
        </div>
      )}

      {/* Global Results */}
      <AnimatePresence>
        {!loading && results !== null && mode === "global" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Summary */}
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-[--text-secondary]">
                {totalGlobalResults > 0 ? (
                  <>
                    {totalGlobalResults} hasil ditemukan untuk{" "}
                    <strong className="text-[--text-primary]">"{query}"</strong>
                  </>
                ) : (
                  <>{t("search.noResults", { query })}</>
                )}
              </p>
            </div>

            {/* No results */}
            {totalGlobalResults === 0 && (
              <div className="glass rounded-2xl p-10 flex flex-col items-center gap-3">
                <SearchX size={32} className="text-[--text-tertiary]" />
                <p className="text-sm font-medium text-[--text-tertiary]">
                  Tidak ada hasil lokal untuk "{query}"
                </p>
                <p className="text-xs text-[--text-tertiary] text-center max-w-xs">
                  Coba cari di NCBI menggunakan tab BLAST Search, atau periksa
                  ejaan kata kunci.
                </p>
                <button
                  onClick={() => setMode("blast")}
                  className="btn btn-glass btn-sm mt-1"
                >
                  <Dna size={14} /> Coba BLAST Search
                </button>
              </div>
            )}

            {/* Grouped results */}
            {parseGlobalResults(results).map(({ key, cfg, items }) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={clsx(
                      "w-7 h-7 rounded-lg flex items-center justify-center",
                      cfg.bg,
                    )}
                  >
                    <cfg.icon size={14} className={cfg.color} />
                  </div>
                  <h3 className="font-display text-sm font-bold text-[--text-primary]">
                    {cfg.label}
                  </h3>
                  <span
                    className={clsx(
                      "badge text-[10px]",
                      key === "diseases"
                        ? "badge-warning"
                        : key === "mutations"
                          ? "badge-danger"
                          : key === "ethnicities"
                            ? "badge-primary"
                            : "badge-accent",
                    )}
                  >
                    {items.length}
                  </span>
                </div>
                <div className="divide-y divide-[--border]">
                  {items.slice(0, 5).map((item, i) => (
                    <ResultCard
                      key={item.id ?? i}
                      item={item}
                      groupKey={key}
                      onClick={() => {
                        const route = getRoute(key, item);
                        if (route) navigate(route);
                      }}
                    />
                  ))}
                  {items.length > 5 && (
                    <button
                      onClick={() =>
                        navigate(
                          `${cfg.route}?search=${encodeURIComponent(query)}`,
                        )
                      }
                      className="w-full text-center py-2.5 text-xs text-primary-500 hover:underline"
                    >
                      Lihat {items.length - 5} hasil lainnya →
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* BLAST Results */}
        {!loading && blastResults !== null && mode === "blast" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-sm text-[--text-secondary]">
                {blastHits.length > 0 ? (
                  <>{blastHits.length} hit ditemukan dari NCBI BLAST</>
                ) : (
                  "Tidak ada hit dari NCBI BLAST"
                )}
              </p>
            </div>

            {blastHits.length === 0 ? (
              <div className="glass rounded-2xl p-10 flex flex-col items-center gap-3">
                <SearchX size={32} className="text-[--text-tertiary]" />
                <p className="text-sm text-[--text-tertiary]">
                  Tidak ada hit dari NCBI BLAST
                </p>
                <p className="text-xs text-[--text-tertiary]">
                  Coba dengan sekuens yang lebih panjang atau berbeda
                </p>
              </div>
            ) : (
              <div className="glass rounded-2xl p-5 space-y-3">
                <h3 className="font-display text-sm font-bold text-[--text-primary] flex items-center gap-2">
                  <Dna size={15} className="text-accent-500" />
                  Hasil NCBI BLAST ({blastHits.length} hit)
                </h3>
                <div className="space-y-3">
                  {blastHits.map((hit, i) => (
                    <BlastHit key={i} hit={hit} index={i} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
