/**
 * pages/mutations/MutationFormPage.jsx
 * Route: /mutations/new
 * (Juga bisa dipakai untuk /mutations/new?sequence_id=5 — prefill sequence)
 *
 * API: POST /api/v1/mutations
 * Required fields (dari MutationCreate schema):
 *   - position       : integer
 *   - normal_base    : string
 *   - mutation_base  : string
 *   - mutation_type  : string
 *   - sequence_id    : integer  ← wajib, referensi ke GeneticSequence
 * Optional fields:
 *   - code           : string | null
 *   - description    : string | null
 *   - disease_id     : integer | null
 *
 * Catatan penting:
 * Backend memvalidasi bahwa sequence_id yang dikirim benar-benar ada di database.
 * disease_id juga divalidasi jika diisi.
 */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FlaskConical,
  Save,
  Info,
  ArrowRight,
  Dna,
} from "lucide-react";
import clsx from "clsx";

import { mutationsApi } from "../../api/mutationsApi";
import { geneticsApi } from "../../api/geneticsApi";
import { diseasesApi } from "../../api/diseasesApi";
import {
  FormField,
  Input,
  Textarea,
  Select,
  FormRow,
} from "../../components/ui/FormField";

// ─── Mutation types (tidak ada master API, didefinisikan di frontend) ──────────
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

// ─── Validate ─────────────────────────────────────────────────────────────────
function validate(form) {
  const e = {};
  if (!form.sequence_id) e.sequence_id = "Genetic sequence wajib dipilih";
  if (!form.position || isNaN(Number(form.position)))
    e.position = "Posisi wajib diisi (angka)";
  else if (Number(form.position) < 1) e.position = "Posisi minimal 1";
  if (!form.normal_base.trim()) e.normal_base = "Base normal wajib diisi";
  if (!form.mutation_base.trim()) e.mutation_base = "Base mutan wajib diisi";
  if (!form.mutation_type) e.mutation_type = "Tipe mutasi wajib dipilih";
  return e;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[--text-tertiary]">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Mutation Type Card selector ──────────────────────────────────────────────
// Pilihan tipe mutasi ditampilkan sebagai card grid, bukan dropdown biasa,
// agar peneliti lebih mudah memilih dengan melihat deskripsinya langsung.
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

function MutationTypeGrid({ value, onChange, error }) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {MUTATION_TYPES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onChange(m.value)}
            className={clsx(
              "relative text-left px-3 py-2.5 rounded-xl border transition-all duration-150",
              value === m.value
                ? TYPE_ACCENT[m.value]
                : "border-[--border] bg-[--bg-subtle] text-[--text-secondary] hover:border-[--border-hover] hover:bg-[--bg-muted]",
            )}
          >
            <p className="text-xs font-bold">{m.label}</p>
            <p className="text-[10px] mt-0.5 leading-tight opacity-70">
              {m.desc}
            </p>
            {value === m.value && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-current" />
            )}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-danger-500 mt-1.5">{error}</p>}
    </div>
  );
}

// ─── Base Change Preview ──────────────────────────────────────────────────────
// Visualisasi perubahan basa secara live saat user mengetik
function BaseChangePreview({
  position,
  normalBase,
  mutationBase,
  mutationType,
}) {
  if (!normalBase && !mutationBase) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[--border] bg-[--bg-subtle]">
      <div className="text-[11px] text-[--text-tertiary] uppercase tracking-wider flex-shrink-0">
        Preview
      </div>
      <div className="flex items-center gap-2 font-mono text-sm flex-wrap">
        {position && (
          <span className="text-[--text-tertiary] text-xs">pos.{position}</span>
        )}
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
          {normalBase || "?"}
        </span>
        <ArrowRight size={14} className="text-[--text-tertiary]" />
        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
          {mutationBase || "?"}
        </span>
        {mutationType && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-[--border] text-[--text-secondary]">
            {mutationType}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MutationFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Support prefill dari query param: /mutations/new?sequence_id=5
  const [searchParams] = useSearchParams();
  const initSequenceId = searchParams.get("sequence_id") || "";

  const [form, setForm] = useState({
    position: "",
    normal_base: "",
    mutation_base: "",
    mutation_type: "SNP",
    code: "",
    description: "",
    disease_id: "",
    sequence_id: initSequenceId,
  });
  const [errors, setErrors] = useState({});

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  // ── Data queries ───────────────────────────────────────────────────────────
  const { data: sequences = [], isLoading: seqLoading } = useQuery({
    queryKey: ["sequences-dropdown"],
    queryFn: () => geneticsApi.listSequences({ limit: 1000 }),
  });

  const { data: diseases = [] } = useQuery({
    queryKey: ["diseases-dropdown"],
    queryFn: () => diseasesApi.listDiseases({ limit: 1000 }),
  });

  // Cari nama sequence yang dipilih untuk ditampilkan di preview
  const selectedSeq = sequences.find(
    (s) => String(s.id) === String(form.sequence_id),
  );

  // ── Create mutation ────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: mutationsApi.createMutation,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["mutations"] });
      toast.success("Mutasi berhasil ditambahkan");
      navigate(`/mutations/${data.id}`);
    },
    onError: (err) => {
      const msg =
        err.response?.data?.detail ?? err.message ?? "Gagal menyimpan mutasi";
      toast.error(msg);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      document
        .querySelector("[data-error='true']")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});

    const payload = {
      position: Number(form.position),
      normal_base: form.normal_base.trim(),
      mutation_base: form.mutation_base.trim(),
      mutation_type: form.mutation_type,
      sequence_id: Number(form.sequence_id),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      disease_id: form.disease_id !== "" ? Number(form.disease_id) : null,
    };

    createMutation.mutate(payload);
  }

  const isSaving = createMutation.isPending;

  return (
    <div className="max-w-3xl space-y-5">
      {/* ── Back ── */}
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
      </motion.div>

      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-400 to-primary-500 flex items-center justify-center shadow-glow-accent">
            <FlaskConical size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-[--text-primary]">
              Tambah Mutasi Baru
            </h1>
            <p className="text-sm text-[--text-secondary]">
              Catat mutasi genetik yang ditemukan pada suatu sequence
            </p>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[--border] bg-[--bg-subtle] px-4 py-3">
          <Info size={15} className="text-accent-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[--text-secondary] leading-relaxed">
            <span className="font-semibold text-[--text-primary]">
              Sequence wajib ada
            </span>{" "}
            sebelum mutasi bisa dicatat. Backend akan memvalidasi bahwa{" "}
            <span className="font-mono text-primary-400">sequence_id</span> yang
            dipilih benar-benar ada di database. Pastikan sequence sudah
            ditambahkan di menu{" "}
            <button
              type="button"
              onClick={() => navigate("/sequences")}
              className="text-primary-500 hover:underline"
            >
              Genetic Sequences
            </button>
            .
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          {/* ── Seksi 1: Sequence & Penyakit ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Section title="Referensi">
              {/* Sequence — wajib */}
              <FormField
                label="Genetic Sequence"
                required
                error={errors.sequence_id}
                helper="Pilih sequence yang mengandung mutasi ini"
              >
                <Select
                  value={form.sequence_id}
                  onChange={(e) => set("sequence_id", e.target.value)}
                  error={errors.sequence_id}
                  data-error={!!errors.sequence_id}
                  disabled={seqLoading}
                >
                  <option value="">
                    {seqLoading ? "Memuat..." : "— Pilih Sequence —"}
                  </option>
                  {sequences.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.accession_id ? ` (${s.accession_id})` : ""}
                      {" — "}
                      {s.seq_type}
                    </option>
                  ))}
                </Select>
              </FormField>

              {/* Preview sequence yang dipilih */}
              {selectedSeq && (
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary-500/5 border border-primary-500/15">
                  <Dna size={14} className="text-primary-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-primary-500 truncate">
                      {selectedSeq.name}
                    </p>
                    <p className="text-[10px] text-[--text-tertiary]">
                      {selectedSeq.seq_type}
                      {selectedSeq.chromosome
                        ? ` · Chr ${selectedSeq.chromosome}`
                        : ""}
                      {selectedSeq.gene_symbol
                        ? ` · ${selectedSeq.gene_symbol}`
                        : ""}
                      {selectedSeq.sequence_length
                        ? ` · ${selectedSeq.sequence_length.toLocaleString()} bp`
                        : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Disease — opsional */}
              <FormField
                label="Penyakit Terkait"
                helper="Opsional — hubungkan ke penyakit yang diketahui terkait mutasi ini"
              >
                <Select
                  value={form.disease_id}
                  onChange={(e) => set("disease_id", e.target.value)}
                >
                  <option value="">— Tidak ada / Belum diketahui —</option>
                  {diseases.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.icd_code ? ` [${d.icd_code}]` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>
            </Section>
          </motion.div>

          {/* ── Seksi 2: Tipe Mutasi ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <Section title="Tipe Mutasi">
              <MutationTypeGrid
                value={form.mutation_type}
                onChange={(val) => set("mutation_type", val)}
                error={errors.mutation_type}
              />
            </Section>
          </motion.div>

          {/* ── Seksi 3: Posisi & Perubahan Basa ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <Section title="Posisi & Perubahan Basa">
              <FormRow>
                <FormField
                  label="Posisi pada Sequence"
                  required
                  error={errors.position}
                  helper="Nomor posisi basa (1-based indexing)"
                >
                  <Input
                    type="number"
                    placeholder="e.g. 1234"
                    min={1}
                    value={form.position}
                    onChange={(e) => set("position", e.target.value)}
                    error={errors.position}
                    data-error={!!errors.position}
                    className="font-mono"
                  />
                </FormField>
                {/* Kode mutasi (notasi HGVS) */}
                <FormField
                  label="Kode Mutasi"
                  helper="Notasi HGVS, e.g. c.185delAG"
                >
                  <Input
                    placeholder="e.g. c.185delAG"
                    value={form.code}
                    onChange={(e) => set("code", e.target.value)}
                    className="font-mono"
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField
                  label="Base Normal"
                  required
                  error={errors.normal_base}
                  helper="Basa pada sequence referensi (wild-type)"
                >
                  <Input
                    placeholder="e.g. A"
                    value={form.normal_base}
                    onChange={(e) =>
                      set("normal_base", e.target.value.toUpperCase())
                    }
                    error={errors.normal_base}
                    data-error={!!errors.normal_base}
                    className="font-mono uppercase tracking-widest"
                    maxLength={50}
                  />
                </FormField>
                <FormField
                  label="Base Mutan"
                  required
                  error={errors.mutation_base}
                  helper="Basa hasil mutasi yang ditemukan"
                >
                  <Input
                    placeholder="e.g. T"
                    value={form.mutation_base}
                    onChange={(e) =>
                      set("mutation_base", e.target.value.toUpperCase())
                    }
                    error={errors.mutation_base}
                    data-error={!!errors.mutation_base}
                    className="font-mono uppercase tracking-widest"
                    maxLength={50}
                  />
                </FormField>
              </FormRow>

              {/* Live preview perubahan basa */}
              <BaseChangePreview
                position={form.position}
                normalBase={form.normal_base}
                mutationBase={form.mutation_base}
                mutationType={form.mutation_type}
              />
            </Section>
          </motion.div>

          {/* ── Seksi 4: Keterangan ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Section title="Keterangan Tambahan">
              <FormField
                label="Deskripsi"
                helper="Catatan klinis, sumber data, atau informasi relevan lainnya"
              >
                <Textarea
                  placeholder="Contoh: Mutasi ini ditemukan pada pasien dengan riwayat keluarga penderita diabetes tipe 2, etnis Jawa..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={4}
                />
              </FormField>
            </Section>
          </motion.div>

          {/* ── Action Buttons ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="flex justify-end gap-3 pb-4"
          >
            <button
              type="button"
              onClick={() => navigate("/mutations")}
              className="btn btn-ghost"
              disabled={isSaving}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {isSaving ? "Menyimpan..." : "Simpan Mutasi"}
            </button>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
