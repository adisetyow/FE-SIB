/**
 * pages/genetics/SequenceListPage.jsx
 *
 * Perubahan dari versi sebelumnya:
 * 1. Filter status dihapus — search bar sekarang di samping filter tipe
 * 2. Kolom status_processed dihapus dari tabel
 * 3. Tambah/Edit tidak pakai modal — navigasi ke halaman form tersendiri
 * 4. Kolom yang ditampilkan: Name+Accession, Type, Chromosome, Gene Symbol, Length, Actions
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Dna, Pencil, Trash2, Eye, Download, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { geneticsApi } from "../../api/geneticsApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

// ─── Type badge color ─────────────────────────────────────────────────────────
const SEQ_TYPE_COLOR = {
  DNA: "badge-primary",
  RNA: "badge-accent",
  PROTEIN: "badge-warning",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SequenceListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Filter & search state
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Query: ambil semua sequence, filter di server ─────────────────────────
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["sequences", filterType, search],
    queryFn: () =>
      geneticsApi.listSequences({
        limit: 1000,
        ...(filterType && { seq_type: filterType }),
        ...(search && { search }),
      }),
    // Debounce search — tunggu 400ms setelah user berhenti mengetik
    // (implementasi sederhana: search dikirim langsung, tapi bisa ditambah useDebounce)
  });

  const { data: seqTypes = [] } = useQuery({
    queryKey: ["seq-types"],
    queryFn: geneticsApi.getSequenceTypes,
  });

  // ── Delete mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id) => geneticsApi.deleteSequence(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sekuens berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus"),
  });

  // ── Export Excel ──────────────────────────────────────────────────────────
  function handleExport() {
    const rows = sequences.map((s) => ({
      ID: s.id,
      Name: s.name,
      "Accession ID": s.accession_id || "",
      Type: s.seq_type,
      Chromosome: s.chromosome || "",
      "Gene Symbol": s.gene_symbol || "",
      "Length (bp)": s.sequence_length || "",
      Strand: s.strand || "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Sequences");
    XLSX.writeFile(
      wb,
      `sequences_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Data berhasil diekspor ke Excel");
  }

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      key: "name",
      header: t("common.name"),
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <Dna size={13} className="text-primary-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[--text-primary] truncate max-w-[200px]">
              {val}
            </p>
            {row.accession_id && (
              <p className="text-xs text-[--text-tertiary] font-mono">
                {row.accession_id}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "seq_type",
      header: t("sequences.sequenceType"),
      width: "110px",
      render: (val) => (
        <span className={clsx("badge", SEQ_TYPE_COLOR[val] || "badge-muted")}>
          {val}
        </span>
      ),
    },
    {
      key: "chromosome",
      header: t("sequences.chromosome"),
      width: "110px",
      render: (val) =>
        val ? (
          <span className="font-mono text-xs text-[--text-secondary]">
            Chr {val}
          </span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "gene_symbol",
      header: t("sequences.geneSymbol"),
      width: "110px",
      render: (val) =>
        val ? (
          <span className="font-mono text-xs font-semibold text-accent-500">
            {val}
          </span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "sequence_length",
      header: t("sequences.length"),
      width: "100px",
      align: "right",
      render: (val) => (
        <span className="text-xs text-[--text-secondary] font-mono">
          {val ? val.toLocaleString() + " bp" : "—"}
        </span>
      ),
    },
    {
      // Kolom aksi — key dummy karena render pakai `row`
      key: "id",
      header: "",
      width: "100px",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          {/* Detail */}
          <button
            title="Lihat detail"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sequences/${row.id}`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center
              text-[--text-tertiary] hover:text-accent-500 hover:bg-accent-500/10 transition-colors"
          >
            <Eye size={14} />
          </button>
          {/* Edit */}
          <button
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sequences/${row.id}/edit`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center
              text-[--text-tertiary] hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
          >
            <Pencil size={14} />
          </button>
          {/* Delete */}
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

  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Dna size={22} className="text-primary-500" />
            {t("sequences.title")}
          </h1>
          <p className="page-subtitle">{t("sequences.subtitle")}</p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${sequences.length.toLocaleString()} sekuens`}
        </p>
      </motion.div>

      {/* ── Table Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        {/* Toolbar: Filter Tipe + Search bar (sejajar) + tombol Export & Tambah */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Kiri: filter tipe + search */}
          <div className="flex flex-1 gap-2 min-w-0">
            {/* Filter tipe sequence */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter size={14} className="text-[--text-tertiary]" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border border-[--border]
                  bg-[--bg-surface] text-[--text-primary] outline-none
                  focus:border-[--border-focus] min-w-[120px] cursor-pointer"
              >
                <option value="">Semua Tipe</option>
                {seqTypes.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search bar — langsung di samping filter */}
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
                placeholder={t("sequences.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm w-full"
              />
            </div>

            {/* Reset filter — hanya muncul jika ada filter aktif */}
            {filterType && (
              <button
                onClick={() => setFilterType("")}
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
              onClick={() => navigate("/sequences/new")}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">
                {t("sequences.addSequence")}
              </span>
              <span className="sm:hidden">Tambah</span>
            </button>
          </div>
        </div>

        {/* Tabel */}
        <DataTable
          columns={columns}
          data={sequences}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/sequences/${row.id}`)}
          emptyLabel="Belum ada data sekuens. Klik 'Tambah Sekuens' untuk memulai."
          pageSize={25}
          // search sudah di-handle di toolbar di atas (server-side),
          // jadi DataTable tidak perlu tampilkan search bar sendiri
          serverSearch={{ value: search, onChange: setSearch }}
          hideSearch={true}
        />
      </motion.div>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Hapus Sekuens"
        description={`Yakin ingin menghapus sekuens "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan dan akan menghapus semua mutasi terkait.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
