/**
 * pages/analysis/AnalysisDetailPage.jsx
 *
 * HALAMAN HASIL ANALISIS KOMPREHENSIF
 * ─────────────────────────────────────────────────────────────────────────────
 * Halaman ini adalah "pusat kesimpulan" bagi peneliti setelah menjalankan
 * analisis perbandingan sekuens. Menggabungkan data dari semua modul untuk
 * memberikan gambaran klinis dan genomik yang lengkap.
 *
 * ARSITEKTUR DATA (enrichment dari 7 sumber):
 *   1. analysis/tasks/:id     → task + mutations + alignment_summary
 *   2. ethnic-sequences/:id   → detail referensi (etnis, file, tipe)
 *   3. mutations/?            → cross-ref mutasi DB → kode, tipe klinis, penyakit
 *   4. diseases (detail)      → penyakit berisiko + etnis + mutasi penyakit
 *   5. patients/?             → pasien dari etnis yang sama
 *   6. literature/?           → literatur yang relevan dengan penyakit/etnis/mutasi
 *   7. activities/?           → riwayat aktivitas penelitian terkait
 *
 * STRUKTUR HALAMAN:
 *   ┌─ Header           ─ Status, identitas task, metadata teknis
 *   ├─ Kesimpulan Klinis ─ Ringkasan naratif untuk peneliti (auto-generated)
 *   ├─ Referensi Etnis  ─ Info ethnic sequence yang dipakai
 *   ├─ Penyakit Terkait ─ Penyakit + highlight mutasi cocok + confidence
 *   ├─ Ranking Etnis    ─ Etnis berisiko dengan progress bar
 *   ├─ Mutasi Diperkaya ─ Tabel lengkap: kode, tipe klinis, penyakit, status
 *   ├─ Pasien Terkait   ─ Pasien dari etnis yang sama + info klinis
 *   ├─ Literatur Relevan ─ Paper terkait penyakit/etnis/mutasi yang ditemukan
 *   └─ Aktivitas Terkait ─ Research activities yang berhubungan
 */

import { useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Microscope,
  HeartPulse,
  Globe,
  Users,
  AlertTriangle,
  BarChart2,
  ArrowRight,
  FileText,
  ShieldAlert,
  Activity,
  ChevronRight,
  BookOpen,
  FolderOpen,
  Zap,
  AlertCircle,
  ExternalLink,
  ClipboardList,
  Beaker,
  Star,
  Eye,
} from "lucide-react";
import clsx from "clsx";

import { analysisApi } from "../../api/analysisApi";
import { ethnicSequencesApi } from "../../api/ethnicSequencesApi";
import { mutationsApi } from "../../api/mutationsApi";
import { diseasesApi } from "../../api/diseasesApi";
import { patientsApi } from "../../api/patientsApi";
import { literatureApi } from "../../api/literatureApi";
import { activitiesApi } from "../../api/activitiesApi";
import { exportAnalysisToPDF } from "../../utils/exportPDF";

// ─── Konstanta & helpers ──────────────────────────────────────────────────────
const BASE_COLOR = {
  A: "text-blue-500",
  T: "text-green-500",
  G: "text-red-500",
  C: "text-yellow-500",
  U: "text-purple-500",
};

const MUT_TYPE_CFG = {
  SNP: {
    label: "SNP",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
    border: "border-red-400/20",
  },
  SUBSTITUSI: {
    label: "Substitusi",
    color: "bg-red-500/10 text-red-600 dark:text-red-400",
    border: "border-red-400/20",
  },
  INSERTION: {
    label: "Insertion",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-400/20",
  },
  DELETION: {
    label: "Deletion",
    color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    border: "border-sky-400/20",
  },
  FRAMESHIFT: {
    label: "Frameshift",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    border: "border-purple-400/20",
  },
  MISSENSE: {
    label: "Missense",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    border: "border-orange-400/20",
  },
  NONSENSE: {
    label: "Nonsense",
    color: "bg-red-700/10 text-red-700 dark:text-red-300",
    border: "border-red-500/20",
  },
  SILENT: {
    label: "Silent",
    color: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    border: "border-gray-400/20",
  },
};

function getMutType(mut) {
  if (mut.reference_base === "-") return "INSERTION";
  if (mut.sample_base === "-") return "DELETION";
  return mut.mutation_type?.toUpperCase() || "SUBSTITUSI";
}

function getMutTypeCfg(type) {
  return MUT_TYPE_CFG[type?.toUpperCase()] || MUT_TYPE_CFG.SUBSTITUSI;
}

function fmtDate(iso, opts) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(
    "id-ID",
    opts || {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  );
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor(
    (Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25),
  );
}

// ─── Komponen reusable ────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  color,
  title,
  subtitle,
  badge,
  badgeColor,
  children,
}) {
  return (
    <div className="flex items-start justify-between pb-4 mb-5 border-b border-[--border]">
      <div>
        <h2 className="font-display text-base font-bold text-[--text-primary] flex items-center gap-2.5">
          {Icon && <Icon size={17} className={color || "text-primary-500"} />}
          {title}
          {badge !== undefined && badge !== null && (
            <span
              className={clsx(
                "badge text-[11px]",
                badgeColor || (badge > 0 ? "badge-danger" : "badge-success"),
              )}
            >
              {badge}
            </span>
          )}
        </h2>
        {subtitle && (
          <p className="text-xs text-[--text-secondary] mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Card({ children, className, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      className={clsx("glass rounded-2xl p-6", className)}
    >
      {children}
    </motion.div>
  );
}

function RiskBar({ score, max, label, color }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const barColor =
    color ||
    (pct >= 70
      ? "bg-danger-500"
      : pct >= 40
        ? "bg-warning-400"
        : "bg-success-500");
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[--text-secondary] font-medium">{label}</span>
        <span className="font-mono font-bold text-[--text-primary]">
          {score}
        </span>
      </div>
      <div className="h-2 rounded-full bg-[--bg-muted] overflow-hidden">
        <motion.div
          className={clsx("h-full rounded-full", barColor)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Kesimpulan Klinis (auto-generated narrative) ─────────────────────────────
function ClinicalSummary({
  task,
  ethnicityName,
  matchedMutations,
  enrichedDiseases,
  relatedPatients,
}) {
  const totalMut = task?.total_mutations ?? 0;
  const highRisk = enrichedDiseases.filter(
    (d) => d.mutation_matches > 0,
  ).length;
  const hasWarning = highRisk > 0;

  const sentences = [];

  if (totalMut === 0) {
    sentences.push(
      `Hasil analisis perbandingan sekuens sampel terhadap referensi etnis ${ethnicityName || "yang dipilih"} menunjukkan tidak ditemukannya mutasi. Sekuens sampel identik dengan referensi.`,
    );
  } else {
    sentences.push(
      `Analisis perbandingan sekuens sampel terhadap referensi etnis ${ethnicityName || "yang dipilih"} berhasil mendeteksi ${totalMut} mutasi pada posisi berbeda.`,
    );
  }

  const snps = matchedMutations.filter(
    (m) => getMutType(m) === "SUBSTITUSI" || getMutType(m) === "SNP",
  ).length;
  const insertions = matchedMutations.filter(
    (m) => getMutType(m) === "INSERTION",
  ).length;
  const deletions = matchedMutations.filter(
    (m) => getMutType(m) === "DELETION",
  ).length;
  if (totalMut > 0) {
    const parts = [];
    if (snps > 0) parts.push(`${snps} substitusi`);
    if (insertions > 0) parts.push(`${insertions} insersi`);
    if (deletions > 0) parts.push(`${deletions} delesi`);
    if (parts.length)
      sentences.push(`Komposisi mutasi terdiri dari: ${parts.join(", ")}.`);
  }

  const dbMatched = matchedMutations.filter((m) => m.db_match).length;
  if (dbMatched > 0) {
    sentences.push(
      `Sebanyak ${dbMatched} dari ${totalMut} mutasi yang terdeteksi memiliki kecocokan dengan entri di database lokal, yang memungkinkan identifikasi penyakit terkait secara langsung.`,
    );
  }

  if (highRisk > 0) {
    const diseaseNames = enrichedDiseases
      .filter((d) => d.mutation_matches > 0)
      .map((d) => d.name)
      .slice(0, 3)
      .join(", ");
    sentences.push(
      `Terdapat ${highRisk} penyakit yang pola mutasinya bersesuaian dengan hasil analisis ini, yaitu: ${diseaseNames}${enrichedDiseases.filter((d) => d.mutation_matches > 0).length > 3 ? ", dan lainnya" : ""}. Hal ini memerlukan perhatian klinis lebih lanjut.`,
    );
  }

  if (relatedPatients.length > 0) {
    sentences.push(
      `Terdapat ${relatedPatients.length} pasien terdaftar dari etnis ${ethnicityName || "yang sama"} yang mungkin memiliki profil risiko genetik serupa dan perlu dipertimbangkan untuk analisis lanjutan.`,
    );
  }

  if (enrichedDiseases.length > 0 && highRisk === 0 && totalMut > 0) {
    sentences.push(
      `Meskipun tidak ada mutasi yang langsung cocok dengan database, etnis ${ethnicityName || "ini"} memiliki risiko terhadap beberapa penyakit yang perlu dimonitor secara berkala.`,
    );
  }

  return (
    <div
      className={clsx(
        "rounded-xl p-4 border space-y-2",
        hasWarning
          ? "bg-danger-500/5 border-danger-500/20"
          : "bg-success-500/5 border-success-500/20",
      )}
    >
      <div className="flex items-center gap-2 mb-3">
        {hasWarning ? (
          <AlertTriangle size={15} className="text-danger-500 flex-shrink-0" />
        ) : (
          <CheckCircle2 size={15} className="text-success-500 flex-shrink-0" />
        )}
        <span
          className={clsx(
            "text-xs font-bold uppercase tracking-wider",
            hasWarning ? "text-danger-500" : "text-success-500",
          )}
        >
          {hasWarning
            ? "Perhatian Klinis Diperlukan"
            : "Tidak Ada Temuan Signifikan"}
        </span>
      </div>
      {sentences.map((s, i) => (
        <p key={i} className="text-sm text-[--text-primary] leading-relaxed">
          {s}
        </p>
      ))}
    </div>
  );
}

// ─── Mutation Stats Mini Chart ────────────────────────────────────────────────
function MutationTypeChart({ mutations }) {
  const types = {};
  mutations.forEach((m) => {
    const t = getMutType(m);
    types[t] = (types[t] || 0) + 1;
  });
  const total = mutations.length;
  const sorted = Object.entries(types).sort((a, b) => b[1] - a[1]);

  const COLORS = {
    SUBSTITUSI: "bg-red-500",
    SNP: "bg-red-500",
    INSERTION: "bg-amber-500",
    DELETION: "bg-sky-500",
    FRAMESHIFT: "bg-purple-500",
    MISSENSE: "bg-orange-500",
    NONSENSE: "bg-red-700",
    SILENT: "bg-gray-400",
  };

  return (
    <div className="space-y-2.5">
      {sorted.map(([type, count]) => (
        <div key={type} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[--text-primary]">
              {getMutTypeCfg(type).label}
            </span>
            <span className="text-[--text-tertiary]">
              {count} ({Math.round((count / total) * 100)}%)
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[--bg-muted] overflow-hidden">
            <motion.div
              className={clsx(
                "h-full rounded-full",
                COLORS[type] || "bg-primary-500",
              )}
              initial={{ width: 0 }}
              animate={{ width: `${(count / total) * 100}%` }}
              transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function AnalysisDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef(null);

  // ── 1. Task ───────────────────────────────────────────────────────────────
  const { data: task, isLoading: loadingTask } = useQuery({
    queryKey: ["analysis-task", taskId],
    queryFn: () => analysisApi.getTask(taskId),
    enabled: !!taskId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s && !["COMPLETED", "FAILED"].includes(s) ? 2500 : false;
    },
  });

  const isCompleted = task?.status === "COMPLETED";
  const refSeqId = task?.reference_sequence_id;

  // ── 2. Ethnic Sequence (referensi) ────────────────────────────────────────
  const { data: ethnicSeq } = useQuery({
    queryKey: ["ethnic-seq-detail", refSeqId],
    queryFn: () => ethnicSequencesApi.getEthnicSequence(refSeqId),
    enabled: !!refSeqId && isCompleted,
    staleTime: 10 * 60 * 1000,
  });
  const ethnicityName = ethnicSeq?.ethnicity_name || "";

  // ── 3. Semua mutasi DB (untuk cross-reference) ────────────────────────────
  const { data: dbMutations = [] } = useQuery({
    queryKey: ["db-mutations-all"],
    queryFn: () => mutationsApi.listMutations({ limit: 1000 }),
    enabled: isCompleted,
    staleTime: 10 * 60 * 1000,
    select: (data) => data.filter((m) => m.disease_id != null),
  });

  // ── 4. Semua penyakit ─────────────────────────────────────────────────────
  const { data: allDiseases = [] } = useQuery({
    queryKey: ["all-diseases-analysis"],
    queryFn: () => diseasesApi.listDiseases({ limit: 500 }),
    enabled: isCompleted,
    staleTime: 10 * 60 * 1000,
  });

  // ── 5. Penyakit detail (dengan etnis berisiko) ────────────────────────────
  const { data: diseaseDetails = [], isLoading: loadingDiseases } = useQuery({
    queryKey: ["disease-details-for-analysis", ethnicityName],
    enabled: !!ethnicityName && allDiseases.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      // Ambil penyakit yang punya relasi etnis
      const candidates = allDiseases.filter((d) => d.ethnicity_count > 0);
      const details = await Promise.allSettled(
        candidates.slice(0, 30).map((d) => diseasesApi.getDisease(d.id)),
      );
      return details
        .filter((r) => r.status === "fulfilled" && r.value)
        .map((r) => r.value)
        .filter((d) =>
          d.at_risk_ethnicities?.some(
            (e) => e.name?.toLowerCase() === ethnicityName.toLowerCase(),
          ),
        );
    },
  });

  // ── 6. Pasien dari etnis yang sama ────────────────────────────────────────
  const { data: relatedPatients = [] } = useQuery({
    queryKey: ["patients-by-ethnicity", ethnicityName],
    queryFn: () => patientsApi.listPatients({ limit: 500 }),
    enabled: !!ethnicityName && isCompleted,
    staleTime: 5 * 60 * 1000,
    select: (data) =>
      data.filter(
        (p) => p.ethnicity_name?.toLowerCase() === ethnicityName.toLowerCase(),
      ),
  });

  // ── 7. Literatur relevan ──────────────────────────────────────────────────
  const { data: allLiterature = [] } = useQuery({
    queryKey: ["all-literature-analysis"],
    queryFn: () => literatureApi.listLiterature({ limit: 500 }),
    enabled: isCompleted,
    staleTime: 10 * 60 * 1000,
  });

  // ── 8. Aktivitas penelitian ───────────────────────────────────────────────
  const { data: allActivities = [] } = useQuery({
    queryKey: ["all-activities-analysis"],
    queryFn: () => activitiesApi.listActivities({ limit: 200 }),
    enabled: isCompleted,
    staleTime: 5 * 60 * 1000,
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ENRICHMENT LOGIC
  // ════════════════════════════════════════════════════════════════════════════

  // Cross-ref mutasi task dengan database
  const matchedMutations = useMemo(() => {
    if (!task?.mutations?.length) return [];
    return task.mutations.map((tm) => {
      const match = dbMutations.find(
        (dbm) =>
          dbm.position === tm.position &&
          dbm.normal_base === tm.reference_base &&
          dbm.mutation_base === tm.sample_base,
      );
      // Cari juga partial match (hanya posisi atau hanya basa)
      const posMatch =
        !match && dbMutations.find((dbm) => dbm.position === tm.position);
      return {
        ...tm,
        db_match: match || null,
        partial_match: posMatch || null,
        disease_id: match?.disease_id || null,
        disease_name: match?.disease_name || null,
        code: match?.code || posMatch?.code || null,
        mutation_type: match?.mutation_type || getMutType(tm),
        description: match?.description || null,
      };
    });
  }, [task?.mutations, dbMutations]);

  // Penyakit yang terdeteksi (dari mutasi yang match)
  const detectedDiseaseIds = useMemo(
    () => [
      ...new Set(
        matchedMutations.filter((m) => m.disease_id).map((m) => m.disease_id),
      ),
    ],
    [matchedMutations],
  );

  // Enriched diseases: gabung dari etnis + match mutasi
  const enrichedDiseases = useMemo(() => {
    const map = new Map();

    // Dari etnis berisiko
    diseaseDetails.forEach((d) => {
      map.set(d.id, {
        ...d,
        from_ethnicity: true,
        mutation_matches: 0,
        matched_mutations: [],
        confidence: "medium", // etnis saja = medium
      });
    });

    // Dari match mutasi (lebih tinggi confidence)
    matchedMutations.forEach((m) => {
      if (!m.disease_id) return;
      if (map.has(m.disease_id)) {
        const e = map.get(m.disease_id);
        e.mutation_matches += 1;
        e.matched_mutations.push(m);
        e.confidence = "high";
      } else {
        const info = allDiseases.find((d) => d.id === m.disease_id);
        if (info) {
          map.set(m.disease_id, {
            ...info,
            at_risk_ethnicities: [],
            mutations: [],
            from_ethnicity: false,
            mutation_matches: 1,
            matched_mutations: [m],
            confidence: "high",
          });
        }
      }
    });

    return [...map.values()].sort((a, b) => {
      if (b.mutation_matches !== a.mutation_matches)
        return b.mutation_matches - a.mutation_matches;
      if (b.from_ethnicity !== a.from_ethnicity)
        return b.from_ethnicity ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [diseaseDetails, matchedMutations, allDiseases]);

  // Ranking etnis berisiko
  const ethnicityRanking = useMemo(() => {
    const map = new Map();
    enrichedDiseases.forEach((d) => {
      d.at_risk_ethnicities?.forEach((e) => {
        if (!map.has(e.id)) {
          map.set(e.id, {
            id: e.id,
            name: e.name,
            region: e.region_distribution,
            diseaseCount: 0,
            highConfidence: 0,
            diseases: [],
            isCurrent: e.name?.toLowerCase() === ethnicityName.toLowerCase(),
          });
        }
        const entry = map.get(e.id);
        entry.diseaseCount += 1;
        if (d.confidence === "high") entry.highConfidence += 1;
        entry.diseases.push({ name: d.name, confidence: d.confidence });
      });
    });
    return [...map.values()].sort(
      (a, b) =>
        b.highConfidence - a.highConfidence || b.diseaseCount - a.diseaseCount,
    );
  }, [enrichedDiseases, ethnicityName]);

  const maxDiseaseCount = Math.max(
    1,
    ...ethnicityRanking.map((e) => e.diseaseCount),
  );

  // Literatur relevan — cari berdasarkan keywords penyakit & etnis
  const relevantLiterature = useMemo(() => {
    if (!allLiterature.length) return [];
    const keywords = [
      ethnicityName.toLowerCase(),
      ...enrichedDiseases
        .slice(0, 5)
        .map((d) => d.name?.toLowerCase())
        .filter(Boolean),
      ...matchedMutations
        .slice(0, 3)
        .filter((m) => m.code)
        .map((m) => m.code?.toLowerCase()),
      "mutasi",
      "genomik",
      "indonesia",
    ].filter(Boolean);

    const scored = allLiterature
      .map((lit) => {
        const text = [
          lit.title,
          lit.authors,
          lit.keywords,
          lit.abstract,
          lit.summary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const score = keywords.reduce(
          (acc, kw) => acc + (text.includes(kw) ? 1 : 0),
          0,
        );
        return { ...lit, relevanceScore: score };
      })
      .filter((l) => l.relevanceScore > 0);

    return scored
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8);
  }, [allLiterature, ethnicityName, enrichedDiseases, matchedMutations]);

  // Aktivitas terkait
  const relevantActivities = useMemo(() => {
    if (!allActivities.length) return [];
    const kws = [
      ethnicityName.toLowerCase(),
      "analisis",
      "compare",
      "sekuens",
    ].filter(Boolean);
    return allActivities
      .filter((a) => {
        const text = [a.activity_name, a.details, a.action_type]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return kws.some((k) => text.includes(k));
      })
      .slice(0, 5);
  }, [allActivities, ethnicityName]);

  // Stats untuk header
  const stats = useMemo(
    () => ({
      totalMut: task?.total_mutations ?? 0,
      dbMatched: matchedMutations.filter((m) => m.db_match).length,
      highRisk: enrichedDiseases.filter((d) => d.confidence === "high").length,
      diseasesTotal: enrichedDiseases.length,
      patients: relatedPatients.length,
      literature: relevantLiterature.length,
    }),
    [
      task,
      matchedMutations,
      enrichedDiseases,
      relatedPatients,
      relevantLiterature,
    ],
  );

  // ─── Loading / Error ───────────────────────────────────────────────────────
  if (loadingTask) {
    return (
      <div className="max-w-5xl space-y-5 animate-pulse">
        <div className="skeleton h-10 w-72 rounded-xl" />
        <div className="skeleton h-52 rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <div className="skeleton h-48 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Activity size={40} className="text-[--text-tertiary]" />
        <p className="text-[--text-secondary]">
          Task analisis tidak ditemukan.
        </p>
        <button
          onClick={() => navigate("/analysis/tasks")}
          className="btn btn-ghost"
        >
          <ArrowLeft size={15} /> Kembali
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl space-y-5" ref={printRef}>
      {/* ════ TOOLBAR ════ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3"
      >
        <button
          onClick={() => navigate("/analysis/tasks")}
          className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Kembali ke Riwayat Analisis
        </button>

        {isCompleted && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[--text-tertiary] hidden sm:block">
              {fmtDateTime(task.created_at)}
            </span>
            <button
              onClick={async () => {
                try {
                  await exportAnalysisToPDF(task, ethnicityName);
                  toast.success("PDF berhasil digenerate");
                } catch {
                  toast.error("Gagal membuat PDF");
                }
              }}
              className="btn btn-glass btn-sm gap-1.5"
            >
              <FileText size={14} /> Export PDF
            </button>
          </div>
        )}
      </motion.div>

      {/* ════ SECTION 1: HEADER & RINGKASAN ════ */}
      <Card delay={0.05}>
        {/* Status banner */}
        <div
          className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-xl mb-5 border",
            isCompleted && stats.highRisk > 0
              ? "bg-danger-500/8 border-danger-500/20"
              : isCompleted
                ? "bg-success-500/8 border-success-500/20"
                : "bg-accent-500/8 border-accent-500/20",
          )}
        >
          {isCompleted && stats.highRisk > 0 ? (
            <AlertTriangle
              size={18}
              className="text-danger-500 flex-shrink-0"
            />
          ) : isCompleted ? (
            <CheckCircle2
              size={18}
              className="text-success-500 flex-shrink-0"
            />
          ) : (
            <Loader2
              size={18}
              className="text-accent-500 animate-spin flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p
              className={clsx(
                "text-sm font-bold",
                isCompleted && stats.highRisk > 0
                  ? "text-danger-500"
                  : isCompleted
                    ? "text-success-500"
                    : "text-accent-500",
              )}
            >
              {isCompleted && stats.highRisk > 0
                ? `Ditemukan ${stats.highRisk} penyakit dengan mutasi yang bersesuaian — perlu perhatian klinis`
                : isCompleted && stats.totalMut > 0
                  ? `${stats.totalMut} mutasi terdeteksi, tidak ada kecocokan penyakit langsung`
                  : isCompleted
                    ? "Tidak ada mutasi — sekuens identik dengan referensi"
                    : `Analisis sedang berjalan... (${task.status})`}
            </p>
            <p className="text-xs text-[--text-tertiary] mt-0.5 font-mono">
              Task ID: {task.id}
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {[
            {
              label: "Total Mutasi",
              value: stats.totalMut,
              color:
                stats.totalMut > 0 ? "text-danger-500" : "text-success-500",
              icon: Microscope,
            },
            {
              label: "Cocok di DB",
              value: stats.dbMatched,
              color:
                stats.dbMatched > 0
                  ? "text-warning-500"
                  : "text-[--text-tertiary]",
              icon: Zap,
            },
            {
              label: "Penyakit Risiko",
              value: stats.diseasesTotal,
              color:
                stats.diseasesTotal > 0
                  ? "text-warning-500"
                  : "text-success-500",
              icon: HeartPulse,
            },
            {
              label: "Risiko Tinggi",
              value: stats.highRisk,
              color:
                stats.highRisk > 0 ? "text-danger-500" : "text-success-500",
              icon: ShieldAlert,
            },
            {
              label: "Pasien Terkait",
              value: stats.patients,
              color: "text-accent-500",
              icon: Users,
            },
            {
              label: "Literatur",
              value: stats.literature,
              color: "text-primary-500",
              icon: BookOpen,
            },
          ].map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 + i * 0.04 }}
              className="bg-[--bg-subtle] rounded-xl p-3 border border-[--border] text-center"
            >
              <s.icon size={16} className={clsx("mx-auto mb-1", s.color)} />
              <p className={clsx("font-display text-xl font-bold", s.color)}>
                {s.value}
              </p>
              <p className="text-[11px] text-[--text-tertiary] leading-tight">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Info teknis */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-xs">
          {[
            {
              label: "Panjang Sampel",
              value: task.sample_length
                ? `${task.sample_length.toLocaleString()} bp`
                : "—",
            },
            {
              label: "Panjang Referensi",
              value: task.reference_length
                ? `${task.reference_length.toLocaleString()} bp`
                : "—",
            },
            { label: "Referensi Etnis", value: ethnicityName || "..." },
            { label: "Tipe Data Ref", value: ethnicSeq?.data_type || "..." },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-lg p-2.5 bg-[--bg-subtle] border border-[--border]"
            >
              <p className="text-[--text-tertiary] uppercase tracking-wider text-[10px] font-semibold">
                {s.label}
              </p>
              <p className="font-mono text-[--text-primary] font-medium mt-0.5">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Alignment summary */}
        {task.alignment_summary && (
          <div className="p-4 rounded-xl bg-[--bg-subtle] border border-[--border]">
            <p className="text-xs font-bold uppercase tracking-wider text-[--text-tertiary] flex items-center gap-1.5 mb-2">
              <BarChart2 size={12} /> Ringkasan Alignment
            </p>
            <p className="text-sm text-[--text-secondary] leading-relaxed">
              {task.alignment_summary}
            </p>
          </div>
        )}
      </Card>

      {/* ════ SECTION 2: KESIMPULAN KLINIS ════ */}
      {isCompleted && (
        <Card delay={0.1}>
          <SectionHeader
            icon={ClipboardList}
            color="text-primary-500"
            title="Kesimpulan Klinis"
            subtitle="Ringkasan interpretasi otomatis untuk peneliti"
          />
          <ClinicalSummary
            task={task}
            ethnicityName={ethnicityName}
            matchedMutations={matchedMutations}
            enrichedDiseases={enrichedDiseases}
            relatedPatients={relatedPatients}
          />
          {stats.totalMut > 0 && matchedMutations.length > 0 && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider mb-3">
                  Distribusi Tipe Mutasi
                </p>
                <MutationTypeChart mutations={matchedMutations} />
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider mb-3">
                  Status Kecocokan Database
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[--bg-subtle] border border-[--border]">
                    <span className="text-xs text-[--text-secondary]">
                      Cocok penuh (posisi + basa)
                    </span>
                    <span className="font-mono text-sm font-bold text-danger-500">
                      {matchedMutations.filter((m) => m.db_match).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[--bg-subtle] border border-[--border]">
                    <span className="text-xs text-[--text-secondary]">
                      Cocok parsial (posisi saja)
                    </span>
                    <span className="font-mono text-sm font-bold text-warning-500">
                      {
                        matchedMutations.filter(
                          (m) => !m.db_match && m.partial_match,
                        ).length
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[--bg-subtle] border border-[--border]">
                    <span className="text-xs text-[--text-secondary]">
                      Baru (tidak ada di DB)
                    </span>
                    <span className="font-mono text-sm font-bold text-primary-500">
                      {
                        matchedMutations.filter(
                          (m) => !m.db_match && !m.partial_match,
                        ).length
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ════ SECTION 3: REFERENSI ETNIS ════ */}
      {isCompleted && (
        <Card delay={0.14}>
          <SectionHeader
            icon={Beaker}
            color="text-primary-500"
            title="Sekuens Referensi Etnis"
            subtitle="File FASTA yang digunakan sebagai acuan perbandingan"
          />
          {ethnicSeq ? (
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500
                flex items-center justify-center flex-shrink-0 text-white text-2xl font-display font-bold"
              >
                {ethnicSeq.ethnicity_name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl font-bold text-[--text-primary]">
                    {ethnicSeq.ethnicity_name}
                  </h3>
                  <span
                    className={clsx(
                      "badge",
                      ethnicSeq.data_type === "NORMAL"
                        ? "badge-primary"
                        : "badge-danger",
                    )}
                  >
                    {ethnicSeq.data_type}
                  </span>
                  <span className="badge badge-success">
                    {ethnicSeq.status}
                  </span>
                </div>
                {ethnicSeq.description && (
                  <p className="text-sm text-[--text-secondary]">
                    {ethnicSeq.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-[--text-tertiary]">
                  {ethnicSeq.original_filename && (
                    <span className="font-mono">
                      {ethnicSeq.original_filename}
                    </span>
                  )}
                  {ethnicSeq.file_size_mb && (
                    <span>{ethnicSeq.file_size_mb.toFixed(1)} MB</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => navigate(`/ethnic-sequences/${refSeqId}`)}
                className="btn btn-glass btn-sm flex-shrink-0"
              >
                <ChevronRight size={14} /> Detail
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-[--text-tertiary]">
              <Loader2 size={15} className="animate-spin" /> Memuat info
              referensi...
            </div>
          )}
        </Card>
      )}

      {/* ════ SECTION 4: PENYAKIT BERKAITAN ════ */}
      {isCompleted && (
        <Card delay={0.17}>
          <SectionHeader
            icon={HeartPulse}
            color="text-warning-500"
            title="Penyakit yang Berkaitan"
            subtitle="Berdasarkan mutasi yang terdeteksi (confidence tinggi) dan profil risiko etnis"
            badge={enrichedDiseases.length}
          >
            <div className="flex items-center gap-2 text-xs text-[--text-tertiary]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-danger-500 inline-block" />{" "}
                Mutasi cocok
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-warning-400 inline-block" />{" "}
                Risiko etnis
              </span>
            </div>
          </SectionHeader>

          {loadingDiseases && !enrichedDiseases.length ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-20 rounded-xl" />
              ))}
            </div>
          ) : enrichedDiseases.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle2 size={28} className="text-success-500" />
              <p className="text-sm font-medium text-success-500">
                Tidak ada penyakit yang berkaitan
              </p>
              <p className="text-xs text-[--text-tertiary] text-center max-w-xs">
                Mutasi yang terdeteksi tidak cocok dengan pola penyakit yang ada
                di database, dan etnis referensi tidak memiliki penyakit
                terdaftar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {enrichedDiseases.map((disease, i) => (
                <motion.div
                  key={disease.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.17 + i * 0.04 }}
                  onClick={() => navigate(`/diseases/${disease.id}`)}
                  className={clsx(
                    "rounded-xl p-4 border cursor-pointer transition-all duration-200 hover:scale-[1.01] group",
                    disease.confidence === "high"
                      ? "border-danger-500/25 bg-danger-500/4 hover:bg-danger-500/8"
                      : "border-warning-400/25 bg-warning-400/4 hover:bg-warning-400/8",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Header penyakit */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {disease.confidence === "high" && (
                          <ShieldAlert
                            size={14}
                            className="text-danger-500 flex-shrink-0"
                          />
                        )}
                        <span className="text-sm font-bold text-[--text-primary]">
                          {disease.name}
                        </span>
                        {disease.icd_code && (
                          <span className="badge badge-warning font-mono text-[10px]">
                            {disease.icd_code}
                          </span>
                        )}
                        {disease.mutation_matches > 0 && (
                          <span className="badge badge-danger text-[10px]">
                            {disease.mutation_matches} mutasi cocok
                          </span>
                        )}
                        <span
                          className={clsx(
                            "badge text-[10px]",
                            disease.confidence === "high"
                              ? "badge-danger"
                              : "badge-warning",
                          )}
                        >
                          {disease.confidence === "high"
                            ? "Confidence Tinggi"
                            : "Risiko Etnis"}
                        </span>
                      </div>

                      {/* Deskripsi */}
                      {disease.description && (
                        <p className="text-xs text-[--text-secondary] leading-relaxed mb-2 line-clamp-2">
                          {disease.description}
                        </p>
                      )}

                      {/* Mutasi yang cocok */}
                      {disease.matched_mutations?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                          <span className="text-[11px] text-[--text-tertiary]">
                            Mutasi:
                          </span>
                          {disease.matched_mutations.map((m, mi) => {
                            const cfg = getMutTypeCfg(getMutType(m));
                            return (
                              <span
                                key={mi}
                                className={clsx(
                                  "inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border",
                                  cfg.color,
                                  cfg.border,
                                )}
                              >
                                {m.code || `pos.${m.position}`}
                                <span
                                  className={BASE_COLOR[m.reference_base] || ""}
                                >
                                  {m.reference_base}
                                </span>
                                <ArrowRight
                                  size={9}
                                  className="text-[--text-tertiary]"
                                />
                                <span
                                  className={BASE_COLOR[m.sample_base] || ""}
                                >
                                  {m.sample_base}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Etnis berisiko */}
                      {disease.at_risk_ethnicities?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <Globe
                            size={11}
                            className="text-[--text-tertiary] self-center"
                          />
                          {disease.at_risk_ethnicities.slice(0, 5).map((e) => (
                            <span
                              key={e.id}
                              className={clsx(
                                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                e.name?.toLowerCase() ===
                                  ethnicityName.toLowerCase()
                                  ? "bg-primary-500/15 text-primary-600 dark:text-primary-400"
                                  : "bg-[--bg-muted] text-[--text-tertiary]",
                              )}
                            >
                              {e.name}
                            </span>
                          ))}
                          {disease.at_risk_ethnicities.length > 5 && (
                            <span className="text-[10px] text-[--text-tertiary]">
                              +{disease.at_risk_ethnicities.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-[--text-tertiary] flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ════ SECTION 5: RANKING ETNIS BERISIKO ════ */}
      {isCompleted && ethnicityRanking.length > 0 && (
        <Card delay={0.2}>
          <SectionHeader
            icon={Globe}
            color="text-accent-500"
            title="Ranking Etnis Berdasarkan Profil Risiko"
            subtitle="Dihitung dari jumlah penyakit berisiko dan kecocokan mutasi — diurutkan dari risiko tertinggi"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ranking list */}
            <div className="space-y-3">
              {ethnicityRanking.slice(0, 8).map((eth, i) => {
                const RANK_COLOR = [
                  "bg-danger-500",
                  "bg-warning-400",
                  "bg-accent-500",
                  "bg-primary-500",
                ];
                return (
                  <motion.div
                    key={eth.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className={clsx(
                      "p-3.5 rounded-xl border transition-colors",
                      eth.isCurrent
                        ? "border-primary-500/30 bg-primary-500/5"
                        : "border-[--border] bg-[--bg-subtle]",
                    )}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <span
                        className={clsx(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0",
                          RANK_COLOR[Math.min(i, 3)] || "bg-[--bg-muted]",
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={clsx(
                              "text-sm font-semibold",
                              eth.isCurrent
                                ? "text-primary-500"
                                : "text-[--text-primary]",
                            )}
                          >
                            {eth.name}
                          </span>
                          {eth.isCurrent && (
                            <span className="badge badge-primary text-[10px]">
                              Referensi ini
                            </span>
                          )}
                          {eth.highConfidence > 0 && (
                            <span className="badge badge-danger text-[10px]">
                              {eth.highConfidence} risiko tinggi
                            </span>
                          )}
                        </div>
                        {eth.region && (
                          <p className="text-[11px] text-[--text-tertiary]">
                            {eth.region}
                          </p>
                        )}
                      </div>
                    </div>
                    <RiskBar
                      score={eth.diseaseCount}
                      max={maxDiseaseCount}
                      label={`${eth.diseaseCount} penyakit`}
                    />
                  </motion.div>
                );
              })}
            </div>
            {/* Penyakit per etnis tertinggi */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider">
                Detail Penyakit — {ethnicityRanking[0]?.name || "Etnis #1"}
              </p>
              {ethnicityRanking[0]?.diseases.map((d, i) => (
                <div
                  key={i}
                  className={clsx(
                    "flex items-center gap-2 text-xs p-2.5 rounded-lg border",
                    d.confidence === "high"
                      ? "bg-danger-500/5 border-danger-500/20"
                      : "bg-[--bg-subtle] border-[--border]",
                  )}
                >
                  {d.confidence === "high" ? (
                    <ShieldAlert
                      size={12}
                      className="text-danger-500 flex-shrink-0"
                    />
                  ) : (
                    <HeartPulse
                      size={12}
                      className="text-warning-400 flex-shrink-0"
                    />
                  )}
                  <span className="text-[--text-primary] font-medium">
                    {d.name}
                  </span>
                  <span
                    className={clsx(
                      "ml-auto badge text-[10px]",
                      d.confidence === "high"
                        ? "badge-danger"
                        : "badge-warning",
                    )}
                  >
                    {d.confidence === "high" ? "Tinggi" : "Sedang"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ════ SECTION 6: TABEL MUTASI LENGKAP ════ */}
      {isCompleted && (
        <Card delay={0.23}>
          <SectionHeader
            icon={Microscope}
            color="text-danger-500"
            title="Detail Mutasi yang Terdeteksi"
            subtitle="Setiap mutasi diperkaya dengan data dari database: kode notasi, tipe klinis, dan penyakit terkait"
            badge={stats.totalMut}
          />
          {stats.totalMut === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle2 size={28} className="text-success-500" />
              <p className="text-sm font-medium text-success-500">
                Tidak ada mutasi — sekuens identik dengan referensi etnis{" "}
                {ethnicityName || "ini"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-[--border]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[--bg-subtle] border-b border-[--border]">
                      {[
                        "#",
                        "Posisi",
                        "Perubahan Basa",
                        "Tipe Mutasi",
                        "Kode Notasi",
                        "Penyakit Terkait",
                        "Status DB",
                        "Keterangan",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[--text-tertiary] whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--border]">
                    {matchedMutations.map((mut, i) => {
                      const mutType = getMutType(mut);
                      const cfg = getMutTypeCfg(mutType);
                      const isMatch = !!mut.db_match;
                      const isPartial = !isMatch && !!mut.partial_match;
                      return (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.23 + i * 0.015 }}
                          className={clsx(
                            "transition-colors hover:bg-[--bg-subtle]",
                            isMatch && "bg-danger-500/3",
                            isPartial && "bg-warning-400/3",
                          )}
                        >
                          <td className="px-3 py-2.5 font-mono text-xs text-[--text-tertiary]">
                            {i + 1}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-sm font-bold text-[--text-primary]">
                              {mut.position?.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5 font-mono text-base font-black">
                              <span
                                className={
                                  BASE_COLOR[mut.reference_base] ||
                                  "text-[--text-secondary]"
                                }
                              >
                                {mut.reference_base}
                              </span>
                              <ArrowRight
                                size={10}
                                className="text-[--text-tertiary]"
                              />
                              <span
                                className={
                                  BASE_COLOR[mut.sample_base] ||
                                  "text-[--text-secondary]"
                                }
                              >
                                {mut.sample_base}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={clsx(
                                "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                                cfg.color,
                                cfg.border,
                              )}
                            >
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            {mut.code ? (
                              <span className="font-mono text-xs text-primary-500 font-semibold">
                                {mut.code}
                              </span>
                            ) : (
                              <span className="text-[--text-tertiary] text-xs">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {mut.disease_name ? (
                              <button
                                onClick={() =>
                                  navigate(`/diseases/${mut.disease_id}`)
                                }
                                className="flex items-center gap-1 text-xs text-warning-600 dark:text-warning-400 hover:underline"
                              >
                                <HeartPulse size={11} />
                                <span className="max-w-[120px] truncate">
                                  {mut.disease_name}
                                </span>
                              </button>
                            ) : (
                              <span className="text-[--text-tertiary] text-xs">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {isMatch ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-danger-500 bg-danger-500/10 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={10} /> Cocok
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning-600 bg-warning-400/10 px-2 py-0.5 rounded-full">
                                <AlertCircle size={10} /> Parsial
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full">
                                <Star size={10} /> Baru
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            {mut.description ? (
                              <span className="text-[11px] text-[--text-secondary] line-clamp-1 max-w-[150px]">
                                {mut.description}
                              </span>
                            ) : (
                              <span className="text-[--text-tertiary] text-xs">
                                —
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-[--text-tertiary]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={11} className="text-danger-500" />
                  Cocok: posisi + basa sama persis dengan DB
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertCircle size={11} className="text-warning-500" />
                  Parsial: hanya posisi yang sama, basa berbeda
                </span>
                <span className="flex items-center gap-1.5">
                  <Star size={11} className="text-primary-500" />
                  Baru: belum ada di database — kandidat entri baru
                </span>
              </div>
            </>
          )}
        </Card>
      )}

      {/* ════ SECTION 7: PASIEN TERKAIT ════ */}
      {isCompleted && (
        <Card delay={0.26}>
          <SectionHeader
            icon={Users}
            color="text-accent-500"
            title="Pasien dari Etnis yang Sama"
            subtitle={`Pasien terdaftar dengan etnis ${ethnicityName || "—"} yang mungkin memerlukan analisis serupa`}
            badge={relatedPatients.length}
            badgeColor="badge-accent"
          />
          {relatedPatients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Users size={24} className="text-[--text-tertiary]" />
              <p className="text-sm text-[--text-tertiary]">
                {ethnicityName
                  ? `Tidak ada pasien dari etnis ${ethnicityName}`
                  : "Memuat data pasien..."}
              </p>
              <button
                onClick={() => navigate("/patients/new")}
                className="btn btn-glass btn-sm"
              >
                <Users size={13} /> Tambah Pasien
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {relatedPatients.slice(0, 12).map((p, i) => {
                const age = calcAge(p.date_of_birth);
                return (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.26 + i * 0.04 }}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[--bg-muted] transition-colors text-left group border border-transparent hover:border-[--border]"
                  >
                    <div
                      className={clsx(
                        "w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0",
                        p.gender === "FEMALE"
                          ? "bg-gradient-to-br from-pink-400 to-primary-500"
                          : "bg-gradient-to-br from-accent-400 to-accent-600",
                      )}
                    >
                      {p.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[--text-primary] truncate">
                        {p.full_name}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-[--text-tertiary]">
                        <span className="font-mono">
                          {p.nik?.slice(0, 8)}...
                        </span>
                        {age && <span>· {age} thn</span>}
                        {p.address_city && <span>· {p.address_city}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={clsx(
                          "badge text-[10px]",
                          p.gender === "MALE"
                            ? "badge-accent"
                            : "badge-primary",
                        )}
                      >
                        {p.gender === "MALE" ? "L" : "P"}
                      </span>
                      <ChevronRight
                        size={13}
                        className="text-[--text-tertiary] group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
          {relatedPatients.length > 12 && (
            <button
              onClick={() => navigate(`/patients`)}
              className="w-full mt-3 text-center py-2 text-xs text-primary-500 hover:underline"
            >
              Lihat {relatedPatients.length - 12} pasien lainnya di halaman
              Patients →
            </button>
          )}
        </Card>
      )}

      {/* ════ SECTION 8: LITERATUR RELEVAN ════ */}
      {isCompleted && (
        <Card delay={0.29}>
          <SectionHeader
            icon={BookOpen}
            color="text-primary-500"
            title="Literatur Ilmiah Relevan"
            subtitle="Publikasi dalam database yang berkaitan dengan penyakit, etnis, atau mutasi yang ditemukan"
            badge={relevantLiterature.length}
            badgeColor="badge-primary"
          >
            <button
              onClick={() => navigate("/literature")}
              className="btn btn-ghost btn-sm"
            >
              <BookOpen size={13} /> Kelola Literatur
            </button>
          </SectionHeader>

          {relevantLiterature.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <BookOpen size={24} className="text-[--text-tertiary]" />
              <p className="text-sm text-[--text-tertiary]">
                Tidak ada literatur yang relevan dengan analisis ini
              </p>
              <button
                onClick={() => navigate("/literature/new")}
                className="btn btn-glass btn-sm"
              >
                <BookOpen size={13} /> Tambah Literatur
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {relevantLiterature.map((lit, i) => (
                <motion.div
                  key={lit.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.29 + i * 0.04 }}
                  className="flex items-start gap-3 p-4 rounded-xl border border-[--border] bg-[--bg-subtle] hover:bg-[--bg-muted] transition-colors group"
                >
                  {/* Relevance score stars */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        lit.relevanceScore >= 4
                          ? "bg-primary-500/15"
                          : "bg-[--bg-muted]",
                      )}
                    >
                      <BookOpen
                        size={14}
                        className={
                          lit.relevanceScore >= 4
                            ? "text-primary-500"
                            : "text-[--text-tertiary]"
                        }
                      />
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          size={8}
                          className={
                            lit.relevanceScore >= s * 2
                              ? "text-warning-400"
                              : "text-[--border]"
                          }
                          fill={
                            lit.relevanceScore >= s * 2
                              ? "currentColor"
                              : "none"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[--text-primary] line-clamp-2 leading-snug mb-1">
                      {lit.title}
                    </p>
                    <p className="text-xs text-[--text-tertiary] mb-1.5">
                      {lit.authors}{" "}
                      {lit.publication_date &&
                        `· ${new Date(lit.publication_date).getFullYear()}`}
                    </p>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {lit.type && (
                        <span className="badge badge-accent text-[10px]">
                          {lit.type}
                        </span>
                      )}
                      {lit.doi && (
                        <span className="badge badge-muted text-[10px] font-mono">
                          DOI
                        </span>
                      )}
                    </div>
                    {lit.abstract && (
                      <p className="text-xs text-[--text-secondary] mt-2 line-clamp-2 leading-relaxed">
                        {lit.abstract}
                      </p>
                    )}
                    {/* Keywords match */}
                    {lit.keywords && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {lit.keywords
                          .split(",")
                          .slice(0, 4)
                          .map((kw, ki) => {
                            const kwd = kw.trim().toLowerCase();
                            const isMatch = [
                              ethnicityName,
                              ...enrichedDiseases.map((d) => d.name),
                            ].some(
                              (k) =>
                                k?.toLowerCase().includes(kwd) ||
                                kwd.includes(k?.toLowerCase() || "x"),
                            );
                            return (
                              <span
                                key={ki}
                                className={clsx(
                                  "text-[10px] px-1.5 py-0.5 rounded",
                                  isMatch
                                    ? "bg-primary-500/15 text-primary-600 dark:text-primary-400 font-medium"
                                    : "bg-[--bg-muted] text-[--text-tertiary]",
                                )}
                              >
                                {kw.trim()}
                              </span>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => navigate(`/literature/${lit.id}/edit`)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
                    >
                      <Eye size={13} />
                    </button>
                    {(lit.url || lit.ncbi_link || lit.doi) && (
                      <a
                        href={
                          lit.url ||
                          lit.ncbi_link ||
                          `https://doi.org/${lit.doi}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-accent-500 hover:bg-accent-500/10 transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ════ SECTION 9: AKTIVITAS PENELITIAN TERKAIT ════ */}
      {isCompleted && (
        <Card delay={0.32}>
          <SectionHeader
            icon={FolderOpen}
            color="text-success-500"
            title="Aktivitas Penelitian Terkait"
            subtitle="Kegiatan penelitian yang mungkin berkaitan dengan analisis ini"
            badge={relevantActivities.length}
            badgeColor="badge-success"
          >
            <button
              onClick={() => navigate("/activities/new")}
              className="btn btn-ghost btn-sm"
            >
              <FolderOpen size={13} /> Catat Aktivitas
            </button>
          </SectionHeader>

          {relevantActivities.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <FolderOpen size={24} className="text-[--text-tertiary]" />
              <p className="text-sm text-[--text-tertiary]">
                Belum ada aktivitas penelitian yang terkait
              </p>
              <button
                onClick={() => navigate("/activities/new")}
                className="btn btn-glass btn-sm"
              >
                <FolderOpen size={13} /> Catat Aktivitas Baru
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {relevantActivities.map((act, i) => (
                <motion.button
                  key={act.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32 + i * 0.04 }}
                  onClick={() => navigate(`/activities/${act.id}`)}
                  className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-[--border] bg-[--bg-subtle] hover:bg-[--bg-muted] transition-colors text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-success-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FolderOpen size={14} className="text-success-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[--text-primary]">
                      {act.activity_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[--text-tertiary] mt-0.5">
                      <span className="font-mono">{act.activity_number}</span>
                      {act.date && <span>· {fmtDate(act.date)}</span>}
                      {act.action_type && (
                        <span className="badge badge-success text-[10px]">
                          {act.action_type}
                        </span>
                      )}
                    </div>
                    {act.details && (
                      <p className="text-xs text-[--text-secondary] mt-1 line-clamp-1">
                        {act.details}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs text-[--text-tertiary]">
                    {act.evidences_count > 0 && (
                      <span className="flex items-center gap-1">
                        <FileText size={11} />
                        {act.evidences_count}
                      </span>
                    )}
                    <ChevronRight
                      size={13}
                      className="group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ════ TASK GAGAL / PENDING ════ */}
      {task.status === "FAILED" && (
        <Card delay={0.1}>
          <div className="flex items-start gap-3">
            <XCircle
              size={20}
              className="text-danger-500 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-danger-500">
                Analisis Gagal
              </p>
              <p className="text-xs text-[--text-secondary] mt-1">
                {task.status_message || "Terjadi kesalahan saat analisis."}
              </p>
              <button
                onClick={() => navigate("/analyze/compare")}
                className="mt-3 btn btn-glass btn-sm"
              >
                Analisis Ulang
              </button>
            </div>
          </div>
        </Card>
      )}

      {["PENDING", "PROCESSING"].includes(task.status) && (
        <Card delay={0.1}>
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 size={28} className="text-accent-500 animate-spin" />
            <p className="text-sm font-medium text-[--text-primary]">
              Analisis sedang berjalan...
            </p>
            <p className="text-xs text-[--text-tertiary]">
              Halaman akan otomatis diperbarui.
            </p>
            <div className="h-1 w-48 rounded-full bg-[--bg-muted] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full animate-shimmer bg-[length:200%_100%]" />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
