/**
 * pages/genetics/SequenceFormPage.jsx
 * Halaman form untuk MENAMBAH sequence baru (bukan modal).
 * Route: /sequences/new
 *
 * Kenapa halaman terpisah, bukan modal?
 * - Form sequence punya banyak field → modal terlalu panjang
 * - User bisa fokus tanpa terganggu tabel di belakang
 * - URL dapat dibookmark / di-share antar peneliti
 *
 * Alur:
 * 1. User isi form → klik Simpan
 * 2. POST /api/v1/genetics/sequences
 * 3. Sukses → navigate ke /sequences/{id} (halaman detail)
 * 4. Batal → navigate ke /sequences
 *
 * Catatan field:
 * - length      : TIDAK ADA di form. Dihitung otomatis dari sequence_data.length.
 * - status_processed : TIDAK ditampilkan. Selalu dikirim "PENDING" saat create.
 *                      Backend yang akan mengubahnya ke PROCESSED/FAILED.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeft, Dna, Save, Info } from "lucide-react";
import clsx from "clsx";

import { geneticsApi } from "../../api/geneticsApi";
import {
  FormField,
  Input,
  Textarea,
  Select,
  FormRow,
} from "../../components/ui/FormField";

// ─── Empty form ───────────────────────────────────────────────────────────────
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

// ─── Validate ─────────────────────────────────────────────────────────────────
function validate(form) {
  const e = {};
  if (!form.name.trim()) e.name = "Nama sekuens wajib diisi";
  if (!form.sequence_data.trim()) e.sequence_data = "Data sekuens wajib diisi";
  if (!form.seq_type) e.seq_type = "Tipe sekuens wajib dipilih";
  if (
    form.start_position !== "" &&
    form.end_position !== "" &&
    Number(form.start_position) > Number(form.end_position)
  ) {
    e.end_position = "End position harus ≥ start position";
  }
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SequenceFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
    // Clear error saat user mengetik
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  // ── Master data queries ────────────────────────────────────────────────────
  const { data: seqTypes = [] } = useQuery({
    queryKey: ["seq-types"],
    queryFn: geneticsApi.getSequenceTypes,
  });
  const { data: strands = [] } = useQuery({
    queryKey: ["seq-strands"],
    queryFn: geneticsApi.getStrands,
  });

  // ── Mutation ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: geneticsApi.createSequence,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sekuens berhasil ditambahkan");
      // Arahkan ke detail sequence yang baru dibuat
      navigate(`/sequences/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Gagal menyimpan sekuens");
    },
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      // Scroll ke error pertama
      const firstErrEl = document.querySelector("[data-error='true']");
      firstErrEl?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});

    // length dihitung otomatis — strip whitespace dulu
    const cleanSeq = form.sequence_data.trim();
    const autoLength = cleanSeq.replace(/\s/g, "").length;

    const payload = {
      // Required fields
      name: form.name.trim(),
      sequence_data: cleanSeq,
      seq_type: form.seq_type,

      // length dihitung otomatis dari sequence_data
      length: autoLength > 0 ? autoLength : null,

      // status_processed tidak ditampilkan ke user.
      // Saat CREATE selalu "PENDING" — backend yang akan memprosesnya.
      status_processed: "PENDING",

      // Optional fields — kirim null jika kosong
      accession_id: form.accession_id.trim() || null,
      chromosome: form.chromosome.trim() || null,
      gene_symbol: form.gene_symbol.trim() || null,
      full_name: form.full_name.trim() || null,
      gene_type: form.gene_type.trim() || null,
      start_position:
        form.start_position !== "" ? Number(form.start_position) : null,
      end_position: form.end_position !== "" ? Number(form.end_position) : null,
      strand: form.strand || null,
      rna_type: form.rna_type.trim() || null,
      protein_name: form.protein_name.trim() || null,
      molecular_weight:
        form.molecular_weight !== "" ? Number(form.molecular_weight) : null,
      description: form.description.trim() || null,
      patient_id: form.patient_id !== "" ? Number(form.patient_id) : null,

      // protein_functions — bisa ditambahkan kemudian dari halaman detail
      protein_functions: [],
    };

    createMutation.mutate(payload);
  }

  // Hitung panjang real-time untuk ditampilkan sebagai helper text
  const seqLen = form.sequence_data.replace(/\s/g, "").length;

  const isSaving = createMutation.isPending;

  return (
    <div className="max-w-3xl space-y-5">
      {/* ── Back + Page title ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={() => navigate("/sequences")}
          className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Kembali ke Daftar Sekuens
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center shadow-glow-primary">
            <Dna size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-[--text-primary]">
              Tambah Sekuens Baru
            </h1>
            <p className="text-sm text-[--text-secondary]">
              Tambahkan data genetic sequence ke database SIB
            </p>
          </div>
        </div>

        {/* Info box: penjelasan status_processed */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[--border] bg-[--bg-subtle] px-4 py-3">
          <Info size={15} className="text-primary-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[--text-secondary] leading-relaxed">
            <span className="font-semibold text-[--text-primary]">
              Status Pemrosesan
            </span>{" "}
            akan otomatis dimulai dari{" "}
            <span className="font-mono text-amber-500">PENDING</span> setelah
            disimpan. Backend akan menganalisis sekuens dan mengubah statusnya
            menjadi{" "}
            <span className="font-mono text-emerald-500">PROCESSED</span> atau{" "}
            <span className="font-mono text-red-500">FAILED</span>. Anda dapat
            memantau status di halaman detail sekuens.
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          {/* ── Seksi 1: Identitas ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <Section title="Identitas Sekuens">
              <FormRow>
                <FormField
                  label={t("sequences.name")}
                  required
                  error={errors.name}
                >
                  <Input
                    placeholder="e.g. BRCA1 Gene"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    error={errors.name}
                    data-error={!!errors.name}
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

              <FormField label="Full Name">
                <Input
                  placeholder="Nama lengkap gen / protein"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  maxLength={200}
                />
              </FormField>

              <FormField label={t("common.description")}>
                <Textarea
                  placeholder="Deskripsi sekuens, sumber data, dll..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={2}
                />
              </FormField>
            </Section>
          </motion.div>

          {/* ── Seksi 2: Klasifikasi ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <Section title="Klasifikasi">
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
                    {seqTypes.map((s) => (
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
                    <option value="">— Pilih Strand —</option>
                    {strands.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label={t("sequences.geneSymbol")}>
                  <Input
                    placeholder="e.g. BRCA1"
                    value={form.gene_symbol}
                    onChange={(e) => set("gene_symbol", e.target.value)}
                    maxLength={20}
                  />
                </FormField>
                <FormField label="Gene Type">
                  <Input
                    placeholder="e.g. protein_coding"
                    value={form.gene_type}
                    onChange={(e) => set("gene_type", e.target.value)}
                    maxLength={50}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="RNA Type">
                  <Input
                    placeholder="e.g. mRNA, tRNA, rRNA"
                    value={form.rna_type}
                    onChange={(e) => set("rna_type", e.target.value)}
                    maxLength={50}
                  />
                </FormField>
                <FormField label="Protein Name">
                  <Input
                    placeholder="Nama protein (jika ada)"
                    value={form.protein_name}
                    onChange={(e) => set("protein_name", e.target.value)}
                    maxLength={150}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label="Molecular Weight (Da)">
                  <Input
                    type="number"
                    placeholder="e.g. 35000"
                    value={form.molecular_weight}
                    onChange={(e) => set("molecular_weight", e.target.value)}
                    min={0}
                  />
                </FormField>
                {/* Patient ID — opsional, diisi jika sequence milik pasien tertentu */}
                <FormField
                  label="Patient ID"
                  helper="Opsional — isi jika sekuens berasal dari pasien tertentu"
                >
                  <Input
                    type="number"
                    placeholder="ID pasien (opsional)"
                    value={form.patient_id}
                    onChange={(e) => set("patient_id", e.target.value)}
                    min={1}
                  />
                </FormField>
              </FormRow>
            </Section>
          </motion.div>

          {/* ── Seksi 3: Lokasi Genomik ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <Section title="Lokasi Genomik (Opsional)">
              <FormRow>
                <FormField label={t("sequences.chromosome")}>
                  <Input
                    placeholder="e.g. 17"
                    value={form.chromosome}
                    onChange={(e) => set("chromosome", e.target.value)}
                    maxLength={10}
                  />
                </FormField>
                {/* Kosong untuk simetri grid */}
                <div />
              </FormRow>

              <FormRow>
                <FormField label={t("sequences.startPosition")}>
                  <Input
                    type="number"
                    placeholder="Posisi awal (bp)"
                    value={form.start_position}
                    onChange={(e) => set("start_position", e.target.value)}
                    min={0}
                  />
                </FormField>
                <FormField
                  label={t("sequences.endPosition")}
                  error={errors.end_position}
                >
                  <Input
                    type="number"
                    placeholder="Posisi akhir (bp)"
                    value={form.end_position}
                    onChange={(e) => set("end_position", e.target.value)}
                    min={0}
                    error={errors.end_position}
                  />
                </FormField>
              </FormRow>
            </Section>
          </motion.div>

          {/* ── Seksi 4: Data Sekuens ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Section title="Data Sekuens">
              <FormField
                label={t("sequences.sequenceData")}
                required
                error={errors.sequence_data}
                helper={
                  seqLen > 0
                    ? // Tampilkan panjang real-time — ini yang akan dikirim sebagai `length`
                      `Panjang terdeteksi: ${seqLen.toLocaleString()} karakter. Field length akan terisi otomatis.`
                    : "Masukkan sekuens dalam format IUPAC. Spasi dan newline diabaikan saat menghitung panjang."
                }
              >
                <Textarea
                  placeholder="ATCGGCTATCGATCGATCGATCGATCG..."
                  value={form.sequence_data}
                  onChange={(e) => set("sequence_data", e.target.value)}
                  rows={8}
                  error={errors.sequence_data}
                  className="font-mono text-xs tracking-wider"
                  data-error={!!errors.sequence_data}
                />
              </FormField>

              {/* Live character counter */}
              {seqLen > 0 && (
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-[--bg-muted] overflow-hidden">
                    <div
                      className={clsx(
                        "h-full rounded-full transition-all duration-300",
                        seqLen < 100
                          ? "bg-amber-500"
                          : seqLen < 1000
                            ? "bg-primary-500"
                            : "bg-emerald-500",
                      )}
                      style={{
                        width: `${Math.min((seqLen / 10000) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-[--text-tertiary] font-mono whitespace-nowrap">
                    {seqLen.toLocaleString()} bp
                  </span>
                </div>
              )}
            </Section>
          </motion.div>

          {/* ── Action buttons ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="flex justify-end gap-3 pb-4"
          >
            <button
              type="button"
              onClick={() => navigate("/sequences")}
              className="btn btn-ghost"
              disabled={isSaving}
            >
              {t("common.cancel")}
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
              {isSaving ? "Menyimpan..." : "Simpan Sekuens"}
            </button>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
