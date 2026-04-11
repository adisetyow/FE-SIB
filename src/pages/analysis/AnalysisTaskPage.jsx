/**
 * pages/analysis/AnalysisTaskPage.jsx
 * Riwayat task analisis — update dengan export PDF per task + Excel semua tasks
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ListTodo,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  Microscope,
  BarChart2,
  ArrowRight,
  Filter,
  Plus,
  RefreshCw,
  FileText,
} from "lucide-react";
import clsx from "clsx";

import { analysisApi } from "../../api/analysisApi";
import { usePolling } from "../../hooks/usePolling";
import { exportAnalysisToPDF, exportDataToPDF } from "../../utils/exportPDF";
import { exportAnalisysTasksToExcel } from "../../utils/exportExcel";
import ExportButton from "../../components/export/ExportButton";

const STATUS_CFG = {
  PENDING: {
    label: "Menunggu",
    color: "badge-warning",
    icon: Clock,
    spin: false,
  },
  PROCESSING: {
    label: "Proses",
    color: "badge-accent",
    icon: Loader2,
    spin: true,
  },
  COMPLETED: {
    label: "Selesai",
    color: "badge-success",
    icon: CheckCircle2,
    spin: false,
  },
  FAILED: { label: "Gagal", color: "badge-danger", icon: XCircle, spin: false },
};

const BASE_COLOR = {
  A: "text-blue-500",
  T: "text-green-500",
  G: "text-red-500",
  C: "text-yellow-500",
  U: "text-purple-500",
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={clsx("badge gap-1", cfg.color)}>
      <Icon size={11} className={cfg.spin ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TaskRow({ task: init, index }) {
  const [open, setOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const { task } = usePolling(init.id, {
    interval: 2500,
    enabled: ["PENDING", "PROCESSING"].includes(init.status),
  });
  const t = task || init;

  async function handleExportPDF() {
    setPdfLoading(true);
    try {
      await exportAnalysisToPDF(t);
      toast.success("PDF berhasil digenerate");
    } catch {
      toast.error("Gagal membuat PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border border-[--border] rounded-xl overflow-hidden"
    >
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
        >
          <div
            className={clsx(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
              t.status === "COMPLETED"
                ? "bg-success-500/10"
                : t.status === "FAILED"
                  ? "bg-danger-500/10"
                  : "bg-accent-500/10",
            )}
          >
            {t.status === "COMPLETED" && (
              <CheckCircle2 size={16} className="text-success-500" />
            )}
            {t.status === "FAILED" && (
              <XCircle size={16} className="text-danger-500" />
            )}
            {["PENDING", "PROCESSING"].includes(t.status) && (
              <Loader2 size={16} className="text-accent-500 animate-spin" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-[--text-primary]">
                Task Analisis
              </span>
              <StatusBadge status={t.status} />
              {t.status === "COMPLETED" && t.total_mutations !== null && (
                <span
                  className={clsx(
                    "badge text-[10px]",
                    (t.total_mutations ?? 0) > 0
                      ? "badge-danger"
                      : "badge-success",
                  )}
                >
                  {t.total_mutations ?? 0} mutasi
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-[--text-tertiary] font-mono">
                ID: {t.id?.slice(0, 12)}...
              </span>
              <span className="text-xs text-[--text-tertiary]">
                {fmtDate(t.created_at)}
              </span>
            </div>
          </div>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {t.status === "COMPLETED" && (
            <button
              onClick={handleExportPDF}
              disabled={pdfLoading}
              title="Export PDF"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
            >
              {pdfLoading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <FileText size={13} />
              )}
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:bg-[--bg-muted] transition-colors"
          >
            <ChevronDown
              size={16}
              className={clsx(
                "transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-[--border] space-y-4 bg-[--bg-subtle]/50">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: "Referensi ID",
                    value: t.reference_sequence_id?.slice(0, 16) + "...",
                    mono: true,
                  },
                  {
                    label: "Panjang Sampel",
                    value: t.sample_length
                      ? `${t.sample_length.toLocaleString()} bp`
                      : "—",
                  },
                  {
                    label: "Panjang Referensi",
                    value: t.reference_length
                      ? `${t.reference_length.toLocaleString()} bp`
                      : "—",
                  },
                  { label: "Total Mutasi", value: t.total_mutations ?? "—" },
                  { label: "Dibuat", value: fmtDate(t.created_at) },
                  { label: "Diperbarui", value: fmtDate(t.updated_at) },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="bg-[--bg-surface] rounded-lg p-3 border border-[--border]"
                  >
                    <p className="text-[11px] text-[--text-tertiary] uppercase tracking-wider mb-1">
                      {item.label}
                    </p>
                    <p
                      className={clsx(
                        "text-xs font-medium text-[--text-primary]",
                        item.mono && "font-mono",
                      )}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {t.alignment_summary && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[--text-tertiary] mb-2 flex items-center gap-1.5">
                    <BarChart2 size={12} />
                    Ringkasan Alignment
                  </p>
                  <div className="p-3 rounded-lg bg-[--bg-surface] border border-[--border]">
                    <p className="text-xs text-[--text-secondary] leading-relaxed">
                      {t.alignment_summary}
                    </p>
                  </div>
                </div>
              )}

              {t.status === "COMPLETED" && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[--text-tertiary] mb-2 flex items-center gap-1.5">
                    <Microscope size={12} />
                    Mutasi ({t.mutations?.length ?? 0})
                  </p>
                  {!t.mutations?.length ? (
                    <div className="flex items-center gap-2 text-sm text-success-500 p-3 rounded-lg bg-success-500/8">
                      <CheckCircle2 size={15} />
                      Tidak ada mutasi — sekuens identik dengan referensi
                    </div>
                  ) : (
                    <div className="table-wrapper max-h-64 overflow-y-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th className="w-12 text-center">#</th>
                            <th>Posisi</th>
                            <th>Ref → Sampel</th>
                            <th>Tipe</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.mutations.map((mut, i) => {
                            const mt =
                              mut.reference_base === "-"
                                ? "Insertion"
                                : mut.sample_base === "-"
                                  ? "Deletion"
                                  : "Substitusi";
                            return (
                              <tr key={i}>
                                <td className="text-center text-xs text-[--text-tertiary] font-mono">
                                  {i + 1}
                                </td>
                                <td className="font-mono text-sm font-bold">
                                  {mut.position.toLocaleString()}
                                </td>
                                <td>
                                  <div className="flex items-center gap-1.5 font-mono text-sm font-bold">
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
                                      mt === "Substitusi" && "badge-danger",
                                      mt === "Insertion" && "badge-warning",
                                      mt === "Deletion" && "badge-accent",
                                    )}
                                  >
                                    {mt}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
              {t.status === "FAILED" && t.status_message && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-danger-500/8 border border-danger-500/15">
                  <XCircle
                    size={14}
                    className="text-danger-500 flex-shrink-0 mt-0.5"
                  />
                  <p className="text-xs text-danger-500">{t.status_message}</p>
                </div>
              )}
              {["PENDING", "PROCESSING"].includes(t.status) && (
                <div className="flex items-center gap-2 text-xs text-[--text-tertiary]">
                  <Loader2 size={12} className="animate-spin" />
                  Memperbarui otomatis...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AnalysisTaskPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState("");

  const {
    data: tasks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["analysis-tasks", filterStatus],
    queryFn: () =>
      analysisApi.listTasks({
        limit: 200,
        ...(filterStatus && { status: filterStatus }),
      }),
    refetchInterval: (q) => {
      const d = q.state.data;
      return d?.some((t) => ["PENDING", "PROCESSING"].includes(t.status))
        ? 5000
        : false;
    },
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "COMPLETED").length,
    processing: tasks.filter((t) =>
      ["PENDING", "PROCESSING"].includes(t.status),
    ).length,
    failed: tasks.filter((t) => t.status === "FAILED").length,
  };

  const FILTERS = [
    { value: "", label: "Semua" },
    { value: "COMPLETED", label: "Selesai" },
    { value: "PROCESSING", label: "Proses" },
    { value: "PENDING", label: "Menunggu" },
    { value: "FAILED", label: "Gagal" },
  ];

  return (
    <div className="space-y-5 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ListTodo size={22} className="text-primary-500" />
            {t("nav.analysis")}
          </h1>
          <p className="page-subtitle">
            Riwayat semua task analisis perbandingan sekuens
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton
            onExportExcel={() => exportAnalisysTasksToExcel(tasks)}
            onExportPDF={
              stats.completed > 0
                ? async () => {
                    await exportDataToPDF({
                      title: "Riwayat Task Analisis",
                      subtitle: `${stats.completed} task selesai`,
                      columns: [
                        {
                          key: "id",
                          header: "Task ID",
                          flex: 1.5,
                          format: (v) => v?.slice(0, 14) + "...",
                        },
                        { key: "status", header: "Status", flex: 0.8 },
                        { key: "total_mutations", header: "Mutasi", flex: 0.6 },
                        {
                          key: "sample_length",
                          header: "Pjg Sampel",
                          flex: 0.8,
                          format: (v) => (v ? `${v.toLocaleString()} bp` : "—"),
                        },
                        {
                          key: "created_at",
                          header: "Tanggal",
                          flex: 1,
                          format: (v) =>
                            v ? new Date(v).toLocaleDateString("id-ID") : "—",
                        },
                      ],
                      rows: tasks.filter((t) => t.status === "COMPLETED"),
                      filename: "analysis_tasks",
                      summary: {
                        "Total Task": stats.total,
                        Selesai: stats.completed,
                        Gagal: stats.failed,
                      },
                    });
                  }
                : undefined
            }
          />
          <button
            onClick={() => navigate("/analyze/compare")}
            className="btn btn-primary btn-sm"
          >
            <Plus size={15} /> Analisis Baru
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            label: "Total Task",
            value: stats.total,
            color: "text-primary-500",
          },
          {
            label: "Selesai",
            value: stats.completed,
            color: "text-success-500",
          },
          { label: "Aktif", value: stats.processing, color: "text-accent-500" },
          { label: "Gagal", value: stats.failed, color: "text-danger-500" },
        ].map((s, i) => (
          <div key={i} className="glass rounded-xl p-4">
            {isLoading ? (
              <div className="skeleton h-7 w-10 rounded-lg mb-1" />
            ) : (
              <p className={clsx("font-display text-2xl font-bold", s.color)}>
                {s.value}
              </p>
            )}
            <p className="text-xs text-[--text-secondary] mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07 }}
        className="glass rounded-2xl p-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <Filter size={14} className="text-[--text-tertiary]" />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilterStatus(f.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                  filterStatus === f.value
                    ? "bg-primary-500/15 text-primary-500 border border-primary-500/30"
                    : "text-[--text-secondary] hover:bg-[--bg-muted] border border-transparent",
                )}
              >
                {f.label}
                {f.value && (
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({tasks.filter((t) => t.status === f.value).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={() => refetch()}
            className="btn btn-ghost btn-sm gap-1.5"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))
        ) : tasks.length === 0 ? (
          <div className="glass rounded-2xl p-12 flex flex-col items-center gap-3">
            <ListTodo size={36} className="text-[--text-tertiary]" />
            <p className="text-sm font-medium text-[--text-tertiary]">
              {filterStatus
                ? `Tidak ada task dengan status "${filterStatus}"`
                : "Belum ada task analisis"}
            </p>
            <button
              onClick={() => navigate("/analyze/compare")}
              className="btn btn-primary btn-sm mt-2"
            >
              <FlaskConical size={14} /> Mulai Analisis Pertama
            </button>
          </div>
        ) : (
          tasks.map((task, idx) => (
            <TaskRow key={task.id} task={task} index={idx} />
          ))
        )}
      </motion.div>
    </div>
  );
}
