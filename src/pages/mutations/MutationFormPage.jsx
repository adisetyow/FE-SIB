/**
 * pages/mutations/MutationFormPage.jsx
 * Create & Edit Mutation.
 * Wajib: position, normal_base, mutation_base, mutation_type, sequence_id
 * Opsional: code, description, disease_id
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Microscope,
  Save,
  Loader2,
  AlertCircle,
  Info,
} from "lucide-react";
import clsx from "clsx";

import { mutationsApi } from "../../api/mutationsApi";
import { geneticsApi } from "../../api/geneticsApi";
import { diseasesApi } from "../../api/diseasesApi";
import {
  FormField,
  Input,
  Select,
  Textarea,
  FormRow,
} from "../../components/ui/FormField";

const EMPTY = {
  position: "",
  normal_base: "",
  mutation_base: "",
  mutation_type: "",
  code: "",
  description: "",
  sequence_id: "",
  disease_id: "",
};

// Tipe mutasi umum dalam genetika
const MUTATION_TYPES = [
  { value: "SNP", label: "SNP — Single Nucleotide Polymorphism" },
  { value: "INSERTION", label: "Insertion" },
  { value: "DELETION", label: "Deletion" },
  { value: "INDEL", label: "Indel (Insertion-Deletion)" },
  { value: "FRAMESHIFT", label: "Frameshift" },
  { value: "MISSENSE", label: "Missense" },
  { value: "NONSENSE", label: "Nonsense (Stop codon)" },
  { value: "SILENT", label: "Silent (Synonymous)" },
  { value: "SPLICE", label: "Splice site" },
  { value: "CNV", label: "CNV — Copy Number Variation" },
];

// Basa DNA/RNA valid
const DNA_BASES = ["A", "T", "C", "G", "N"];
const RNA_BASES = ["A", "U", "C", "G", "N"];
const PROT_BASES = [
  "A",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "K",
  "L",
  "M",
  "N",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "V",
  "W",
  "Y",
];

function FormSection({ title, subtitle, children }) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="border-b border-[--border] pb-3">
        <h2 className="font-display text-base font-bold text-[--text-primary]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[--text-secondary] mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// Preview basa dengan warna
function BasePreview({ ref: refBase, mut }) {
  const COLORS = {
    A: "text-blue-500",
    T: "text-green-500",
    G: "text-red-500",
    C: "text-yellow-500",
    U: "text-purple-500",
  };
  if (!refBase && !mut) return null;
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[--bg-subtle] border border-[--border]">
      <span
        className={clsx(
          "font-mono text-2xl font-black",
          COLORS[refBase] || "text-[--text-secondary]",
        )}
      >
        {refBase || "?"}
      </span>
      <span className="text-[--text-tertiary]">→</span>
      <span
        className={clsx(
          "font-mono text-2xl font-black",
          COLORS[mut] || "text-[--text-secondary]",
        )}
      >
        {mut || "?"}
      </span>
      {refBase && mut && refBase !== mut && (
        <span className="badge badge-danger ml-2">Mutasi</span>
      )}
      {refBase && mut && refBase === mut && (
        <span className="badge badge-muted ml-2">Identik</span>
      )}
    </div>
  );
}

export default function MutationFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  // Dropdown data
  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences-dropdown"],
    queryFn: () => geneticsApi.listSequences({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: diseases = [] } = useQuery({
    queryKey: ["diseases-dropdown"],
    queryFn: () => diseasesApi.listDiseases({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["mutation", id],
    queryFn: () => mutationsApi.getMutation(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      position: existing.position ?? "",
      normal_base: existing.normal_base || "",
      mutation_base: existing.mutation_base || "",
      mutation_type: existing.mutation_type || "",
      code: existing.code || "",
      description: existing.description || "",
      sequence_id: existing.sequence_id ?? "",
      disease_id: existing.disease_id ?? "",
    });
  }, [existing]);

  function set(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: "" }));
  }

  // Tentukan basa yang valid berdasarkan sequence yang dipilih
  const selectedSeq = sequences.find(
    (s) => String(s.id) === String(form.sequence_id),
  );
  const validBases =
    selectedSeq?.seq_type === "RNA"
      ? RNA_BASES
      : selectedSeq?.seq_type === "PROTEIN"
        ? PROT_BASES
        : DNA_BASES;

  function validate() {
    const e = {};
    if (!form.sequence_id) e.sequence_id = "Pilih sekuens terkait";
    if (form.position === "") e.position = "Posisi mutasi wajib diisi";
    else if (Number(form.position) < 1)
      e.position = "Posisi harus lebih dari 0";
    if (!form.normal_base.trim()) e.normal_base = "Basa normal wajib diisi";
    if (!form.mutation_base.trim()) e.mutation_base = "Basa mutan wajib diisi";
    if (!form.mutation_type) e.mutation_type = "Tipe mutasi wajib dipilih";
    return e;
  }

  function buildPayload() {
    return {
      position: Number(form.position),
      normal_base: form.normal_base.trim().toUpperCase(),
      mutation_base: form.mutation_base.trim().toUpperCase(),
      mutation_type: form.mutation_type,
      sequence_id: Number(form.sequence_id),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      disease_id: form.disease_id !== "" ? Number(form.disease_id) : null,
    };
  }

  const createMut = useMutation({
    mutationFn: mutationsApi.createMutation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutations"] });
      toast.success("Mutasi berhasil ditambahkan");
      navigate("/mutations");
    },
    onError: (e) => toast.error(e.message || "Gagal menyimpan"),
  });
  const updateMut = useMutation({
    mutationFn: (data) => mutationsApi.updateMutation(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutations"] });
      qc.invalidateQueries({ queryKey: ["mutation", id] });
      toast.success("Mutasi berhasil diperbarui");
      navigate("/mutations");
    },
    onError: (e) => toast.error(e.message || "Gagal memperbarui"),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.error("Lengkapi field wajib");
      return;
    }
    const payload = buildPayload();
    if (isEdit) updateMut.mutate(payload);
    else createMut.mutate(payload);
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5 max-w-2xl animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="skeleton h-48 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <button
              type="button"
              onClick={() => navigate("/mutations")}
              className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />{" "}
              Kembali ke Daftar Mutasi
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEdit ? "Simpan Perubahan" : "Simpan Mutasi"}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <Microscope size={22} className="text-danger-500" />
              {isEdit ? "Edit Mutasi" : t("mutations.addMutation")}
            </h1>
          </motion.div>

          {/* Relasi */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <FormSection
              title="Relasi Data"
              subtitle="Sekuens asal dan penyakit terkait"
            >
              <FormField
                label="Sekuens Genetik"
                required
                error={errors.sequence_id}
                helper="Pilih sekuens tempat mutasi ini ditemukan"
              >
                <Select
                  value={form.sequence_id}
                  onChange={(e) => set("sequence_id", e.target.value)}
                  error={errors.sequence_id}
                >
                  <option value="">— Pilih sekuens —</option>
                  {sequences.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.gene_symbol ? `(${s.gene_symbol})` : ""} [
                      {s.seq_type}]
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label={t("mutations.disease")}
                helper="Penyakit yang diasosiasikan dengan mutasi ini (opsional)"
              >
                <Select
                  value={form.disease_id}
                  onChange={(e) => set("disease_id", e.target.value)}
                >
                  <option value="">— Tidak ada —</option>
                  {diseases.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.icd_code ? ` (${d.icd_code})` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormSection>
          </motion.div>

          {/* Detail mutasi */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FormSection
              title="Detail Mutasi"
              subtitle="Informasi posisi dan perubahan basa"
            >
              <FormRow>
                <FormField
                  label={t("mutations.position")}
                  required
                  error={errors.position}
                  helper="Posisi indeks basa pada sekuens (1-based)"
                >
                  <Input
                    type="number"
                    min={1}
                    placeholder="Contoh: 1234"
                    value={form.position}
                    onChange={(e) => set("position", e.target.value)}
                    error={errors.position}
                    className="font-mono"
                  />
                </FormField>
                <FormField
                  label={t("mutations.mutationType")}
                  required
                  error={errors.mutation_type}
                >
                  <Select
                    value={form.mutation_type}
                    onChange={(e) => set("mutation_type", e.target.value)}
                    error={errors.mutation_type}
                  >
                    <option value="">— Pilih tipe —</option>
                    {MUTATION_TYPES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FormRow>

              <FormRow>
                <FormField
                  label={t("mutations.normalBase")}
                  required
                  error={errors.normal_base}
                  helper={`Basa pada sekuens normal${selectedSeq ? ` (${selectedSeq.seq_type})` : ""}`}
                >
                  <Input
                    placeholder={validBases.slice(0, 4).join(" / ")}
                    value={form.normal_base}
                    onChange={(e) =>
                      set(
                        "normal_base",
                        e.target.value.toUpperCase().slice(0, 1),
                      )
                    }
                    error={errors.normal_base}
                    maxLength={1}
                    className="font-mono text-lg uppercase text-center tracking-widest"
                  />
                </FormField>
                <FormField
                  label={t("mutations.mutationBase")}
                  required
                  error={errors.mutation_base}
                  helper="Basa pada sekuens mutan"
                >
                  <Input
                    placeholder={validBases.slice(0, 4).join(" / ")}
                    value={form.mutation_base}
                    onChange={(e) =>
                      set(
                        "mutation_base",
                        e.target.value.toUpperCase().slice(0, 1),
                      )
                    }
                    error={errors.mutation_base}
                    maxLength={1}
                    className="font-mono text-lg uppercase text-center tracking-widest"
                  />
                </FormField>
              </FormRow>

              {/* Preview perubahan basa */}
              <BasePreview ref={form.normal_base} mut={form.mutation_base} />

              <FormField
                label={t("mutations.code")}
                helper="Kode notasi mutasi standar, mis: c.1234A>G, p.Asp123Gly"
              >
                <Input
                  placeholder="c.1234A>G"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value)}
                  maxLength={200}
                  className="font-mono"
                />
              </FormField>

              <FormField label={t("common.description")}>
                <Textarea
                  placeholder="Deskripsi dampak klinis atau catatan peneliti..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                />
              </FormField>
            </FormSection>
          </motion.div>

          {/* Sticky bottom */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="sticky bottom-4 z-10"
          >
            <div className="glass rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-glass-md">
              <div>
                {Object.keys(errors).length > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-danger-500">
                    <AlertCircle size={15} />
                    Lengkapi field wajib
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/mutations")}
                  disabled={isSaving}
                  className="btn btn-ghost"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary btn-lg relative overflow-hidden group"
                >
                  {isSaving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {isEdit ? "Simpan Perubahan" : "Simpan Mutasi"}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
