/**
 * pages/genetics/SequenceListPage.jsx
 * Halaman daftar Genetic Sequences dengan:
 * - Tabel + search + filter tipe (status filter dihapus)
 * - Search bar sejajar dengan filter tipe
 * - Navigasi ke form tambah (halaman terpisah, bukan modal)
 * - Modal edit sequence
 * - Konfirmasi hapus
 * - Navigate ke detail saat row diklik
 * - Export Excel
 *
 * Perubahan dari versi sebelumnya:
 * 1. Filter status dihapus, search bar dipindah sejajar filter tipe
 * 2. Kolom status_processed dihapus dari tabel
 * 3. Tombol "Tambah" navigate ke /sequences/new (halaman form terpisah)
 * 4. Field length dihitung otomatis dari sequence_data (tidak manual)
 * 5. status_processed tidak ditampilkan di form; default PENDING di payload
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  Dna,
  Pencil,
  Trash2,
  Filter,
  Download,
  Eye,
  Search,
} from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { geneticsApi } from "../../api/geneticsApi";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  FormField,
  Input,
  Textarea,
  Select,
  FormRow,
} from "../../components/ui/FormField";

// ─── Badge helpers ────────────────────────────────────────────────────────────
const SEQ_TYPE_COLOR = {
  DNA: "badge-primary",
  RNA: "badge-accent",
  PROTEIN: "badge-warning",
};

// ─── Empty form state ─────────────────────────────────────────────────────────
// Hanya field yang relevan untuk CREATE/EDIT oleh user.
// - length  : TIDAK ada di form, dihitung otomatis dari sequence_data.length
// - status_processed : TIDAK ditampilkan ke user, selalu PENDING saat create;
//                      saat edit dikirim ulang nilai yang sudah ada di data.
const EMPTY_FORM = {
  name: "",
  accession_id: "",
  sequence_data: "",
  seq_type: "DNA",
  chromosome: "",
  gene_symbol: "",
  full_name: "",
  gene_type: "",
  start_position: "",
  end_position: "",
  strand: "",
  rna_type: "",
  protein_name: "",
  molecular_weight: "",
  description: "",
  patient_id: "",
};

// ─── Edit Form (hanya untuk modal Edit — Create punya halaman sendiri) ────────
function SequenceEditForm({ form, setForm, errors, seqTypes, strands }) {
  const { t } = useTranslation();

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
  }

  // Hitung panjang sequence_data secara real-time
  const seqLen = form.sequence_data?.replace(/\s/g, "").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Row 1: Name + Accession */}
      <FormRow>
        <FormField label={t("sequences.name")} required error={errors.name}>
          <Input
            placeholder="e.g. BRCA1 Gene"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={errors.name}
          />
        </FormField>
        <FormField label={t("sequences.accessionId")}>
          <Input
            placeholder="e.g. NM_007294"
            value={form.accession_id}
            onChange={(e) => set("accession_id", e.target.value)}
          />
        </FormField>
      </FormRow>

      {/* Row 2: Type + Strand */}
      <FormRow>
        <FormField
          label={t("sequences.sequenceType")}
          required
          error={errors.seq_type}
        >
          <Select
            value={form.seq_type}
            onChange={(e) => set("seq_type", e.target.value)}
            error={errors.seq_type}
          >
            {(seqTypes || []).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t("sequences.strand")}>
          <Select
            value={form.strand}
            onChange={(e) => set("strand", e.target.value)}
          >
            <option value="">— Pilih —</option>
            {(strands || []).map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </FormField>
      </FormRow>

      {/* Row 3: Chromosome + Gene Symbol */}
      <FormRow>
        <FormField label={t("sequences.chromosome")}>
          <Input
            placeholder="e.g. 17"
            value={form.chromosome}
            onChange={(e) => set("chromosome", e.target.value)}
            maxLength={10}
          />
        </FormField>
        <FormField label={t("sequences.geneSymbol")}>
          <Input
            placeholder="e.g. BRCA1"
            value={form.gene_symbol}
            onChange={(e) => set("gene_symbol", e.target.value)}
            maxLength={20}
          />
        </FormField>
      </FormRow>

      {/* Row 4: Start + End position */}
      <FormRow>
        <FormField label={t("sequences.startPosition")}>
          <Input
            type="number"
            placeholder="0"
            value={form.start_position}
            onChange={(e) => set("start_position", e.target.value)}
          />
        </FormField>
        <FormField label={t("sequences.endPosition")}>
          <Input
            type="number"
            placeholder="0"
            value={form.end_position}
            onChange={(e) => set("end_position", e.target.value)}
          />
        </FormField>
      </FormRow>

      {/* Full name */}
      <FormField label="Full Name">
        <Input
          placeholder="Full gene name"
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          maxLength={200}
        />
      </FormField>

      {/* Sequence data — length auto-shown */}
      <FormField
        label={t("sequences.sequenceData")}
        required
        error={errors.sequence_data}
        helper={
          seqLen > 0
            ? `Panjang sequence: ${seqLen.toLocaleString()} karakter (dikirim sebagai length otomatis)`
            : "Masukkan sekuens DNA/RNA/Protein dalam format IUPAC"
        }
      >
        <Textarea
          placeholder="ATCGGCTATCGATCGATCG..."
          value={form.sequence_data}
          onChange={(e) => set("sequence_data", e.target.value)}
          rows={5}
          error={errors.sequence_data}
          className="font-mono text-xs tracking-wider"
        />
      </FormField>

      {/* Description */}
      <FormField label={t("common.description")}>
        <Textarea
          placeholder="Deskripsi sekuens..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
        />
      </FormField>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SequenceListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Filter & search state
  // Status filter dihapus sesuai permintaan.
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");

  // Modal state — hanya untuk Edit (Create pakai halaman /sequences/new)
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form state untuk Edit modal
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["sequences", filterType, search],
    queryFn: () =>
      geneticsApi.listSequences({
        limit: 1000,
        ...(filterType && { seq_type: filterType }),
        ...(search && { search }),
      }),
  });

  const { data: seqTypes = [] } = useQuery({
    queryKey: ["seq-types"],
    queryFn: geneticsApi.getSequenceTypes,
  });
  const { data: strands = [] } = useQuery({
    queryKey: ["seq-strands"],
    queryFn: geneticsApi.getStrands,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => geneticsApi.updateSequence(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sekuens berhasil diperbarui");
      closeEditModal();
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui"),
  });

  const deleteMutation = useMutation({
    mutationFn: geneticsApi.deleteSequence,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sekuens berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus"),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function openEdit(row) {
    setEditTarget(row);
    setForm({
      name: row.name || "",
      accession_id: row.accession_id || "",
      sequence_data: row.sequence_data || "",
      seq_type: row.seq_type || "DNA",
      chromosome: row.chromosome || "",
      gene_symbol: row.gene_symbol || "",
      full_name: row.full_name || "",
      gene_type: row.gene_type || "",
      start_position: row.start_position ?? "",
      end_position: row.end_position ?? "",
      strand: row.strand || "",
      rna_type: row.rna_type || "",
      protein_name: row.protein_name || "",
      molecular_weight: row.molecular_weight ?? "",
      description: row.description || "",
      patient_id: row.patient_id ?? "",
    });
    setErrors({});
  }

  function closeEditModal() {
    setEditTarget(null);
    setErrors({});
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Nama wajib diisi";
    if (!form.sequence_data.trim())
      e.sequence_data = "Data sekuens wajib diisi";
    if (!form.seq_type) e.seq_type = "Tipe sekuens wajib dipilih";
    return e;
  }

  function handleEditSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    // length dihitung otomatis dari sequence_data (spasi diabaikan)
    const cleanSeq = form.sequence_data.trim();
    const autoLength = cleanSeq.replace(/\s/g, "").length;

    const payload = {
      name: form.name.trim(),
      sequence_data: cleanSeq,
      seq_type: form.seq_type,
      // Saat edit, status_processed tidak diubah user — kirim ulang nilai lama
      status_processed: editTarget?.status_processed ?? null,
      // length dihitung otomatis
      length: autoLength > 0 ? autoLength : null,
      accession_id: form.accession_id || null,
      chromosome: form.chromosome || null,
      gene_symbol: form.gene_symbol || null,
      full_name: form.full_name || null,
      gene_type: form.gene_type || null,
      start_position:
        form.start_position !== "" ? Number(form.start_position) : null,
      end_position: form.end_position !== "" ? Number(form.end_position) : null,
      strand: form.strand || null,
      rna_type: form.rna_type || null,
      description: form.description || null,
      patient_id: form.patient_id !== "" ? Number(form.patient_id) : null,
    };

    updateMutation.mutate({ id: editTarget.id, data: payload });
  }

  // ── Export Excel ───────────────────────────────────────────────────────────
  function handleExport() {
    const rows = sequences.map((s) => ({
      ID: s.id,
      Name: s.name,
      "Accession ID": s.accession_id || "",
      Type: s.seq_type,
      Chromosome: s.chromosome || "",
      "Gene Symbol": s.gene_symbol || "",
      Strand: s.strand || "",
      "Length (bp)": s.sequence_length || "",
      // Status tetap diekspor ke Excel meski tidak tampil di tabel UI
      "Status Processed": s.status_processed || "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Sequences");
    XLSX.writeFile(
      wb,
      `sequences_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Exported to Excel");
  }

  // ── Table columns ──────────────────────────────────────────────────────────
  // Kolom status_processed dihapus dari tabel — info ini ada di halaman detail.
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
            <p className="text-sm font-medium text-[--text-primary] truncate max-w-[180px]">
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
      width: "100px",
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
      // Action column — tidak ada status lagi
      key: "id",
      header: "",
      width: "100px",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sequences/${row.id}`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-accent-500 hover:bg-accent-500/10 transition-colors"
            title="Lihat detail"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
            title="Hapus"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const isSaving = updateMutation.isPending;

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
            <Dna size={22} className="text-primary-500" />
            {t("sequences.title")}
          </h1>
          <p className="page-subtitle">{t("sequences.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[--text-tertiary]">
            {isLoading ? "..." : sequences.length.toLocaleString()} sekuens
          </span>
        </div>
      </motion.div>

      {/* ── Filter Bar ── */}
      {/*
       * Search bar sejajar dengan filter tipe.
       * Filter status dihapus sepenuhnya.
       */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex flex-wrap gap-3 items-center">
          {/* Filter Tipe */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[--text-tertiary]" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus] min-w-[110px]"
            >
              <option value="">Semua Tipe</option>
              {seqTypes.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar — sejajar filter tipe */}
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("sequences.searchPlaceholder")}
              className="w-full pl-8 pr-4 py-1.5 text-sm rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] placeholder:text-[--text-tertiary] outline-none focus:border-[--border-focus]"
            />
          </div>

          {/* Reset filter — muncul hanya jika ada filter aktif */}
          {(filterType || search) && (
            <button
              onClick={() => {
                setFilterType("");
                setSearch("");
              }}
              className="text-xs text-primary-500 hover:underline whitespace-nowrap"
            >
              Reset filter
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export Excel */}
          <button
            onClick={handleExport}
            className="btn btn-ghost btn-sm gap-1.5"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Tambah — navigate ke halaman form terpisah */}
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
      </motion.div>

      {/* ── Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-xl p-1 overflow-hidden"
      >
        <DataTable
          columns={columns}
          data={sequences}
          isLoading={isLoading}
          searchPlaceholder={t("sequences.searchPlaceholder")}
          searchKeys={["name", "accession_id", "gene_symbol"]}
          onRowClick={(row) => navigate(`/sequences/${row.id}`)}
          emptyLabel="Belum ada data sekuens. Klik + untuk menambahkan."
          pageSize={25}
        />
      </motion.div>

      {/* ── Edit Modal ── */}
      {/*
       * Modal hanya untuk Edit.
       * Create menggunakan halaman /sequences/new (SequenceFormPage).
       */}
      <Modal
        open={!!editTarget}
        onClose={closeEditModal}
        title={t("sequences.editSequence")}
        subtitle={editTarget ? `Editing: ${editTarget.name}` : ""}
        size="lg"
        footer={
          <>
            <button
              onClick={closeEditModal}
              className="btn btn-ghost"
              disabled={isSaving}
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleEditSubmit}
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving && (
                <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
              )}
              {t("common.update")}
            </button>
          </>
        }
      >
        <SequenceEditForm
          form={form}
          setForm={setForm}
          errors={errors}
          seqTypes={seqTypes}
          strands={strands}
        />
      </Modal>

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
