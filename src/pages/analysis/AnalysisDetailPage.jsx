/**
 * pages/analysis/AnalysisDetailPage.jsx
 *
 * Halaman detail hasil analisis compare yang diperkaya (enriched).
 * Route: /analysis/tasks/:taskId
 *
 * Data yang ditampilkan:
 * ┌─ BAGIAN 1: Ringkasan Task ─────────────────────────────────────────────────┐
 * │  Status, total mutasi, panjang sekuens, alignment summary, tanggal         │
 * └────────────────────────────────────────────────────────────────────────────┘
 * ┌─ BAGIAN 2: Konteks Referensi ──────────────────────────────────────────────┐
 * │  Info ethnic sequence yang dipakai: nama etnis, tipe data, ukuran file     │
 * └────────────────────────────────────────────────────────────────────────────┘
 * ┌─ BAGIAN 3: Penyakit Berisiko ──────────────────────────────────────────────┐
 * │  Daftar penyakit yang diasosiasikan dengan etnis referensi ini             │
 * │  Cross-reference mutasi yang terdeteksi dengan database mutasi penyakit    │
 * │  → Highlight penyakit yang mutasinya MATCH dengan hasil analisis           │
 * └────────────────────────────────────────────────────────────────────────────┘
 * ┌─ BAGIAN 4: Etnis Paling Berisiko ──────────────────────────────────────────┐
 * │  Ranking etnis berdasarkan jumlah penyakit yang berisiko untuk mereka,     │
 * │  dikaitkan dengan mutasi yang terdeteksi                                   │
 * └────────────────────────────────────────────────────────────────────────────┘
 * ┌─ BAGIAN 5: Tabel Mutasi Lengkap ───────────────────────────────────────────┐
 * │  Setiap mutasi diperkaya dengan: kode notasi, tipe klinis, penyakit terkait│
 * └────────────────────────────────────────────────────────────────────────────┘
 * ┌─ BAGIAN 6: Pasien Terkait ─────────────────────────────────────────────────┐
 * │  Pasien yang sekuensnya menggunakan referensi yang sama                    │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * Strategi enrichment (tanpa endpoint baru):
 * - Task → reference_sequence_id → GET /ethnic-sequences/:id → ethnicity_name
 * - ethnicity_name → GET /diseases?search=ethnicity → diseases berisiko
 * - task.mutations[].position → GET /mutations?reference_sequence_id → cross-ref
 * - reference_sequence_id → GET /patients?sequence_id → pasien terkait
 */
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
  Dna,
  AlertTriangle,
  BarChart2,
  ArrowRight,
  FileText,
  ShieldAlert,
  Activity,
  Info,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

import { analysisApi } from "../../api/analysisApi";
import { ethnicSequencesApi } from "../../api/ethnicSequencesApi";
import { mutationsApi } from "../../api/mutationsApi";
import { diseasesApi } from "../../api/diseasesApi";
import { patientsApi } from "../../api/patientsApi";
import { geneticsApi } from "../../api/geneticsApi";
import { exportAnalysisToPDF } from "../../utils/exportPDF";

// ─── Konstanta ────────────────────────────────────────────────────────────────
const BASE_COLOR = {
  A: "text-blue-500",
  T: "text-green-500",
  G: "text-red-500",
  C: "text-yellow-500",
  U: "text-purple-500",
};

const MUT_TYPE_COLOR = {
  Substitusi: "badge-danger",
  Insertion: "badge-warning",
  Deletion: "badge-accent",
};

function getMutType(mut) {
  if (mut.reference_base === "-") return "Insertion";
  if (mut.sample_base === "-") return "Deletion";
  return "Substitusi";
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  badge,
  children,
  delay = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[--border]">
        <div>
          <h2 className="font-display text-base font-bold text-[--text-primary] flex items-center gap-2.5">
            {Icon && (
              <Icon size={18} className={iconColor || "text-primary-500"} />
            )}
            {title}
            {badge !== undefined && badge !== null && (
              <span
                className={clsx(
                  "badge",
                  typeof badge === "number" && badge > 0
                    ? "badge-danger"
                    : "badge-success",
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
      </div>
      {children}
    </motion.div>
  );
}

// ─── Risk Level indicator ─────────────────────────────────────────────────────
function RiskLevel({ score, max }) {
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;
  const color =
    pct >= 75
      ? "bg-danger-500"
      : pct >= 40
        ? "bg-warning-400"
        : "bg-success-500";
  const label =
    pct >= 75 ? "Risiko Tinggi" : pct >= 40 ? "Risiko Sedang" : "Risiko Rendah";
  const textColor =
    pct >= 75
      ? "text-danger-500"
      : pct >= 40
        ? "text-warning-500"
        : "text-success-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className={clsx("font-semibold", textColor)}>{label}</span>
        <span className="text-[--text-tertiary]">{score} penyakit terkait</span>
      </div>
      <div className="h-1.5 rounded-full bg-[--bg-muted] overflow-hidden">
        <motion.div
          className={clsx("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AnalysisDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  // ── 1. Fetch task ─────────────────────────────────────────────────────────
  const { data: task, isLoading: loadingTask } = useQuery({
    queryKey: ["analysis-task", taskId],
    queryFn: () => analysisApi.getTask(taskId),
    enabled: !!taskId,
    // Polling jika masih berjalan
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s && !["COMPLETED", "FAILED"].includes(s) ? 2500 : false;
    },
  });

  const refSeqId = task?.reference_sequence_id;

  // ── 2. Fetch ethnic sequence (referensi) ──────────────────────────────────
  const { data: ethnicSeq } = useQuery({
    queryKey: ["ethnic-seq-detail", refSeqId],
    queryFn: () => ethnicSequencesApi.getEthnicSequence(refSeqId),
    enabled: !!refSeqId && task?.status === "COMPLETED",
    staleTime: 10 * 60 * 1000,
  });

  const ethnicityName = ethnicSeq?.ethnicity_name || "";

  // ── 3. Fetch semua mutasi di database yang terkait referensi ini ──────────
  const { data: dbMutations = [] } = useQuery({
    queryKey: ["mutations-for-ref", refSeqId],
    queryFn: () => mutationsApi.listMutations({ limit: 500 }),
    enabled: !!refSeqId && task?.status === "COMPLETED",
    staleTime: 5 * 60 * 1000,
    select: (data) =>
      data.filter(
        (m) =>
          // Filter mutasi yang relevan: punya disease_id (terkait penyakit)
          m.disease_id !== null && m.disease_id !== undefined,
      ),
  });

  // ── 4. Fetch semua penyakit ───────────────────────────────────────────────
  const { data: allDiseases = [] } = useQuery({
    queryKey: ["diseases-for-analysis"],
    queryFn: () => diseasesApi.listDiseases({ limit: 500 }),
    enabled: task?.status === "COMPLETED",
    staleTime: 10 * 60 * 1000,
  });

  // ── 5. Fetch detail penyakit yang punya etnis berisiko = ethnicityName ────
  const { data: diseaseDetails = [] } = useQuery({
    queryKey: ["diseases-ethnic-detail", ethnicityName],
    queryFn: async () => {
      if (!ethnicityName) return [];
      // Ambil semua penyakit yang punya relasi dengan etnis ini
      const filtered = allDiseases.filter((d) => d.ethnicity_count > 0);
      // Fetch detail untuk ambil at_risk_ethnicities
      const details = await Promise.all(
        filtered
          .slice(0, 20)
          .map((d) => diseasesApi.getDisease(d.id).catch(() => null)),
      );
      return details
        .filter(Boolean)
        .filter((d) =>
          d.at_risk_ethnicities?.some(
            (e) => e.name?.toLowerCase() === ethnicityName.toLowerCase(),
          ),
        );
    },
    enabled: !!ethnicityName && allDiseases.length > 0,
    staleTime: 10 * 60 * 1000,
  });

  // ── 6. Fetch pasien terkait (melalui sekuens) ─────────────────────────────
  const { data: relatedPatients = [] } = useQuery({
    queryKey: ["patients-for-ref", refSeqId, ethnicityName],
    queryFn: async () => {
      // Cari pasien dari etnis yang sama dengan referensi
      if (!ethnicityName) return [];
      const patients = await patientsApi.listPatients({ limit: 500 });
      return patients.filter(
        (p) => p.ethnicity_name?.toLowerCase() === ethnicityName.toLowerCase(),
      );
    },
    enabled: !!ethnicityName && task?.status === "COMPLETED",
    staleTime: 5 * 60 * 1000,
  });

  // ── 7. Enrichment Logic ───────────────────────────────────────────────────

  // Cross-reference: mutasi dari task yang MATCH dengan mutasi di database
  const matchedMutations = useMemo(() => {
    if (!task?.mutations?.length || !dbMutations.length) return [];
    return task.mutations.map((tm) => {
      // Cari di database mutasi yang posisinya sama dan basa yang sama
      const match = dbMutations.find(
        (dbm) =>
          dbm.position === tm.position &&
          dbm.normal_base === tm.reference_base &&
          dbm.mutation_base === tm.sample_base,
      );
      return {
        ...tm,
        db_match: match || null,
        disease_id: match?.disease_id || null,
        disease_name: match?.disease_name || null,
        code: match?.code || null,
        mutation_type: match?.mutation_type || getMutType(tm),
      };
    });
  }, [task?.mutations, dbMutations]);

  // Penyakit yang terdeteksi dari mutasi yang match
  const detectedDiseaseIds = useMemo(
    () => [
      ...new Set(
        matchedMutations.filter((m) => m.disease_id).map((m) => m.disease_id),
      ),
    ],
    [matchedMutations],
  );

  // Gabung: penyakit dari etnis berisiko + penyakit dari match mutasi
  const enrichedDiseases = useMemo(() => {
    if (!diseaseDetails.length && !detectedDiseaseIds.length) return [];

    const diseaseMap = new Map();

    // Penyakit dari etnis berisiko
    diseaseDetails.forEach((d) => {
      diseaseMap.set(d.id, {
        ...d,
        from_ethnicity: true,
        mutation_matches: 0,
        matched_mutations: [],
      });
    });

    // Tandai penyakit yang juga punya mutasi match
    matchedMutations.forEach((m) => {
      if (!m.disease_id) return;
      if (diseaseMap.has(m.disease_id)) {
        const entry = diseaseMap.get(m.disease_id);
        entry.mutation_matches += 1;
        entry.matched_mutations.push(m);
      } else {
        // Penyakit dari match mutasi yang tidak ada di etnis berisiko
        const diseaseInfo = allDiseases.find((d) => d.id === m.disease_id);
        if (diseaseInfo) {
          diseaseMap.set(m.disease_id, {
            ...diseaseInfo,
            from_ethnicity: false,
            mutation_matches: 1,
            matched_mutations: [m],
          });
        }
      }
    });

    return [...diseaseMap.values()].sort((a, b) => {
      // Sort: match mutasi dulu, lalu from_ethnicity, lalu nama
      if (b.mutation_matches !== a.mutation_matches)
        return b.mutation_matches - a.mutation_matches;
      if (b.from_ethnicity !== a.from_ethnicity)
        return b.from_ethnicity ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [diseaseDetails, matchedMutations, detectedDiseaseIds, allDiseases]);

  // Ranking etnis paling berisiko
  const ethnicityRanking = useMemo(() => {
    const ethnicMap = new Map();
    enrichedDiseases.forEach((d) => {
      d.at_risk_ethnicities?.forEach((e) => {
        if (!ethnicMap.has(e.id)) {
          ethnicMap.set(e.id, {
            id: e.id,
            name: e.name,
            region: e.region_distribution,
            diseaseCount: 0,
            diseases: [],
            isCurrent: e.name?.toLowerCase() === ethnicityName.toLowerCase(),
          });
        }
        const entry = ethnicMap.get(e.id);
        entry.diseaseCount += 1;
        entry.diseases.push(d.name);
      });
    });
    return [...ethnicMap.values()].sort(
      (a, b) => b.diseaseCount - a.diseaseCount,
    );
  }, [enrichedDiseases, ethnicityName]);

  const maxDiseaseCount = ethnicityRanking[0]?.diseaseCount || 1;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingTask) {
    return (
      <div className="space-y-5 max-w-5xl animate-pulse">
        <div className="skeleton h-10 w-64 rounded-xl" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-48 rounded-2xl" />
        ))}
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

  const isCompleted = task.status === "COMPLETED";
  const totalMutasi = task.total_mutations ?? 0;
  const hasMutations = totalMutasi > 0;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* ── Breadcrumb ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
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
        )}
      </motion.div>

      {/* ── SECTION 1: Header Task ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Status icon */}
          <div
            className={clsx(
              "w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0",
              task.status === "COMPLETED"
                ? "bg-success-500/10"
                : task.status === "FAILED"
                  ? "bg-danger-500/10"
                  : "bg-accent-500/10",
            )}
          >
            {task.status === "COMPLETED" && (
              <CheckCircle2 size={28} className="text-success-500" />
            )}
            {task.status === "FAILED" && (
              <XCircle size={28} className="text-danger-500" />
            )}
            {["PENDING", "PROCESSING"].includes(task.status) && (
              <Loader2 size={28} className="text-accent-500 animate-spin" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="font-display text-2xl font-bold text-[--text-primary]">
                Hasil Analisis Compare
              </h1>
              {isCompleted && (
                <span
                  className={clsx(
                    "badge",
                    hasMutations ? "badge-danger" : "badge-success",
                  )}
                >
                  {hasMutations
                    ? `${totalMutasi} mutasi terdeteksi`
                    : "Tidak ada mutasi"}
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-[--text-tertiary] mb-3">
              Task ID: {task.id}
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Status",
                  value: task.status,
                  color:
                    task.status === "COMPLETED"
                      ? "text-success-500"
                      : task.status === "FAILED"
                        ? "text-danger-500"
                        : "text-accent-500",
                },
                {
                  label: "Total Mutasi",
                  value: totalMutasi,
                  color: hasMutations ? "text-danger-500" : "text-success-500",
                },
                {
                  label: "Pjg Sampel",
                  value: task.sample_length
                    ? `${task.sample_length.toLocaleString()} bp`
                    : "—",
                  color: "text-primary-500",
                },
                {
                  label: "Pjg Referensi",
                  value: task.reference_length
                    ? `${task.reference_length.toLocaleString()} bp`
                    : "—",
                  color: "text-accent-500",
                },
              ].map((s, i) => (
                <div
                  key={i}
                  className="bg-[--bg-subtle] rounded-xl p-3 border border-[--border]"
                >
                  <p className="text-[11px] text-[--text-tertiary] uppercase tracking-wider mb-1">
                    {s.label}
                  </p>
                  <p
                    className={clsx("font-display text-lg font-bold", s.color)}
                  >
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Alignment summary */}
            {task.alignment_summary && (
              <div className="mt-4 p-3.5 rounded-xl bg-[--bg-subtle] border border-[--border]">
                <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <BarChart2 size={12} /> Ringkasan Alignment
                </p>
                <p className="text-sm text-[--text-secondary] leading-relaxed">
                  {task.alignment_summary}
                </p>
              </div>
            )}

            <p className="text-xs text-[--text-tertiary] mt-3">
              Dijalankan: {fmtDate(task.created_at)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── SECTION 2: Referensi Etnis ── */}
      {isCompleted && (
        <Section
          title="Referensi Etnis yang Digunakan"
          subtitle="Sekuens basis perbandingan untuk analisis ini"
          icon={Dna}
          iconColor="text-primary-500"
          delay={0.1}
        >
          {ethnicSeq ? (
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500
                flex items-center justify-center flex-shrink-0 shadow-glow-primary"
              >
                <span className="text-white text-xl font-display font-bold">
                  {ethnicSeq.ethnicity_name?.charAt(0)}
                </span>
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
                  <p className="text-sm text-[--text-secondary] leading-relaxed">
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
        </Section>
      )}

      {/* ── SECTION 3: Penyakit Berisiko ── */}
      {isCompleted && (
        <Section
          title="Penyakit yang Berkaitan"
          subtitle={
            hasMutations
              ? `Berdasarkan mutasi yang terdeteksi dan riwayat etnis ${ethnicityName || "ini"}`
              : `Penyakit yang berisiko untuk etnis ${ethnicityName || "ini"}`
          }
          icon={HeartPulse}
          iconColor="text-warning-500"
          badge={enrichedDiseases.length}
          delay={0.15}
        >
          {enrichedDiseases.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              {diseaseDetails.length === 0 && allDiseases.length === 0 ? (
                <>
                  <Loader2
                    size={24}
                    className="text-primary-500 animate-spin"
                  />
                  <p className="text-sm text-[--text-tertiary]">
                    Memuat data penyakit...
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2 size={28} className="text-success-500" />
                  <p className="text-sm font-medium text-success-500">
                    Tidak ada penyakit yang berkaitan dengan mutasi ini
                  </p>
                  <p className="text-xs text-[--text-tertiary] text-center max-w-xs">
                    Mutasi yang terdeteksi tidak cocok dengan pola mutasi
                    penyakit yang ada di database.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {enrichedDiseases.map((disease, i) => (
                <motion.div
                  key={disease.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className={clsx(
                    "rounded-xl p-4 border transition-colors group cursor-pointer",
                    disease.mutation_matches > 0
                      ? "border-danger-500/25 bg-danger-500/5 hover:bg-danger-500/8"
                      : "border-[--border] bg-[--bg-subtle] hover:bg-[--bg-muted]",
                  )}
                  onClick={() => navigate(`/diseases/${disease.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {/* Alert jika ada match mutasi */}
                        {disease.mutation_matches > 0 && (
                          <ShieldAlert
                            size={15}
                            className="text-danger-500 flex-shrink-0"
                          />
                        )}
                        <span className="text-sm font-semibold text-[--text-primary]">
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
                        {disease.from_ethnicity &&
                          !disease.mutation_matches && (
                            <span className="badge badge-muted text-[10px]">
                              Risiko etnis
                            </span>
                          )}
                      </div>

                      {disease.description && (
                        <p className="text-xs text-[--text-secondary] leading-relaxed mb-2 line-clamp-2">
                          {disease.description}
                        </p>
                      )}

                      {/* Mutasi yang cocok */}
                      {disease.matched_mutations?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[11px] text-[--text-tertiary] self-center">
                            Mutasi cocok:
                          </span>
                          {disease.matched_mutations.map((m, mi) => (
                            <span
                              key={mi}
                              className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5
                                rounded-md bg-danger-500/10 text-danger-600 dark:text-danger-400 border border-danger-500/20"
                            >
                              {m.code || `pos.${m.position}`}
                              <span
                                className={BASE_COLOR[m.reference_base] || ""}
                              >
                                {m.reference_base}
                              </span>
                              →
                              <span className={BASE_COLOR[m.sample_base] || ""}>
                                {m.sample_base}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Etnis berisiko untuk penyakit ini */}
                      {disease.at_risk_ethnicities?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {disease.at_risk_ethnicities.slice(0, 4).map((e) => (
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
                          {disease.at_risk_ethnicities.length > 4 && (
                            <span className="text-[10px] text-[--text-tertiary]">
                              +{disease.at_risk_ethnicities.length - 4} lagi
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      size={15}
                      className="text-[--text-tertiary] flex-shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ── SECTION 4: Ranking Etnis Berisiko ── */}
      {isCompleted && ethnicityRanking.length > 0 && (
        <Section
          title="Ranking Etnis Berdasarkan Risiko"
          subtitle="Kelompok etnis yang paling banyak dikaitkan dengan penyakit yang relevan"
          icon={Globe}
          iconColor="text-accent-500"
          delay={0.2}
        >
          <div className="space-y-4">
            {ethnicityRanking.map((eth, i) => (
              <motion.div
                key={eth.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={clsx(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                        i === 0
                          ? "bg-danger-500/15 text-danger-500"
                          : i === 1
                            ? "bg-warning-400/15 text-warning-500"
                            : i === 2
                              ? "bg-accent-500/15 text-accent-500"
                              : "bg-[--bg-muted] text-[--text-tertiary]",
                      )}
                    >
                      {i + 1}
                    </span>
                    <div>
                      <span
                        className={clsx(
                          "text-sm font-semibold",
                          eth.isCurrent
                            ? "text-primary-500"
                            : "text-[--text-primary]",
                        )}
                      >
                        {eth.name}
                        {eth.isCurrent && (
                          <span className="ml-1.5 badge badge-primary text-[10px]">
                            Referensi ini
                          </span>
                        )}
                      </span>
                      {eth.region && (
                        <p className="text-[11px] text-[--text-tertiary]">
                          {eth.region}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <RiskLevel score={eth.diseaseCount} max={maxDiseaseCount} />
                {/* Daftar penyakit */}
                <div className="flex flex-wrap gap-1 ml-9">
                  {eth.diseases.slice(0, 3).map((d, di) => (
                    <span
                      key={di}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[--bg-muted] text-[--text-tertiary]"
                    >
                      {d}
                    </span>
                  ))}
                  {eth.diseases.length > 3 && (
                    <span className="text-[10px] text-[--text-tertiary] self-center">
                      +{eth.diseases.length - 3} penyakit lagi
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </Section>
      )}

      {/* ── SECTION 5: Tabel Mutasi Diperkaya ── */}
      {isCompleted && (
        <Section
          title="Detail Mutasi yang Terdeteksi"
          subtitle="Setiap mutasi diperkaya dengan kode notasi dan penyakit terkait dari database"
          icon={Microscope}
          iconColor="text-danger-500"
          badge={totalMutasi}
          delay={0.25}
        >
          {!hasMutations ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle2 size={28} className="text-success-500" />
              <p className="text-sm font-medium text-success-500">
                Tidak ada mutasi terdeteksi
              </p>
              <p className="text-xs text-[--text-tertiary]">
                Sekuens sampel identik dengan referensi etnis{" "}
                {ethnicityName || "ini"}.
              </p>
            </div>
          ) : (
            <div className="table-wrapper overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>Posisi</th>
                    <th>Perubahan Basa</th>
                    <th>Tipe Mutasi</th>
                    <th>Kode Notasi</th>
                    <th>Penyakit Terkait</th>
                    <th>Status Match</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedMutations.map((mut, i) => {
                    const mutType = getMutType(mut);
                    const hasMatch = !!mut.db_match;
                    return (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 + i * 0.02 }}
                        className={clsx(hasMatch && "bg-danger-500/3")}
                      >
                        <td className="text-center font-mono text-xs text-[--text-tertiary]">
                          {i + 1}
                        </td>
                        <td>
                          <span className="font-mono text-sm font-bold text-[--text-primary]">
                            {mut.position?.toLocaleString()}
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
                            <ArrowRight
                              size={11}
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
                        <td>
                          <span
                            className={clsx(
                              "badge text-[10px]",
                              MUT_TYPE_COLOR[mutType] || "badge-muted",
                            )}
                          >
                            {mut.mutation_type || mutType}
                          </span>
                        </td>
                        <td>
                          {mut.code ? (
                            <span className="font-mono text-xs text-primary-500">
                              {mut.code}
                            </span>
                          ) : (
                            <span className="text-[--text-tertiary] text-xs">
                              —
                            </span>
                          )}
                        </td>
                        <td>
                          {mut.disease_name ? (
                            <button
                              onClick={() =>
                                navigate(`/diseases/${mut.disease_id}`)
                              }
                              className="flex items-center gap-1.5 text-xs text-warning-600 dark:text-warning-400 hover:underline"
                            >
                              <HeartPulse size={11} />
                              {mut.disease_name}
                            </button>
                          ) : (
                            <span className="text-[--text-tertiary] text-xs">
                              Tidak diketahui
                            </span>
                          )}
                        </td>
                        <td>
                          {hasMatch ? (
                            <span className="flex items-center gap-1 text-[10px] text-danger-500 font-medium">
                              <AlertTriangle size={11} /> Cocok di DB
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-[--text-tertiary]">
                              <Info size={11} /> Baru
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Info enrichment */}
          {hasMutations && (
            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-accent-500/8 border border-accent-500/15">
              <Info
                size={13}
                className="text-accent-500 flex-shrink-0 mt-0.5"
              />
              <p className="text-xs text-accent-600 dark:text-accent-400 leading-relaxed">
                <strong>Cocok di DB</strong> berarti mutasi ini ditemukan di
                database dengan penyakit yang sudah tercatat.{" "}
                <strong>Baru</strong> berarti mutasi ini belum ada di database —
                pertimbangkan untuk mencatatnya di modul Mutations.
              </p>
            </div>
          )}
        </Section>
      )}

      {/* ── SECTION 6: Pasien Terkait ── */}
      {isCompleted && (
        <Section
          title="Pasien dari Etnis yang Sama"
          subtitle={`Pasien dengan etnis ${ethnicityName || "—"} yang mungkin memiliki risiko serupa`}
          icon={Users}
          iconColor="text-accent-500"
          badge={relatedPatients.length}
          delay={0.3}
        >
          {relatedPatients.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              {!ethnicityName ? (
                <>
                  <Loader2
                    size={20}
                    className="text-primary-500 animate-spin"
                  />
                  <p className="text-sm text-[--text-tertiary]">
                    Memuat data pasien...
                  </p>
                </>
              ) : (
                <>
                  <Users size={24} className="text-[--text-tertiary]" />
                  <p className="text-sm text-[--text-tertiary]">
                    Tidak ada pasien terdaftar dari etnis {ethnicityName}
                  </p>
                  <button
                    onClick={() => navigate("/patients/new")}
                    className="btn btn-glass btn-sm"
                  >
                    <Users size={13} /> Tambah Pasien
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {relatedPatients.slice(0, 10).map((p, i) => {
                const age = p.date_of_birth
                  ? Math.floor(
                      (Date.now() - new Date(p.date_of_birth)) /
                        (1000 * 60 * 60 * 24 * 365.25),
                    )
                  : null;
                return (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.04 }}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl
                      hover:bg-[--bg-muted] transition-colors text-left group"
                  >
                    <div
                      className={clsx(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0",
                        p.gender === "FEMALE"
                          ? "bg-gradient-to-br from-pink-400 to-primary-500"
                          : "bg-gradient-to-br from-accent-400 to-accent-600",
                      )}
                    >
                      {p.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[--text-primary]">
                        {p.full_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[--text-tertiary]">
                        <span className="font-mono">{p.nik}</span>
                        {age && <span>· {age} thn</span>}
                        {p.address_city && <span>· {p.address_city}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                        size={14}
                        className="text-[--text-tertiary] group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </motion.button>
                );
              })}
              {relatedPatients.length > 10 && (
                <button
                  onClick={() =>
                    navigate(
                      `/patients?ethnicity=${encodeURIComponent(ethnicityName)}`,
                    )
                  }
                  className="w-full text-center py-2 text-xs text-primary-500 hover:underline"
                >
                  Lihat {relatedPatients.length - 10} pasien lainnya →
                </button>
              )}
            </div>
          )}
        </Section>
      )}

      {/* ── Info task tidak selesai ── */}
      {task.status === "FAILED" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5 flex items-start gap-3"
        >
          <XCircle size={20} className="text-danger-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger-500">
              Analisis Gagal
            </p>
            <p className="text-xs text-[--text-secondary] mt-1">
              {task.status_message ||
                "Terjadi kesalahan saat analisis. Coba jalankan ulang."}
            </p>
            <button
              onClick={() => navigate("/analyze/compare")}
              className="mt-3 btn btn-glass btn-sm"
            >
              Analisis Ulang
            </button>
          </div>
        </motion.div>
      )}

      {["PENDING", "PROCESSING"].includes(task.status) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 flex flex-col items-center gap-3"
        >
          <Loader2 size={28} className="text-accent-500 animate-spin" />
          <p className="text-sm font-medium text-[--text-primary]">
            Analisis sedang berjalan...
          </p>
          <p className="text-xs text-[--text-tertiary]">
            Halaman ini akan otomatis diperbarui saat selesai.
          </p>
          <div className="h-1 w-48 rounded-full bg-[--bg-muted] overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full animate-shimmer bg-[length:200%_100%]" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
