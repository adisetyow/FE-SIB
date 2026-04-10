/**
 * pages/mutations/MutationListPage.jsx
 *
 * Menampilkan seluruh data mutasi dengan:
 *  - Tabel: kode+tipe, posisi (normal→mutasi), sequence terkait,
 *           penyakit terkait, info pasien
 *  - Filter: mutation_type (dropdown), disease (dropdown),
 *            sequence (dropdown), search bar
 *  - Export Excel
 *  - Navigasi ke form tambah (/mutations/new)
 *  - Edit via modal
 *  - Hapus dengan ConfirmDialog
 *
 * API endpoints yang dipakai:
 *   GET  /api/v1/mutations          → list (query: skip,limit,sequence_id,disease_id,mutation_type,search)
 *   POST /api/v1/mutations          → create
 *   PUT  /api/v1/mutations/:id      → update
 *   DELETE /api/v1/mutations/:id    → delete
 *   GET  /api/v1/diseases           → untuk dropdown disease filter
 *   GET  /api/v1/genetics/sequences → untuk dropdown sequence filter
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Filter,
  Download,
  Eye,
  Search,
  Dna,
  FlaskConical,
  AlertTriangle,
  ArrowRight,
  User,
} from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { mutationsApi } from "../../api/mutationsApi";
import { geneticsApi } from "../../api/geneticsApi";
import { diseasesApi } from "../../api/diseasesApi";
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

// ─── Konstanta tipe mutasi (dari domain genetika) ─────────────────────────────
// Tipe mutasi tidak ada endpoint master di API, jadi didefinisikan di frontend.
const MUTATION_TYPES = [
  { value: "SNP", label: "SNP — Single Nucleotide Polymorphism" },
  { value: "INSERTION", label: "Insertion" },
  { value: "DELETION", label: "Deletion" },
  { value: "SUBSTITUTION", label: "Substitution" },
  { value: "FRAMESHIFT", label: "Frameshift" },
  { value: "MISSENSE", label: "Missense" },
  { value: "NONSENSE", label: "Nonsense" },
  { value: "SILENT", label: "Silent" },
];

// Warna badge per tipe mutasi
const MUTATION_TYPE_COLOR = {
  SNP: "badge-primary",
  INSERTION: "badge-success",
  DELETION: "badge-danger",
  SUBSTITUTION: "badge-accent",
  FRAMESHIFT: "badge-warning",
  MISSENSE: "badge-warning",
  NONSENSE: "badge-danger",
  SILENT: "badge-muted",
};

// ─── Empty form ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  position: "",
  normal_base: "",
  mutation_base: "",
  mutation_type: "SNP",
  code: "",
  description: "",
  disease_id: "",
  sequence_id: "",
};

// ─── Validate form ────────────────────────────────────────────────────────────
function validateMutationForm(form) {
  const e = {};
  if (!form.position || isNaN(Number(form.position)))
    e.position = "Posisi wajib diisi (angka)";
  else if (Number(form.position) < 1) e.position = "Posisi minimal 1";
  if (!form.normal_base.trim()) e.normal_base = "Base normal wajib diisi";
  if (!form.mutation_base.trim()) e.mutation_base = "Base mutan wajib diisi";
  if (!form.mutation_type) e.mutation_type = "Tipe mutasi wajib dipilih";
  if (!form.sequence_id) e.sequence_id = "Sequence wajib dipilih";
  return e;
}

// ─── Edit Form component (dipakai di modal Edit) ──────────────────────────────
function MutationEditForm({ form, setForm, errors, sequences, diseases }) {
  const { t } = useTranslation();

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
  }

  return (
    <div className="space-y-4">
      {/* Sequence — wajib */}
      <FormField
        label="Genetic Sequence"
        required
        error={errors.sequence_id}
        helper="Sequence yang mengandung mutasi ini"
      >
        <Select
          value={form.sequence_id}
          onChange={(e) => set("sequence_id", e.target.value)}
          error={errors.sequence_id}
        >
          <option value="">— Pilih Sequence —</option>
          {sequences.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.accession_id ? ` (${s.accession_id})` : ""}
            </option>
          ))}
        </Select>
      </FormField>

      {/* Posisi + Tipe */}
      <FormRow>
        <FormField
          label="Posisi"
          required
          error={errors.position}
          helper="Posisi basa pada sequence (1-based)"
        >
          <Input
            type="number"
            placeholder="e.g. 1234"
            min={1}
            value={form.position}
            onChange={(e) => set("position", e.target.value)}
            error={errors.position}
          />
        </FormField>
        <FormField label="Tipe Mutasi" required error={errors.mutation_type}>
          <Select
            value={form.mutation_type}
            onChange={(e) => set("mutation_type", e.target.value)}
            error={errors.mutation_type}
          >
            {MUTATION_TYPES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.value}
              </option>
            ))}
          </Select>
        </FormField>
      </FormRow>

      {/* Normal base → Mutation base */}
      <FormRow>
        <FormField
          label="Base Normal"
          required
          error={errors.normal_base}
          helper="Basa pada sequence referensi"
        >
          <Input
            placeholder="e.g. A"
            value={form.normal_base}
            onChange={(e) => set("normal_base", e.target.value.toUpperCase())}
            error={errors.normal_base}
            className="font-mono uppercase"
            maxLength={50}
          />
        </FormField>
        <FormField
          label="Base Mutan"
          required
          error={errors.mutation_base}
          helper="Basa hasil mutasi"
        >
          <Input
            placeholder="e.g. T"
            value={form.mutation_base}
            onChange={(e) => set("mutation_base", e.target.value.toUpperCase())}
            error={errors.mutation_base}
            className="font-mono uppercase"
            maxLength={50}
          />
        </FormField>
      </FormRow>

      {/* Kode mutasi + Disease */}
      <FormRow>
        <FormField label="Kode Mutasi" helper="Contoh: c.185delAG, p.Arg175His">
          <Input
            placeholder="e.g. c.185delAG"
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            className="font-mono"
          />
        </FormField>
        <FormField
          label="Penyakit Terkait"
          helper="Opsional — hubungkan ke data penyakit"
        >
          <Select
            value={form.disease_id}
            onChange={(e) => set("disease_id", e.target.value)}
          >
            <option value="">— Tidak ada —</option>
            {diseases.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.icd_code ? ` [${d.icd_code}]` : ""}
              </option>
            ))}
          </Select>
        </FormField>
      </FormRow>

      {/* Deskripsi */}
      <FormField label="Deskripsi">
        <Textarea
          placeholder="Catatan tambahan tentang mutasi ini..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
        />
      </FormField>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MutationListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // URLSearchParams — untuk support link dari SequenceDetailPage
  // contoh: /mutations?sequence_id=5 langsung memfilter
  const [searchParams] = useSearchParams();
  const initSeqId = searchParams.get("sequence_id") || "";

  // Filter state
  const [filterSequenceId, setFilterSequenceId] = useState(initSeqId);
  const [filterDiseaseId, setFilterDiseaseId] = useState("");
  const [filterMutationType, setFilterMutationType] = useState("");
  const [search, setSearch] = useState("");

  // Modal & confirm state
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Edit form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: mutations = [], isLoading } = useQuery({
    queryKey: [
      "mutations",
      filterSequenceId,
      filterDiseaseId,
      filterMutationType,
      search,
    ],
    queryFn: () =>
      mutationsApi.listMutations({
        limit: 1000,
        ...(filterSequenceId && { sequence_id: Number(filterSequenceId) }),
        ...(filterDiseaseId && { disease_id: Number(filterDiseaseId) }),
        ...(filterMutationType && { mutation_type: filterMutationType }),
        ...(search && { search }),
      }),
  });

  // Dropdown data — sequences & diseases untuk filter + form
  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences-dropdown"],
    queryFn: () => geneticsApi.listSequences({ limit: 1000 }),
  });

  const { data: diseases = [] } = useQuery({
    queryKey: ["diseases-dropdown"],
    queryFn: () => diseasesApi.listDiseases({ limit: 1000 }),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => mutationsApi.updateMutation(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutations"] });
      toast.success("Mutasi berhasil diperbarui");
      closeEditModal();
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui mutasi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => mutationsApi.deleteMutation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutations"] });
      toast.success("Mutasi berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus mutasi"),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function openEdit(row) {
    setEditTarget(row);
    setForm({
      position: row.position ?? "",
      normal_base: row.normal_base || "",
      mutation_base: row.mutation_base || "",
      mutation_type: row.mutation_type || "SNP",
      code: row.code || "",
      description: row.description || "",
      disease_id: row.disease_id ?? "",
      sequence_id: row.sequence_id ?? "",
    });
    setErrors({});
  }

  function closeEditModal() {
    setEditTarget(null);
    setErrors({});
  }

  function handleEditSubmit() {
    const errs = validateMutationForm(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const payload = {
      position: Number(form.position),
      normal_base: form.normal_base.trim(),
      mutation_base: form.mutation_base.trim(),
      mutation_type: form.mutation_type,
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      disease_id: form.disease_id !== "" ? Number(form.disease_id) : null,
      sequence_id: Number(form.sequence_id),
    };

    updateMutation.mutate({ id: editTarget.id, data: payload });
  }

  function resetFilters() {
    setFilterSequenceId("");
    setFilterDiseaseId("");
    setFilterMutationType("");
    setSearch("");
  }

  const hasActiveFilter =
    filterSequenceId || filterDiseaseId || filterMutationType || search;

  // ── Export Excel ───────────────────────────────────────────────────────────
  function handleExport() {
    const rows = mutations.map((m) => ({
      ID: m.id,
      "Kode Mutasi": m.code || "",
      "Tipe Mutasi": m.mutation_type || "",
      Posisi: m.position || "",
      "Base Normal": m.normal_base || "",
      "Base Mutan": m.mutation_base || "",
      "Nama Sequence": m.sequence_name || "",
      "Penyakit Terkait": m.disease_name || "",
      "Nama Pasien": m.patient?.full_name || "",
      NIK: m.patient?.patient_id || "",
      Deskripsi: m.description || "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Mutations");
    XLSX.writeFile(
      wb,
      `mutations_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Data mutasi berhasil diekspor");
  }

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    // Kode + Tipe
    {
      key: "code",
      header: "Kode / Tipe",
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
            <FlaskConical size={13} className="text-accent-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-mono font-semibold text-[--text-primary]">
              {val || (
                <span className="text-[--text-tertiary] font-sans font-normal text-xs">
                  —
                </span>
              )}
            </p>
            <span
              className={clsx(
                "badge text-[10px]",
                MUTATION_TYPE_COLOR[row.mutation_type] || "badge-muted",
              )}
            >
              {row.mutation_type || "—"}
            </span>
          </div>
        </div>
      ),
    },

    // Posisi + perubahan basa
    {
      key: "position",
      header: "Posisi & Perubahan",
      width: "160px",
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[--text-tertiary]">pos.</span>
          <span className="font-mono text-xs font-semibold text-[--text-primary]">
            {val ?? "—"}
          </span>
          {row.normal_base && row.mutation_base && (
            <div className="flex items-center gap-1 ml-1">
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {row.normal_base}
              </span>
              <ArrowRight size={10} className="text-[--text-tertiary]" />
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                {row.mutation_base}
              </span>
            </div>
          )}
        </div>
      ),
    },

    // Sequence terkait
    {
      key: "sequence_name",
      header: "Sequence",
      render: (val, row) =>
        val ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/sequences/${row.sequence_id}`);
            }}
            className="flex items-center gap-1.5 text-xs text-primary-500 hover:underline max-w-[160px] truncate"
          >
            <Dna size={12} />
            <span className="truncate">{val}</span>
          </button>
        ) : (
          <span className="text-[--text-tertiary] text-xs">—</span>
        ),
    },

    // Penyakit terkait
    {
      key: "disease_name",
      header: "Penyakit",
      render: (val, row) =>
        val ? (
          <div className="min-w-0">
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium truncate max-w-[140px]">
              {val}
            </p>
            {row.disease_info?.icd_code && (
              <p className="text-[10px] text-[--text-tertiary] font-mono">
                {row.disease_info.icd_code}
              </p>
            )}
          </div>
        ) : (
          <span className="text-[--text-tertiary] text-xs">—</span>
        ),
    },

    // Pasien terkait
    {
      key: "patient",
      header: "Pasien",
      render: (val) =>
        val ? (
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[--bg-muted] flex items-center justify-center flex-shrink-0">
              <User size={10} className="text-[--text-tertiary]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[--text-primary] truncate max-w-[110px]">
                {val.full_name}
              </p>
              {val.ethnicity_name && (
                <p className="text-[10px] text-[--text-tertiary] truncate">
                  {val.ethnicity_name}
                </p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-[--text-tertiary] text-xs">—</span>
        ),
    },

    // Actions
    {
      key: "id",
      header: "",
      width: "90px",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/mutations/${row.id}`);
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
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FlaskConical size={22} className="text-accent-500" />
            Mutasi Genetik
          </h1>
          <p className="page-subtitle">
            Data mutasi yang terdeteksi pada sekuens penelitian
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[--text-tertiary]">
            {isLoading ? "..." : mutations.length.toLocaleString()} mutasi
          </span>
        </div>
      </motion.div>

      {/* ── Filter Bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex flex-wrap gap-3 items-center">
          {/* Filter icon */}
          <Filter size={14} className="text-[--text-tertiary] flex-shrink-0" />

          {/* Filter: Mutation Type */}
          <select
            value={filterMutationType}
            onChange={(e) => setFilterMutationType(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus] min-w-[120px]"
          >
            <option value="">Semua Tipe</option>
            {MUTATION_TYPES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.value}
              </option>
            ))}
          </select>

          {/* Filter: Sequence */}
          <select
            value={filterSequenceId}
            onChange={(e) => setFilterSequenceId(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus] min-w-[150px] max-w-[200px]"
          >
            <option value="">Semua Sequence</option>
            {sequences.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Filter: Disease */}
          <select
            value={filterDiseaseId}
            onChange={(e) => setFilterDiseaseId(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus] min-w-[150px] max-w-[200px]"
          >
            <option value="">Semua Penyakit</option>
            {diseases.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[160px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode atau deskripsi..."
              className="w-full pl-8 pr-4 py-1.5 text-sm rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] placeholder:text-[--text-tertiary] outline-none focus:border-[--border-focus]"
            />
          </div>

          {/* Reset */}
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="text-xs text-primary-500 hover:underline whitespace-nowrap"
            >
              Reset
            </button>
          )}

          <div className="flex-1" />

          {/* Export */}
          <button
            onClick={handleExport}
            className="btn btn-ghost btn-sm gap-1.5"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Tambah — halaman form terpisah */}
          <button
            onClick={() => navigate("/mutations/new")}
            className="btn btn-primary btn-sm"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Tambah Mutasi</span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>

        {/* Active filter chips */}
        {hasActiveFilter && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[--border]">
            {filterMutationType && (
              <FilterChip
                label={`Tipe: ${filterMutationType}`}
                onRemove={() => setFilterMutationType("")}
              />
            )}
            {filterSequenceId && (
              <FilterChip
                label={`Sequence: ${
                  sequences.find((s) => String(s.id) === filterSequenceId)
                    ?.name ?? filterSequenceId
                }`}
                onRemove={() => setFilterSequenceId("")}
              />
            )}
            {filterDiseaseId && (
              <FilterChip
                label={`Penyakit: ${
                  diseases.find((d) => String(d.id) === filterDiseaseId)
                    ?.name ?? filterDiseaseId
                }`}
                onRemove={() => setFilterDiseaseId("")}
              />
            )}
            {search && (
              <FilterChip
                label={`"${search}"`}
                onRemove={() => setSearch("")}
              />
            )}
          </div>
        )}
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
          data={mutations}
          isLoading={isLoading}
          searchPlaceholder="Cari kode mutasi..."
          searchKeys={["code", "description", "sequence_name", "disease_name"]}
          onRowClick={(row) => navigate(`/mutations/${row.id}`)}
          emptyIcon={
            <AlertTriangle size={32} className="text-[--text-tertiary]" />
          }
          emptyLabel="Belum ada data mutasi. Klik + untuk menambahkan."
          pageSize={25}
        />
      </motion.div>

      {/* ── Edit Modal ── */}
      <Modal
        open={!!editTarget}
        onClose={closeEditModal}
        title="Edit Mutasi"
        subtitle={
          editTarget?.code
            ? `Editing: ${editTarget.code}`
            : `Editing mutasi #${editTarget?.id}`
        }
        size="lg"
        footer={
          <>
            <button
              onClick={closeEditModal}
              className="btn btn-ghost"
              disabled={isSaving}
            >
              Batal
            </button>
            <button
              onClick={handleEditSubmit}
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving && (
                <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
              )}
              Simpan Perubahan
            </button>
          </>
        }
      >
        <MutationEditForm
          form={form}
          setForm={setForm}
          errors={errors}
          sequences={sequences}
          diseases={diseases}
        />
      </Modal>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Hapus Mutasi"
        description={`Yakin ingin menghapus mutasi ${
          deleteTarget?.code ? `"${deleteTarget.code}"` : `#${deleteTarget?.id}`
        }? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary-500/10 text-primary-500 border border-primary-500/20">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        aria-label="Hapus filter"
      >
        ×
      </button>
    </span>
  );
}
