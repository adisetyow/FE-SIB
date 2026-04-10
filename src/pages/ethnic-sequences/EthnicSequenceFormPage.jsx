/**
 * pages/ethnic-sequences/EthnicSequenceFormPage.jsx
 *
 * Halaman form untuk CREATE dan EDIT Ethnic Sequence.
 * Route:
 *   /ethnic-sequences/new        → create (upload file + metadata)
 *   /ethnic-sequences/:id/edit   → edit (metadata SAJA, file tidak bisa diubah)
 *
 * Aturan dari API:
 * - Create → multipart/form-data: ethnicity_name, data_type, description?, file
 * - Edit   → JSON: ethnicity_name?, data_type?, description?
 * - File FASTA tidak bisa diubah setelah upload. Harus hapus dan upload ulang.
 * - ID adalah UUID string
 *
 * data_type: NORMAL (sekuens referensi normal) | MUTANT (sekuens yang memiliki mutasi)
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Beaker,
  Save,
  Info,
  AlertCircle,
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle2,
  Lock,
  HelpCircle,
} from "lucide-react";
import clsx from "clsx";

import { ethnicSequencesApi } from "../../api/ethnicSequencesApi";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../components/ui/FormField";

// ─── Accepted FASTA extensions ────────────────────────────────────────────────
const FASTA_ACCEPT = ".fasta,.fa,.fna,.ffn,.faa,.frn,.fas,.txt";
const FASTA_MAX_MB = 3 * 1024; // 3 GB dalam MB

// ─── Format file size ─────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return "0 B";
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function FormSection({ title, subtitle, children, locked }) {
  return (
    <div
      className={clsx(
        "glass rounded-2xl p-6 space-y-4",
        locked && "opacity-75",
      )}
    >
      <div className="border-b border-[--border] pb-3 flex items-center gap-3">
        <div className="flex-1">
          <h2 className="font-display text-base font-bold text-[--text-primary] flex items-center gap-2">
            {title}
            {locked && <Lock size={14} className="text-[--text-tertiary]" />}
          </h2>
          {subtitle && (
            <p className="text-xs text-[--text-secondary] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── File Drop Zone ───────────────────────────────────────────────────────────
function FileDropZone({ file, onFile, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    // Cek ekstensi
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!FASTA_ACCEPT.includes(ext)) {
      toast.error(`Format file tidak didukung. Gunakan: ${FASTA_ACCEPT}`);
      return;
    }
    onFile(f);
  }

  if (disabled) return null;

  // Sudah ada file yang dipilih
  if (file) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl border border-primary-500/30 bg-primary-500/5">
        <FileText size={20} className="text-primary-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[--text-primary] truncate">
            {file.name}
          </p>
          <p className="text-xs text-[--text-tertiary]">
            {formatSize(file.size)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFile(null)}
          className="w-7 h-7 rounded-lg flex items-center justify-center
            text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        "flex flex-col items-center justify-center gap-3 p-10 rounded-xl",
        "border-2 border-dashed cursor-pointer transition-all duration-200",
        dragging
          ? "border-primary-500 bg-primary-500/10"
          : "border-[--border-hover] hover:border-primary-500/50 hover:bg-primary-500/5",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={FASTA_ACCEPT}
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div
        className={clsx(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
          dragging ? "bg-primary-500/20" : "bg-[--bg-muted]",
        )}
      >
        <Upload
          size={24}
          className={dragging ? "text-primary-500" : "text-[--text-tertiary]"}
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[--text-primary]">
          Drop file FASTA di sini, atau klik untuk memilih
        </p>
        <p className="text-xs text-[--text-tertiary] mt-1">
          Mendukung .fasta .fa .fna .ffn .faa .frn .fas .txt
        </p>
        <p className="text-xs text-[--text-tertiary]">
          Ukuran maksimum: 3 GB · Streaming langsung ke disk
        </p>
      </div>
    </div>
  );
}

// ─── Upload Progress Bar ──────────────────────────────────────────────────────
function UploadProgress({ progress, fileName }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2 p-4 rounded-xl border border-primary-500/20 bg-primary-500/5"
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Loader2 size={15} className="text-primary-500 animate-spin" />
          <span className="text-[--text-primary] font-medium">
            {progress < 100 ? "Mengunggah..." : "Memproses..."}
          </span>
        </div>
        <span className="font-mono font-bold text-primary-500">
          {progress}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[--bg-muted] overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: "easeOut" }}
        />
      </div>
      {fileName && (
        <p className="text-xs text-[--text-tertiary] font-mono truncate">
          {fileName}
        </p>
      )}
    </motion.div>
  );
}

// ─── Data Type Info ───────────────────────────────────────────────────────────
function DataTypeInfo({ value }) {
  const info = {
    NORMAL: {
      color:
        "bg-primary-500/8 border-primary-500/20 text-primary-600 dark:text-primary-400",
      icon: CheckCircle2,
      title: "Sekuens Normal (Referensi)",
      desc: "File FASTA berisi sekuens DNA/RNA dari individu sehat tanpa mutasi pada gen yang diteliti. Digunakan sebagai acuan baseline untuk perbandingan.",
    },
    MUTANT: {
      color:
        "bg-danger-500/8 border-danger-500/20 text-danger-600 dark:text-danger-400",
      icon: AlertCircle,
      title: "Sekuens Mutan",
      desc: "File FASTA berisi sekuens yang memiliki mutasi yang diketahui. Digunakan sebagai acuan untuk mendeteksi pola mutasi spesifik pada etnis tersebut.",
    },
  };
  const cfg = info[value];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <div
      className={clsx(
        "flex items-start gap-2.5 p-3 rounded-lg border text-xs",
        cfg.color,
      )}
    >
      <Icon size={14} className="flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">{cfg.title}</p>
        <p className="mt-0.5 opacity-90">{cfg.desc}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EthnicSequenceFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    ethnicity_name: "",
    data_type: "NORMAL",
    description: "",
  });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Master data ────────────────────────────────────────────────────────────
  const { data: dataTypes = [] } = useQuery({
    queryKey: ["ethnic-data-types"],
    queryFn: ethnicSequencesApi.getDataTypes,
    staleTime: Infinity,
  });

  // ── Load existing (edit mode) ─────────────────────────────────────────────
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["ethnic-sequence", id],
    queryFn: () => ethnicSequencesApi.getEthnicSequence(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      ethnicity_name: existing.ethnicity_name || "",
      data_type: existing.data_type || "NORMAL",
      description: existing.description || "",
    });
  }, [existing]);

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
  }

  // ── Validasi ────────────────────────────────────────────────────────────────
  function validate() {
    const e = {};
    if (!form.ethnicity_name.trim())
      e.ethnicity_name = "Nama etnis wajib diisi";
    if (!form.data_type) e.data_type = "Tipe data wajib dipilih";
    if (!isEdit && !file) e.file = "File FASTA wajib diunggah";
    return e;
  }

  // ── Update mutation (edit — JSON) ─────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data) => ethnicSequencesApi.updateEthnicSequence(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ethnic-sequences"] });
      qc.invalidateQueries({ queryKey: ["ethnic-sequence", id] });
      toast.success("Metadata berhasil diperbarui");
      navigate(`/ethnic-sequences/${id}`);
    },
    onError: (err) => toast.error(err.message || "Gagal memperbarui"),
  });

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.error("Lengkapi field yang wajib diisi");
      return;
    }

    if (isEdit) {
      // Edit → JSON, tidak kirim file
      updateMutation.mutate(form);
    } else {
      // Create → multipart upload dengan progress
      setUploading(true);
      setProgress(0);
      try {
        const result = await ethnicSequencesApi.createEthnicSequence(
          form,
          file,
          (pct) => setProgress(pct),
        );
        qc.invalidateQueries({ queryKey: ["ethnic-sequences"] });
        toast.success("Sekuens etnis berhasil diunggah");
        navigate(`/ethnic-sequences/${result.id}`);
      } catch (err) {
        toast.error(err.message || "Gagal mengunggah sekuens");
      } finally {
        setUploading(false);
        setProgress(0);
      }
    }
  }

  const isSaving = uploading || updateMutation.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5 max-w-2xl animate-pulse">
        <div className="skeleton h-8 w-56 rounded-xl" />
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          {/* ── Breadcrumb + Save ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <button
              type="button"
              onClick={() => navigate("/ethnic-sequences")}
              className="flex items-center gap-2 text-sm text-[--text-secondary]
                hover:text-[--text-primary] transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Kembali ke Daftar
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
              {isEdit ? "Simpan Perubahan" : "Upload Sekuens"}
            </button>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <Beaker size={22} className="text-primary-500" />
              {isEdit
                ? "Edit Metadata Sekuens Etnis"
                : t("ethnicSequences.addSequence")}
            </h1>
            {isEdit && existing && (
              <p className="page-subtitle mt-0.5">
                {existing.ethnicity_name} · {existing.data_type}
              </p>
            )}
          </motion.div>

          {/* ── Peringatan edit mode ── */}
          {isEdit && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-start gap-3 p-4 rounded-xl border border-warning-400/30
                bg-warning-400/8 text-warning-600 dark:text-warning-400"
            >
              <Lock size={16} className="flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold">File FASTA tidak dapat diubah</p>
                <p className="text-xs opacity-85 mt-0.5">
                  {t("ethnicSequences.noFileChange")} Anda hanya dapat mengubah
                  nama etnis, tipe data, dan deskripsi.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── SECTION 1: Metadata ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <FormSection
              title="Informasi Etnis"
              subtitle="Identitas dan klasifikasi sekuens referensi ini"
            >
              {/* Ethnicity Name */}
              <FormField
                label={t("ethnicSequences.ethnicityName")}
                required
                error={errors.ethnicity_name}
                helper="Nama kelompok etnis di Indonesia (contoh: Jawa, Sunda, Batak Toba, Bugis)"
              >
                <Input
                  placeholder="Contoh: Jawa, Sunda, Batak Toba, Minangkabau..."
                  value={form.ethnicity_name}
                  onChange={(e) => set("ethnicity_name", e.target.value)}
                  error={errors.ethnicity_name}
                  maxLength={100}
                />
              </FormField>

              {/* Data Type */}
              <FormField
                label={t("ethnicSequences.dataType")}
                required
                error={errors.data_type}
              >
                <Select
                  value={form.data_type}
                  onChange={(e) => set("data_type", e.target.value)}
                  error={errors.data_type}
                >
                  <option value="">— Pilih tipe data —</option>
                  {dataTypes.length > 0 ? (
                    dataTypes.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="NORMAL">Normal</option>
                      <option value="MUTANT">Mutant</option>
                    </>
                  )}
                </Select>
              </FormField>

              {/* Info box penjelasan data type */}
              <DataTypeInfo value={form.data_type} />

              {/* Description */}
              <FormField
                label={t("common.description")}
                helper="Catatan tambahan: sumber data, populasi sampel, tahun pengambilan, dll."
              >
                <Textarea
                  placeholder="Contoh: Sekuens mitokondria dari 50 sampel etnis Jawa Tengah (2023)..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                />
              </FormField>
            </FormSection>
          </motion.div>

          {/* ── SECTION 2: Upload File ── */}
          {!isEdit && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <FormSection
                title="File FASTA"
                subtitle="Upload file sekuens referensi untuk etnis ini"
              >
                {/* Info penting */}
                <div
                  className="flex items-start gap-2.5 p-3 rounded-lg bg-accent-500/8
                  border border-accent-500/15 text-xs text-accent-600 dark:text-accent-400"
                >
                  <Info size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 leading-relaxed">
                    <p>
                      <strong>File di-stream langsung ke disk</strong> — tidak
                      dimuat ke RAM, sehingga mendukung file hingga 3 GB tanpa
                      masalah memori.
                    </p>
                    <p>
                      Setelah upload, file <strong>tidak dapat diubah</strong>.
                      Jika perlu mengganti, hapus entri ini dan upload ulang.
                    </p>
                  </div>
                </div>

                {/* Drop zone atau file selected */}
                {errors.file && (
                  <p className="flex items-center gap-1.5 text-xs text-danger-500">
                    <AlertCircle size={12} /> {errors.file}
                  </p>
                )}

                <FileDropZone
                  file={file}
                  onFile={(f) => {
                    setFile(f);
                    if (errors.file) setErrors((p) => ({ ...p, file: "" }));
                  }}
                  disabled={uploading}
                />

                {/* Upload progress */}
                {uploading && (
                  <UploadProgress progress={progress} fileName={file?.name} />
                )}

                {/* File checklist */}
                {file && !uploading && (
                  <div className="space-y-1.5">
                    {[
                      { ok: true, label: `File dipilih: ${file.name}` },
                      {
                        ok: file.size < FASTA_MAX_MB * 1024 * 1024,
                        label: `Ukuran: ${formatSize(file.size)} (maks. 3 GB)`,
                      },
                      {
                        ok: form.ethnicity_name.trim().length > 0,
                        label: "Nama etnis sudah diisi",
                      },
                      {
                        ok: !!form.data_type,
                        label: "Tipe data sudah dipilih",
                      },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className={clsx(
                          "flex items-center gap-2 text-xs",
                          item.ok
                            ? "text-success-500"
                            : "text-[--text-tertiary]",
                        )}
                      >
                        <CheckCircle2
                          size={12}
                          className={item.ok ? "opacity-100" : "opacity-30"}
                        />
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
              </FormSection>
            </motion.div>
          )}

          {/* ── Info file existing (edit mode) ── */}
          {isEdit && existing && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
            >
              <FormSection
                title="File FASTA (Terkunci)"
                subtitle="Informasi file yang sudah diunggah"
                locked
              >
                <div className="flex items-center gap-3 p-4 rounded-xl bg-[--bg-subtle] border border-[--border]">
                  <div className="w-10 h-10 rounded-xl bg-[--bg-muted] flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-[--text-tertiary]" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-[--text-primary] truncate">
                      {existing.original_filename || "File tidak diketahui"}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-[--text-tertiary]">
                      {existing.file_size_mb && (
                        <span>
                          {formatSize(existing.file_size_mb * 1024 * 1024)}
                        </span>
                      )}
                      <span
                        className={clsx(
                          "font-semibold",
                          existing.status === "READY" && "text-success-500",
                          existing.status === "UPLOADING" && "text-warning-400",
                          existing.status === "FAILED" && "text-danger-500",
                        )}
                      >
                        {existing.status}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[--text-tertiary] flex-shrink-0">
                    <Lock size={12} />
                    Terkunci
                  </div>
                </div>

                <p className="text-xs text-[--text-tertiary] flex items-center gap-1.5">
                  <HelpCircle size={12} />
                  Untuk mengganti file, hapus entri ini dari halaman daftar lalu
                  upload ulang.
                </p>
              </FormSection>
            </motion.div>
          )}

          {/* ── Sticky Bottom Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="sticky bottom-4 z-10"
          >
            <div className="glass rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-glass-md">
              <div>
                {Object.keys(errors).length > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-danger-500">
                    <AlertCircle size={15} />
                    Lengkapi field yang wajib diisi
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/ethnic-sequences")}
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
                  {uploading
                    ? `Mengunggah... ${progress}%`
                    : isEdit
                      ? "Simpan Perubahan"
                      : "Upload Sekuens"}
                  <span
                    className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                    transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15
                    to-transparent skew-x-12 pointer-events-none"
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
