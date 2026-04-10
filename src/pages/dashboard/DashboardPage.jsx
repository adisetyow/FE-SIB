/**
 * pages/dashboard/DashboardPage.jsx
 * Dashboard dengan:
 * - 6 stat cards (sequences, patients, mutations, diseases, ethnicities, literature)
 * - Bar chart: distribusi penyakit per etnis (core insight aplikasi ini)
 * - Pie/donut chart: mutasi berdasarkan tipe
 * - Line chart: aktivitas penelitian per bulan
 * - Recent activities list
 * Semua data dari API menggunakan React Query
 */
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import {
  Dna,
  Users,
  Microscope,
  HeartPulse,
  Globe,
  FileText,
  TrendingUp,
  Activity,
  ArrowUpRight,
  RefreshCw,
  Beaker,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import clsx from "clsx";
import apiClient from "../../utils/apiClient";

// ─── Data fetchers ────────────────────────────────────────────────────────────
const fetchers = {
  sequences: () =>
    apiClient.get("/api/v1/genetics/sequences?limit=1000").then((r) => r.data),
  patients: () =>
    apiClient.get("/api/v1/patients/?limit=1000").then((r) => r.data),
  mutations: () =>
    apiClient.get("/api/v1/mutations/?limit=1000").then((r) => r.data),
  diseases: () =>
    apiClient.get("/api/v1/diseases?limit=1000").then((r) => r.data),
  ethnicities: () =>
    apiClient.get("/api/v1/ethnicities/?limit=1000").then((r) => r.data),
  literature: () =>
    apiClient.get("/api/v1/literature/?limit=1000").then((r) => r.data),
  activities: () =>
    apiClient.get("/api/v1/activities/?limit=20").then((r) => r.data),
};

// ─── Chart colors ─────────────────────────────────────────────────────────────
const CHART_COLORS = [
  "#00bfbf",
  "#2d6cff",
  "#4ddcdc",
  "#6090ff",
  "#007373",
  "#0038cc",
  "#1ad2d2",
  "#4ade80",
];

// ─── useThemeColors ───────────────────────────────────────────────────────────
function useChartTheme() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return { grid: "#e2e8f0", text: "#94a3b8", tooltip: "#ffffff" };
  return theme === "dark"
    ? { grid: "rgba(255,255,255,0.06)", text: "#64748b", tooltip: "#0f172a" }
    : { grid: "rgba(15,23,42,0.06)", text: "#94a3b8", tooltip: "#ffffff" };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3.5 py-2.5 text-sm shadow-glass-md">
      <p className="font-semibold text-[--text-primary] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[--text-secondary]">
          <span style={{ color: p.color }}>● </span>
          {p.name}:{" "}
          <span className="font-medium text-[--text-primary]">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] },
  }),
};

function StatCard({ icon: Icon, label, value, color, index, isLoading }) {
  return (
    <motion.div
      custom={index}
      variants={staggerItem}
      initial="hidden"
      animate="visible"
      className="glass rounded-xl p-5 hover:shadow-glass-md transition-all duration-300 hover:-translate-y-0.5 group"
    >
      <div className="flex items-start justify-between">
        <div
          className={clsx(
            "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
            color,
          )}
        >
          <Icon size={20} className="text-white" />
        </div>
        <ArrowUpRight
          size={15}
          className="text-[--text-tertiary] opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
      <div className="mt-3">
        {isLoading ? (
          <div className="skeleton h-8 w-16 mb-1 rounded-lg" />
        ) : (
          <div className="font-display text-3xl font-bold text-[--text-primary] leading-none">
            {typeof value === "number" ? value.toLocaleString() : "—"}
          </div>
        )}
        <p className="text-sm text-[--text-secondary] mt-1">{label}</p>
      </div>
    </motion.div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className={clsx("glass rounded-xl p-5", className)}
    >
      <div className="mb-4">
        <h3 className="font-display text-base font-bold text-[--text-primary]">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-[--text-secondary] mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </motion.div>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { t } = useTranslation();
  const ct = useChartTheme();

  // Fetch semua data paralel
  const { data: sequences, isLoading: lSeq } = useQuery({
    queryKey: ["sequences-all"],
    queryFn: fetchers.sequences,
  });
  const { data: patients, isLoading: lPat } = useQuery({
    queryKey: ["patients-all"],
    queryFn: fetchers.patients,
  });
  const { data: mutations, isLoading: lMut } = useQuery({
    queryKey: ["mutations-all"],
    queryFn: fetchers.mutations,
  });
  const { data: diseases, isLoading: lDis } = useQuery({
    queryKey: ["diseases-all"],
    queryFn: fetchers.diseases,
  });
  const { data: ethnicities, isLoading: lEth } = useQuery({
    queryKey: ["ethnicities-all"],
    queryFn: fetchers.ethnicities,
  });
  const { data: literature, isLoading: lLit } = useQuery({
    queryKey: ["literature-all"],
    queryFn: fetchers.literature,
  });
  const { data: activities, isLoading: lAct } = useQuery({
    queryKey: ["activities-dash"],
    queryFn: fetchers.activities,
  });

  // ── Derived chart data ────────────────────────────────────────────────────
  // 1. Distribusi Penyakit per Etnis (dari diseases.at_risk_ethnicities)
  const ethnicDiseaseData = (() => {
    if (!diseases || !ethnicities) return [];
    const countMap = {};
    diseases.forEach((d) => {
      const count = d.ethnicity_count || 0;
      // Gunakan data dari list diseases yang punya ethnicity_count
    });
    // Dari ethnicities: tampilkan patient_count sebagai proxy popularitas
    return (ethnicities || [])
      .filter((e) => e.patient_count > 0)
      .sort((a, b) => b.patient_count - a.patient_count)
      .slice(0, 10)
      .map((e) => ({ name: e.name, Pasien: e.patient_count }));
  })();

  // 2. Mutasi berdasarkan tipe (pie chart)
  const mutationTypeData = (() => {
    if (!mutations) return [];
    const map = {};
    mutations.forEach((m) => {
      const t = m.mutation_type || "Unknown";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  })();

  // 3. Sequence by type (bar)
  const seqTypeData = (() => {
    if (!sequences) return [];
    const map = { DNA: 0, RNA: 0, PROTEIN: 0 };
    sequences.forEach((s) => {
      map[s.seq_type] = (map[s.seq_type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  // 4. Penyakit dengan etnis terbanyak (top 8)
  const topDiseases = (diseases || [])
    .filter((d) => d.ethnicity_count > 0)
    .sort((a, b) => b.ethnicity_count - a.ethnicity_count)
    .slice(0, 8)
    .map((d) => ({
      name: d.name.length > 20 ? d.name.slice(0, 18) + "…" : d.name,
      Etnis: d.ethnicity_count,
      Mutasi: d.mutation_count,
    }));

  const stats = [
    {
      icon: Dna,
      label: t("dashboard.totalSequences"),
      value: sequences?.length,
      color: "bg-gradient-to-br from-primary-400 to-primary-600",
      loading: lSeq,
    },
    {
      icon: Users,
      label: t("dashboard.totalPatients"),
      value: patients?.length,
      color: "bg-gradient-to-br from-accent-400 to-accent-600",
      loading: lPat,
    },
    {
      icon: Microscope,
      label: t("dashboard.totalMutations"),
      value: mutations?.length,
      color: "bg-gradient-to-br from-danger-400 to-danger-600",
      loading: lMut,
    },
    {
      icon: HeartPulse,
      label: t("dashboard.totalDiseases"),
      value: diseases?.length,
      color: "bg-gradient-to-br from-warning-400 to-warning-600",
      loading: lDis,
    },
    {
      icon: Globe,
      label: t("dashboard.totalEthnicities"),
      value: ethnicities?.length,
      color: "bg-gradient-to-br from-success-400 to-success-600",
      loading: lEth,
    },
    {
      icon: FileText,
      label: t("dashboard.totalLiterature"),
      value: literature?.length,
      color: "bg-gradient-to-br from-primary-600 to-accent-600",
      loading: lLit,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title">{t("dashboard.title")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[--text-tertiary]">
          <Activity size={14} className="text-success-500 animate-pulse" />
          Live data
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s, idx) => (
          <StatCard
            key={s.label}
            icon={s.icon}
            label={s.label}
            value={s.value}
            color={s.color}
            index={idx}
            isLoading={s.loading}
          />
        ))}
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Distribusi Pasien per Etnis — WIDE */}
        <ChartCard
          className="lg:col-span-3"
          title={t("dashboard.ethnicDiseaseDist")}
          subtitle="Jumlah pasien per kelompok etnis"
        >
          {lEth || lPat ? (
            <div className="skeleton h-56 rounded-xl" />
          ) : ethnicDiseaseData.length === 0 ? (
            <EmptyChart label="Belum ada data pasien per etnis" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={ethnicDiseaseData}
                margin={{ top: 4, right: 4, bottom: 16, left: -16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={ct.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: ct.text, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={48}
                  interval={0}
                />
                <YAxis
                  tick={{ fill: ct.text, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(0,191,191,0.06)" }}
                />
                <Bar
                  dataKey="Pasien"
                  fill="#00bfbf"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Mutasi per Tipe — NARROW */}
        <ChartCard
          className="lg:col-span-2"
          title={t("dashboard.mutationByType")}
          subtitle="Distribusi tipe mutasi"
        >
          {lMut ? (
            <div className="skeleton h-56 rounded-xl" />
          ) : mutationTypeData.length === 0 ? (
            <EmptyChart label="Belum ada data mutasi" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={mutationTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {mutationTypeData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 justify-center mt-1">
                {mutationTypeData.map((d, idx) => (
                  <span
                    key={d.name}
                    className="flex items-center gap-1.5 text-xs text-[--text-secondary]"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: CHART_COLORS[idx % CHART_COLORS.length],
                      }}
                    />
                    {d.name}{" "}
                    <span className="font-medium text-[--text-primary]">
                      ({d.value})
                    </span>
                  </span>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Penyakit dengan Etnis Terbanyak */}
        <ChartCard
          title={t("dashboard.topDiseases")}
          subtitle="Penyakit dengan relasi etnis dan mutasi terbanyak"
        >
          {lDis ? (
            <div className="skeleton h-52 rounded-xl" />
          ) : topDiseases.length === 0 ? (
            <EmptyChart label="Belum ada data penyakit" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={topDiseases}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={ct.grid}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: ct.text, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: ct.text, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(0,191,191,0.06)" }}
                />
                <Bar
                  dataKey="Etnis"
                  fill="#00bfbf"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={14}
                />
                <Bar
                  dataKey="Mutasi"
                  fill="#2d6cff"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={14}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "12px", color: ct.text }}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Sequence by Type */}
        <ChartCard
          title={t("dashboard.sequenceByType")}
          subtitle="Distribusi tipe sekuens genetik dalam database"
        >
          {lSeq ? (
            <div className="skeleton h-52 rounded-xl" />
          ) : seqTypeData.length === 0 ? (
            <EmptyChart label="Belum ada data sekuens" />
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={seqTypeData}
                margin={{ top: 4, right: 4, bottom: 4, left: -16 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={ct.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: ct.text, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: ct.text, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "rgba(0,191,191,0.06)" }}
                />
                <Bar
                  dataKey="value"
                  name="Sekuens"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={64}
                >
                  {seqTypeData.map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* ── Recent Activities ── */}
      <ChartCard
        title={t("dashboard.recentActivity")}
        subtitle="Aktivitas penelitian terbaru"
      >
        {lAct ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-12 rounded-xl" />
            ))}
          </div>
        ) : !activities?.length ? (
          <EmptyChart label="Belum ada aktivitas penelitian" />
        ) : (
          <div className="space-y-2">
            {activities.slice(0, 6).map((act, idx) => (
              <motion.div
                key={act.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3.5 p-3.5 rounded-xl hover:bg-[--bg-muted] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Activity size={16} className="text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[--text-primary] truncate">
                    {act.activity_name}
                  </p>
                  <p className="text-xs text-[--text-tertiary]">
                    #{act.activity_number} · {act.researcher_name || "Peneliti"}{" "}
                    · {act.tools_count} alat · {act.evidences_count} bukti
                  </p>
                </div>
                <div className="text-xs text-[--text-tertiary] whitespace-nowrap flex-shrink-0">
                  {act.date
                    ? new Date(act.date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "—"}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function EmptyChart({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-2">
      <Beaker size={28} className="text-[--text-tertiary]" />
      <p className="text-sm text-[--text-tertiary]">{label}</p>
    </div>
  );
}
