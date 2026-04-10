/**
 * pages/mutations/MutationDetailPage.jsx
 * Route: /mutations/:id
 *
 * API: GET /api/v1/mutations/:id
 * Response: MutationResponse yang sudah include:
 *   - disease       : MutationDiseaseInfo (nama, ICD, at_risk_ethnicities)
 *   - patient       : MutationPatientInfo (nama, DOB, ethnicity_name)
 *   - sequence_id   : ID sequence terkait
 *   - disease_name  : string (shortcut)
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FlaskConical,
  Pencil,
  Trash2,
  Dna,
  User,
  AlertTriangle,
  ArrowRight,
  Users,
  BookOpen,
  Info,
  CheckCircle2,
  Hash,
} from "lucide-react";
import clsx from "clsx";

import { mutationsApi } from "../../api/mutationsApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Modal from "../../components/ui/Modal";
import {
  FormField,
  Input,
  Textarea,
  Select,
  FormRow,
} from "../../components/ui/FormField";
import { geneticsApi } from "../../api/geneticsApi";
import { diseasesApi } from "../../api/diseasesApi";

// ─── Mutation types ───────────────────────────────────────────────────────────
const MUTATION_TYPES = [
  { value: "SNP", label: "SNP", desc: "Single Nucleotide Polymorphism" },
  {
    value: "INSERTION",
    label: "Insertion",
    desc: "Penambahan satu/lebih basa",
  },
  { value: "DELETION", label: "Deletion", desc: "Penghapusan satu/lebih basa" },
  { value: "SUBSTITUTION", label: "Substitution", desc: "Penggantian basa" },
  {
    value: "FRAMESHIFT",
    label: "Frameshift",
    desc: "Pergeseran kerangka baca",
  },
  { value: "MISSENSE", label: "Missense", desc: "Perubahan asam amino" },
  { value: "NONSENSE", label: "Nonsense", desc: "Menghasilkan stop codon" },
  { value: "SILENT", label: "Silent", desc: "Tidak mengubah asam amino" },
];

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

const TYPE_ACCENT = {
  SNP: "border-primary-500/40 bg-primary-500/5 text-primary-500",
  INSERTION: "border-emerald-500/40 bg-emerald-500/5 text-emerald-500",
  DELETION: "border-rose-500/40 bg-rose-500/5 text-rose-500",
  SUBSTITUTION: "border-accent-500/40 bg-accent-500/5 text-accent-500",
  FRAMESHIFT: "border-amber-500/40 bg-amber-500/5 text-amber-500",
  MISSENSE: "border-amber-500/40 bg-amber-500/5 text-amber-500",
  NONSENSE: "border-rose-500/40 bg-rose-500/5 text-rose-500",
  SILENT: "border-[--border] bg-[--bg-subtle] text-[--text-secondary]",
};

// ─── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono, children }) {
  if (!value && !children && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[--border] last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-[--text-tertiary] flex-shrink-0 min-w-[130px]">
        {label}
      </span>
      {children ? (
        <div className="text-right">{children}</div>
      ) : (
        <span
          className={clsx(
            "text-sm text-[--text-primary] text-right",
            mono && "font-mono",
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Detail Card wrapper ──────────────────────────────────────────────────────
function DetailCard({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className={iconColor} />
        <h3 className="text-xs font-bold uppercase tracking-wider text-[--text-tertiary]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ─── Edit Form (inline, dipakai di modal) ────────────────────────────────────
function MutationEditForm({ form, setForm, errors, sequences, diseases }) {
  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
  }
  return (
    <div className="space-y-4">
      <FormField label="Genetic Sequence" required error={errors.sequence_id}>
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

      <FormRow>
        <FormField label="Posisi" required error={errors.position}>
          <Input
            type="number"
            placeholder="e.g. 1234"
            min={1}
            value={form.position}
            onChange={(e) => set("position", e.target.value)}
            error={errors.position}
            className="font-mono"
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

      <FormRow>
        <FormField label="Base Normal" required error={errors.normal_base}>
          <Input
            placeholder="e.g. A"
            value={form.normal_base}
            onChange={(e) => set("normal_base", e.target.value.toUpperCase())}
            error={errors.normal_base}
            className="font-mono uppercase"
            maxLength={50}
          />
        </FormField>
        <FormField label="Base Mutan" required error={errors.mutation_base}>
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

      <FormRow>
        <FormField label="Kode Mutasi">
          <Input
            placeholder="e.g. c.185delAG"
            value={form.code}
            onChange={(e) => set("code", e.target.value)}
            className="font-mono"
          />
        </FormField>
        <FormField label="Penyakit Terkait">
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

      <FormField label="Deskripsi">
        <Textarea
          placeholder="Catatan tambahan..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
        />
      </FormField>
    </div>
  );
}

function validateEdit(form) {
  const e = {};
  if (!form.sequence_id) e.sequence_id = "Sequence wajib dipilih";
  if (!form.position || isNaN(Number(form.position)))
    e.position = "Posisi wajib diisi";
  else if (Number(form.position) < 1) e.position = "Posisi minimal 1";
  if (!form.normal_base.trim()) e.normal_base = "Wajib diisi";
  if (!form.mutation_base.trim()) e.mutation_base = "Wajib diisi";
  if (!form.mutation_type) e.mutation_type = "Wajib dipilih";
  return e;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MutationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editErrors, setEditErrors] = useState({});

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: mut,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["mutation", id],
    queryFn: () => mutationsApi.getMutation(id),
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences-dropdown"],
    queryFn: () => geneticsApi.listSequences({ limit: 1000 }),
    enabled: editOpen,
  });

  const { data: diseases = [] } = useQuery({
    queryKey: ["diseases-dropdown"],
    queryFn: () => diseasesApi.listDiseases({ limit: 1000 }),
    enabled: editOpen,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => mutationsApi.updateMutation(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutation", id] });
      qc.invalidateQueries({ queryKey: ["mutations"] });
      toast.success("Mutasi berhasil diperbarui");
      setEditOpen(false);
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui"),
  });

  const deleteMut = useMutation({
    mutationFn: () => mutationsApi.deleteMutation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutations"] });
      toast.success("Mutasi berhasil dihapus");
      navigate("/mutations");
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus"),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function openEdit() {
    if (!mut) return;
    setEditForm({
      position: mut.position ?? "",
      normal_base: mut.normal_base || "",
      mutation_base: mut.mutation_base || "",
      mutation_type: mut.mutation_type || "SNP",
      code: mut.code || "",
      description: mut.description || "",
      disease_id: mut.disease_id ?? "",
      sequence_id: mut.sequence_id ?? "",
    });
    setEditErrors({});
    setEditOpen(true);
  }

  function handleEditSubmit() {
    const errs = validateEdit(editForm);
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      return;
    }
    updateMut.mutate({
      id,
      data: {
        position: Number(editForm.position),
        normal_base: editForm.normal_base.trim(),
        mutation_base: editForm.mutation_base.trim(),
        mutation_type: editForm.mutation_type,
        sequence_id: Number(editForm.sequence_id),
        code: editForm.code.trim() || null,
        description: editForm.description.trim() || null,
        disease_id:
          editForm.disease_id !== "" ? Number(editForm.disease_id) : null,
      },
    });
  }

  // ── Loading / error ────────────────────────────────────────────────────────
  if (isLoading) return <DetailSkeleton />;

  if (error || !mut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FlaskConical size={40} className="text-[--text-tertiary]" />
        <p className="text-[--text-secondary]">Data mutasi tidak ditemukan.</p>
        <button
          onClick={() => navigate("/mutations")}
          className="btn btn-ghost"
        >
          <ArrowLeft size={15} /> Kembali
        </button>
      </div>
    );
  }

  const typeCfg = MUTATION_TYPES.find((m) => m.value === mut.mutation_type);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ── Back + Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={() => navigate("/mutations")}
          className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Kembali ke Daftar Mutasi
        </button>
        <div className="flex items-center gap-2">
          <button onClick={openEdit} className="btn btn-glass btn-sm">
            <Pencil size={14} /> Edit
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="btn btn-danger btn-sm"
          >
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      </motion.div>

      {/* ── Header Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-400 to-primary-500 flex items-center justify-center flex-shrink-0 shadow-glow-accent">
            <FlaskConical size={26} className="text-white" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {mut.code ? (
                <h1 className="text-2xl font-bold text-[--text-primary] font-mono">
                  {mut.code}
                </h1>
              ) : (
                <h1 className="font-display text-2xl font-bold text-[--text-primary]">
                  Mutasi #{mut.id}
                </h1>
              )}
              <span
                className={clsx(
                  "badge",
                  MUTATION_TYPE_COLOR[mut.mutation_type] || "badge-muted",
                )}
              >
                {mut.mutation_type}
              </span>
            </div>
            {typeCfg && (
              <p className="text-sm text-[--text-secondary]">{typeCfg.desc}</p>
            )}
          </div>

          {/* Base change visual — kanan atas */}
          <div className="flex flex-col items-end gap-1">
            <p className="text-[11px] text-[--text-tertiary] uppercase tracking-wider">
              Perubahan Basa
            </p>
            <div className="flex items-center gap-2 font-mono text-base">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">
                {mut.normal_base}
              </span>
              <ArrowRight size={16} className="text-[--text-tertiary]" />
              <span className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold">
                {mut.mutation_base}
              </span>
            </div>
            <p className="text-xs text-[--text-tertiary]">
              posisi{" "}
              <span className="font-mono font-semibold text-[--text-secondary]">
                {mut.position}
              </span>
            </p>
          </div>
        </div>

        {mut.description && (
          <p className="mt-4 text-sm text-[--text-secondary] leading-relaxed border-t border-[--border] pt-4">
            {mut.description}
          </p>
        )}
      </motion.div>

      {/* ── Detail cards grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Sequence terkait */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <DetailCard
            title="Genetic Sequence"
            icon={Dna}
            iconColor="text-primary-500"
          >
            {mut.sequence_id ? (
              <div>
                <InfoRow
                  label="Sequence ID"
                  value={`#${mut.sequence_id}`}
                  mono
                />
                {mut.sequence_name && (
                  <InfoRow label="Nama" value={mut.sequence_name} />
                )}
                <div className="mt-3">
                  <button
                    onClick={() => navigate(`/sequences/${mut.sequence_id}`)}
                    className="btn btn-ghost btn-sm"
                  >
                    <Dna size={13} /> Lihat Sequence →
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[--text-tertiary]">
                Tidak ada sequence terkait.
              </p>
            )}
          </DetailCard>
        </motion.div>

        {/* Penyakit terkait */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <DetailCard
            title="Penyakit Terkait"
            icon={AlertTriangle}
            iconColor="text-amber-500"
          >
            {mut.disease ? (
              <div>
                <InfoRow label="Nama Penyakit" value={mut.disease.name} />
                {mut.disease.icd_code && (
                  <InfoRow label="Kode ICD" value={mut.disease.icd_code} mono />
                )}
                {mut.disease.description && (
                  <InfoRow label="Deskripsi" value={mut.disease.description} />
                )}
                {/* Etnis berisiko */}
                {mut.disease.at_risk_ethnicities?.length > 0 && (
                  <div className="pt-2.5 mt-2 border-t border-[--border]">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[--text-tertiary] mb-2">
                      Etnis Berisiko
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {mut.disease.at_risk_ethnicities.map((eth) => (
                        <span
                          key={eth}
                          className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400"
                        >
                          {eth}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <button
                    onClick={() =>
                      navigate(`/diseases/${mut.disease.disease_id}`)
                    }
                    className="btn btn-ghost btn-sm"
                  >
                    <AlertTriangle size={13} /> Lihat Penyakit →
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-[--text-tertiary]">
                  Mutasi ini belum dihubungkan ke data penyakit.
                </p>
                <button
                  onClick={openEdit}
                  className="text-xs text-primary-500 hover:underline"
                >
                  + Tambahkan penyakit
                </button>
              </div>
            )}
          </DetailCard>
        </motion.div>

        {/* Info pasien */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <DetailCard
            title="Pasien"
            icon={User}
            iconColor="text-[--text-secondary]"
          >
            {mut.patient ? (
              <div>
                <InfoRow label="Nama" value={mut.patient.full_name} />
                {mut.patient.date_of_birth && (
                  <InfoRow
                    label="Tanggal Lahir"
                    value={new Date(
                      mut.patient.date_of_birth,
                    ).toLocaleDateString("id-ID")}
                  />
                )}
                {mut.patient.ethnicity_name && (
                  <InfoRow label="Etnis" value={mut.patient.ethnicity_name} />
                )}
                <div className="mt-3">
                  <button
                    onClick={() =>
                      navigate(`/patients/${mut.patient.patient_id}`)
                    }
                    className="btn btn-ghost btn-sm"
                  >
                    <User size={13} /> Lihat Pasien →
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[--text-tertiary]">
                Mutasi ini tidak terhubung langsung ke data pasien. Pasien
                terhubung melalui Genetic Sequence.
              </p>
            )}
          </DetailCard>
        </motion.div>

        {/* Ringkasan teknis */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <DetailCard
            title="Detail Teknis"
            icon={Info}
            iconColor="text-accent-500"
          >
            <InfoRow label="ID Mutasi" value={`#${mut.id}`} mono />
            <InfoRow label="Kode HGVS" value={mut.code} mono />
            <InfoRow label="Tipe">
              <span
                className={clsx(
                  "badge",
                  MUTATION_TYPE_COLOR[mut.mutation_type] || "badge-muted",
                )}
              >
                {mut.mutation_type}
              </span>
            </InfoRow>
            <InfoRow
              label="Posisi"
              value={mut.position?.toLocaleString()}
              mono
            />
            <InfoRow label="Normal Base" value={mut.normal_base} mono />
            <InfoRow label="Mutation Base" value={mut.mutation_base} mono />
          </DetailCard>
        </motion.div>
      </div>

      {/* ── Edit Modal ── */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Mutasi"
        subtitle={
          mut.code ? `Editing: ${mut.code}` : `Editing mutasi #${mut.id}`
        }
        size="lg"
        footer={
          <>
            <button
              onClick={() => setEditOpen(false)}
              className="btn btn-ghost"
              disabled={updateMut.isPending}
            >
              Batal
            </button>
            <button
              onClick={handleEditSubmit}
              className="btn btn-primary"
              disabled={updateMut.isPending}
            >
              {updateMut.isPending && (
                <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
              )}
              Simpan Perubahan
            </button>
          </>
        }
      >
        <MutationEditForm
          form={editForm}
          setForm={setEditForm}
          errors={editErrors}
          sequences={sequences}
          diseases={diseases}
        />
      </Modal>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMut.mutate()}
        title="Hapus Mutasi"
        description={`Yakin ingin menghapus mutasi ${
          mut.code ? `"${mut.code}"` : `#${mut.id}`
        }? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="space-y-5 max-w-4xl animate-pulse">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="skeleton h-36 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
