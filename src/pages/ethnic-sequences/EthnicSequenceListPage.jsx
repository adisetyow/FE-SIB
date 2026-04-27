/**
 * pages/ethnic-sequences/EthnicSequenceListPage.jsx
 *
 * Halaman daftar Ethnic Sequences:
 * - Tabel dengan filter ethnicity_name + data_type + search
 * - Status badge: UPLOADING / READY / FAILED
 * - Klik baris → halaman detail
 * - Tombol tambah → halaman form create
 * - Tombol edit → halaman form edit (metadata saja)
 * - Tombol hapus → confirm dialog
 * - Export Excel
 *
 * Catatan: ID adalah UUID string, bukan integer
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  Beaker,
  Pencil,
  Trash2,
  Eye,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { ethnicSequencesApi } from "../../api/ethnicSequencesApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useDebounce } from "../../hooks/useDebounce";

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  READY: { label: "Ready", color: "badge-success", icon: CheckCircle2 },
  UPLOADING: { label: "Uploading", color: "badge-warning", icon: Loader2 },
  FAILED: { label: "Failed", color: "badge-danger", icon: XCircle },
};

const TYPE_COLOR = {
  NORMAL: "badge-primary",
  MUTANT: "badge-danger",
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UPLOADING;
  const Icon = cfg.icon;
  return (
    <span className={clsx("badge gap-1", cfg.color)}>
      <Icon
        size={11}
        className={status === "UPLOADING" ? "animate-spin" : ""}
      />
      {cfg.label}
    </span>
  );
}

// ─── Format file size ─────────────────────────────────────────────────────────
function formatSize(mb) {
  if (!mb && mb !== 0) return "—";
  if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function EthnicSequenceListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [filterType, setFilterType] = useState("");
  const [filterName, setFilterName] = useState("");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);
  // ── Query ─────────────────────────────────────────────────────────────────
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["ethnic-sequences", filterType, filterName, debouncedSearch],

    queryFn: () =>
      ethnicSequencesApi.listEthnicSequences({
        limit: 1000,
        ...(filterType && { data_type: filterType }),
        ...(filterName && { ethnicity_name: filterName }),
        ...(debouncedSearch && { search: debouncedSearch }),
      }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const { data: dataTypes = [] } = useQuery({
    queryKey: ["ethnic-data-types"],
    queryFn: ethnicSequencesApi.getDataTypes,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Ambil daftar etnisitas unik dari data untuk filter dropdown
  const ethnicityOptions = [
    ...new Set(sequences.map((s) => s.ethnicity_name)),
  ].sort();

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => ethnicSequencesApi.deleteEthnicSequence(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ethnic-sequences"] });
      toast.success("Sekuens etnis berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus"),
  });

  // ── Export ────────────────────────────────────────────────────────────────
  function handleExport() {
    const rows = sequences.map((s) => ({
      ID: s.id,
      "Nama Etnis": s.ethnicity_name,
      "Tipe Data": s.data_type,
      File: s.original_filename || "",
      "Ukuran (MB)": s.file_size_mb?.toFixed(2) || "",
      Status: s.status,
      Deskripsi: s.description || "",
      Dibuat: s.created_at
        ? new Date(s.created_at).toLocaleDateString("id-ID")
        : "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Ethnic Sequences");
    XLSX.writeFile(
      wb,
      `ethnic_sequences_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Data berhasil diekspor ke Excel");
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      key: "ethnicity_name",
      header: t("ethnicSequences.ethnicityName"),
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500
            flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-glow-primary"
          >
            {val?.charAt(0)?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary]">{val}</p>
            {row.description && (
              <p className="text-xs text-[--text-tertiary] truncate max-w-[180px]">
                {row.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "data_type",
      header: t("ethnicSequences.dataType"),
      width: "100px",
      render: (val) => (
        <span className={clsx("badge", TYPE_COLOR[val] || "badge-muted")}>
          {val}
        </span>
      ),
    },
    {
      key: "original_filename",
      header: "File",
      width: "180px",
      render: (val, row) =>
        val ? (
          <div className="flex items-center gap-1.5 text-xs">
            <FileText
              size={13}
              className="text-[--text-tertiary] flex-shrink-0"
            />
            <span className="font-mono text-[--text-secondary] truncate max-w-[140px]">
              {val}
            </span>
          </div>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "file_size_mb",
      header: t("ethnicSequences.fileSize"),
      width: "90px",
      align: "right",
      render: (val) => (
        <span className="text-xs font-mono text-[--text-secondary]">
          {formatSize(val)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("ethnicSequences.uploadStatus"),
      width: "110px",
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: "created_at",
      header: t("common.createdAt"),
      width: "110px",
      render: (val) =>
        val ? (
          <span className="text-xs text-[--text-secondary]">
            {new Date(val).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "id",
      header: "",
      width: "100px",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            title="Lihat detail"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/ethnic-sequences/${row.id}`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center
              text-[--text-tertiary] hover:text-accent-500 hover:bg-accent-500/10 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            title="Edit metadata"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/ethnic-sequences/${row.id}/edit`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center
              text-[--text-tertiary] hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            title="Hapus"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center
              text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // ── Stats cepat ───────────────────────────────────────────────────────────
  const stats = {
    total: sequences.length,
    ready: sequences.filter((s) => s.status === "READY").length,
    normal: sequences.filter((s) => s.data_type === "NORMAL").length,
    mutant: sequences.filter((s) => s.data_type === "MUTANT").length,
  };

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
            <Beaker size={22} className="text-primary-500" />
            {t("ethnicSequences.title")}
          </h1>
          <p className="page-subtitle">{t("ethnicSequences.subtitle")}</p>
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        {[
          {
            label: "Total Sekuens",
            value: stats.total,
            color: "text-primary-500",
          },
          {
            label: "Siap Digunakan",
            value: stats.ready,
            color: "text-success-500",
          },
          {
            label: "Data Normal",
            value: stats.normal,
            color: "text-accent-500",
          },
          {
            label: "Data Mutan",
            value: stats.mutant,
            color: "text-danger-500",
          },
        ].map((s, i) => (
          <div key={i} className="glass rounded-xl p-4">
            {isLoading ? (
              <div className="skeleton h-7 w-12 rounded-lg mb-1" />
            ) : (
              <p className={clsx("font-display text-2xl font-bold", s.color)}>
                {s.value}
              </p>
            )}
            <p className="text-xs text-[--text-secondary] mt-0.5">{s.label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Table Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Kiri: filter + search */}
          <div className="flex flex-1 gap-2 min-w-0 flex-wrap sm:flex-nowrap">
            <Filter
              size={14}
              className="text-[--text-tertiary] self-center flex-shrink-0"
            />

            {/* Filter tipe data */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-[--border]
                bg-[--bg-surface] text-[--text-primary] outline-none
                focus:border-[--border-focus] cursor-pointer flex-shrink-0"
            >
              <option value="">Semua Tipe</option>
              {dataTypes.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>

            {/* Filter etnisitas */}
            <select
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-[--border]
                bg-[--bg-surface] text-[--text-primary] outline-none
                focus:border-[--border-focus] cursor-pointer flex-shrink-0 max-w-[160px]"
            >
              <option value="">Semua Etnis</option>
              {ethnicityOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="search"
                placeholder="Cari nama etnis atau deskripsi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm w-full"
              />
            </div>

            {(filterType || filterName) && (
              <button
                onClick={() => {
                  setFilterType("");
                  setFilterName("");
                }}
                className="text-xs text-primary-500 hover:underline flex-shrink-0 self-center"
              >
                Reset
              </button>
            )}
          </div>

          {/* Kanan: Export + Tambah */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleExport}
              className="btn btn-glass btn-sm gap-1.5"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => navigate("/ethnic-sequences/new")}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">
                {t("ethnicSequences.addSequence")}
              </span>
              <span className="sm:hidden">Upload</span>
            </button>
          </div>
        </div>

        {/* Tabel */}
        <DataTable
          columns={columns}
          data={sequences}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/ethnic-sequences/${row.id}`)}
          rowKey="id"
          emptyLabel={
            search
              ? "Tidak ada hasil pencarian."
              : "Belum ada data sekuens etnis. Klik 'Upload Sekuens' untuk menambahkan."
          }
          pageSize={25}
          hideSearch
        />
      </motion.div>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Hapus Sekuens Etnis"
        description={
          `Yakin ingin menghapus sekuens etnis "${deleteTarget?.ethnicity_name}" ` +
          `(${deleteTarget?.data_type})? File FASTA di server juga akan dihapus. ` +
          `Tindakan ini tidak dapat dibatalkan.`
        }
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
