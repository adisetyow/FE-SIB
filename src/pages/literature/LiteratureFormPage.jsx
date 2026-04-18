/**
 * pages/literature/LiteratureFormPage.jsx
 * Create & Edit Literature.
 * Flow upload: pilih file → upload dulu → dapat URL → simpan form dengan URL tsb
 * Schema LiteratureCreate: title*, authors*, abstract?, keywords?, type?,
 *   publication_date?, doi?, issn?, isbn?, publisher?, city?, country?,
 *   volume?, issue?, url?, ncbi_link?, summary?
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FileText,
  Save,
  Loader2,
  AlertCircle,
  Upload,
  X,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";

import { literatureApi } from "../../api/literatureApi";
import {
  FormField,
  Input,
  Select,
  Textarea,
  FormRow,
} from "../../components/ui/FormField";
import { resolveFileUrl } from "../../utils/url";
import { toDateOnly } from "../../utils/date";

const LIT_TYPES = [
  "Jurnal",
  "Prosiding",
  "Buku",
  "Tesis",
  "Disertasi",
  "Laporan",
  "Lainnya",
];

const EMPTY = {
  title: "",
  authors: "",
  abstract: "",
  keywords: "",
  type: "",
  publication_date: "",
  doi: "",
  issn: "",
  isbn: "",
  publisher: "",
  city: "",
  country: "",
  volume: "",
  issue: "",
  url: "",
  ncbi_link: "",
  summary: "",
};

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

export default function LiteratureFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(""); // URL dari hasil upload
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["literature", id],
    queryFn: () => literatureApi.getLiterature(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      title: existing.title || "",
      authors: existing.authors || "",
      abstract: existing.abstract || "",
      keywords: existing.keywords || "",
      type: existing.type || "",
      publication_date: existing.publication_date
        ? existing.publication_date.split("T")[0]
        : "",
      doi: existing.doi || "",
      issn: existing.issn || "",
      isbn: existing.isbn || "",
      publisher: existing.publisher || "",
      city: existing.city || "",
      country: existing.country || "",
      volume: existing.volume || "",
      issue: existing.issue || "",
      url: existing.url || "",
      ncbi_link: existing.ncbi_link || "",
      summary: existing.summary || "",
    });
    if (existing.file_url) setFileUrl(existing.file_url);
  }, [existing]);

  function set(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: "" }));
  }

  // Upload file dulu, dapat URL
  async function handleFileUpload(selectedFile) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setUploading(true);
    setUploadPct(0);
    try {
      const res = await literatureApi.uploadFile(selectedFile, setUploadPct);
      const url = res?.url || res?.file_url || "";
      setFileUrl(url);
      toast.success("File berhasil diunggah");
    } catch (err) {
      toast.error(err.message || "Gagal mengunggah file");
      setFile(null);
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Judul wajib diisi";
    if (!form.authors.trim()) e.authors = "Penulis wajib diisi";
    return e;
  }

  function buildPayload() {
    return {
      title: form.title.trim(),
      authors: form.authors.trim(),
      abstract: form.abstract.trim() || null,
      keywords: form.keywords.trim() || null,
      type: form.type || null,
      publication_date: toDateOnly(form.publication_date),
      doi: form.doi.trim() || null,
      issn: form.issn.trim() || null,
      isbn: form.isbn.trim() || null,
      publisher: form.publisher.trim() || null,
      city: form.city.trim() || null,
      country: form.country.trim() || null,
      volume: form.volume.trim() || null,
      issue: form.issue.trim() || null,
      url: fileUrl || form.url.trim() || null,
      ncbi_link: form.ncbi_link.trim() || null,
      summary: form.summary.trim() || null,
    };
  }

  const createMut = useMutation({
    mutationFn: literatureApi.createLiterature,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["literature"] });
      toast.success("Literatur berhasil ditambahkan");
      navigate("/literature");
    },
    onError: (e) => toast.error(e.message || "Gagal menyimpan"),
  });

  const updateMut = useMutation({
    mutationFn: (data) => literatureApi.updateLiterature(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["literature"] });
      qc.invalidateQueries({ queryKey: ["literature", id] });
      toast.success("Literatur berhasil diperbarui");
      navigate("/literature");
    },
    onError: (e) => toast.error(e.message || "Gagal memperbarui"),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const payload = buildPayload();
    if (isEdit) updateMut.mutate(payload);
    else createMut.mutate(payload);
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5 max-w-3xl animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <button
              type="button"
              onClick={() => navigate("/literature")}
              className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Kembali ke Daftar Literatur
            </button>
            <button
              type="submit"
              disabled={isSaving || uploading}
              className="btn btn-primary"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEdit ? "Simpan Perubahan" : "Simpan Literatur"}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <FileText size={22} className="text-accent-500" />
              {isEdit ? "Edit Literatur" : t("literature.addLiterature")}
            </h1>
          </motion.div>

          {/* Identitas */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <FormSection
              title="Identitas Publikasi"
              subtitle="Informasi utama yang wajib diisi"
            >
              <FormField
                label={t("literature.title")}
                required
                error={errors.title}
              >
                <Input
                  placeholder="Judul lengkap publikasi ilmiah"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  error={errors.title}
                  maxLength={300}
                />
              </FormField>
              <FormField
                label={t("literature.authors")}
                required
                error={errors.authors}
                helper="Pisahkan beberapa penulis dengan koma. Contoh: Santoso B, Wijaya A, Pratama C"
              >
                <Textarea
                  placeholder="Budi Santoso, Agus Wijaya, Citra Pratama"
                  value={form.authors}
                  onChange={(e) => set("authors", e.target.value)}
                  error={errors.authors}
                  rows={2}
                  maxLength={500}
                />
              </FormField>
              <FormRow>
                <FormField label={t("common.type")}>
                  <Select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                  >
                    <option value="">— Pilih tipe —</option>
                    {LIT_TYPES.map((tp) => (
                      <option key={tp} value={tp}>
                        {tp}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label={t("literature.publicationDate")}>
                  <Input
                    type="date"
                    value={form.publication_date}
                    onChange={(e) => set("publication_date", e.target.value)}
                  />
                </FormField>
              </FormRow>
            </FormSection>
          </motion.div>

          {/* Upload File */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FormSection
              title={t("literature.uploadFile")}
              subtitle="Upload file PDF, DOC, atau format lainnya (opsional)"
            >
              {fileUrl ? (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-success-500/30 bg-success-500/5">
                  <CheckCircle2
                    size={18}
                    className="text-success-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-success-600 dark:text-success-400">
                      File berhasil diunggah
                    </p>
                    <p className="text-xs text-[--text-tertiary] font-mono truncate">
                      {file?.name || fileUrl}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={resolveFileUrl(fileUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setFileUrl("");
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : uploading ? (
                <div className="space-y-2 p-4 rounded-xl border border-primary-500/20 bg-primary-500/5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Loader2
                        size={15}
                        className="text-primary-500 animate-spin"
                      />
                      <span className="text-[--text-primary] font-medium">
                        Mengunggah...
                      </span>
                    </div>
                    <span className="font-mono font-bold text-primary-500">
                      {uploadPct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[--bg-muted] overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                      animate={{ width: `${uploadPct}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-[--border-hover] hover:border-primary-500/50 hover:bg-primary-500/5 cursor-pointer transition-all duration-200"
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files[0])}
                  />
                  <Upload
                    size={18}
                    className="text-[--text-tertiary] flex-shrink-0"
                  />
                  <div>
                    <p className="text-sm font-medium text-[--text-primary]">
                      Klik untuk upload file
                    </p>
                    <p className="text-xs text-[--text-tertiary]">
                      Mendukung PDF, DOC, DOCX, TXT
                    </p>
                  </div>
                </div>
              )}
            </FormSection>
          </motion.div>

          {/* Detail Publikasi */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
          >
            <FormSection
              title="Detail Publikasi"
              subtitle="Informasi penerbitan (semua opsional)"
            >
              <FormField label={t("literature.publisher")}>
                <Input
                  placeholder="Elsevier, Springer, UI Press, dll."
                  value={form.publisher}
                  onChange={(e) => set("publisher", e.target.value)}
                  maxLength={200}
                />
              </FormField>
              <FormRow>
                <FormField label="Kota Terbit">
                  <Input
                    placeholder="Jakarta"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    maxLength={100}
                  />
                </FormField>
                <FormField label="Negara">
                  <Input
                    placeholder="Indonesia"
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    maxLength={100}
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label="Volume">
                  <Input
                    placeholder="12"
                    value={form.volume}
                    onChange={(e) => set("volume", e.target.value)}
                    maxLength={20}
                  />
                </FormField>
                <FormField label="Issue / Nomor">
                  <Input
                    placeholder="3"
                    value={form.issue}
                    onChange={(e) => set("issue", e.target.value)}
                    maxLength={20}
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField
                  label={t("literature.doi")}
                  helper="Digital Object Identifier"
                >
                  <Input
                    placeholder="10.1016/j.gene.2023.01.001"
                    value={form.doi}
                    onChange={(e) => set("doi", e.target.value)}
                    maxLength={100}
                    className="font-mono text-xs"
                  />
                </FormField>
                <FormField label="ISSN">
                  <Input
                    placeholder="1234-5678"
                    value={form.issn}
                    onChange={(e) => set("issn", e.target.value)}
                    maxLength={20}
                    className="font-mono"
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label={t("literature.ncbiLink")}>
                  <Input
                    placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
                    value={form.ncbi_link}
                    onChange={(e) => set("ncbi_link", e.target.value)}
                    maxLength={500}
                  />
                </FormField>
                <FormField label="URL Artikel">
                  <Input
                    placeholder="https://doi.org/..."
                    value={form.url}
                    onChange={(e) => set("url", e.target.value)}
                    maxLength={500}
                  />
                </FormField>
              </FormRow>
            </FormSection>
          </motion.div>

          {/* Konten */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <FormSection
              title="Konten & Ringkasan"
              subtitle="Abstrak, kata kunci, dan ringkasan (opsional)"
            >
              <FormField
                label={t("literature.keywords")}
                helper="Pisahkan dengan koma"
              >
                <Input
                  placeholder="genomik, etnis Indonesia, mutasi, penyakit metabolik"
                  value={form.keywords}
                  onChange={(e) => set("keywords", e.target.value)}
                  maxLength={300}
                />
              </FormField>
              <FormField label={t("literature.abstract")}>
                <Textarea
                  placeholder="Abstrak publikasi..."
                  value={form.abstract}
                  onChange={(e) => set("abstract", e.target.value)}
                  rows={5}
                />
              </FormField>
              <FormField
                label="Ringkasan"
                helper="Ringkasan singkat dalam bahasa Indonesia untuk memudahkan pencarian"
              >
                <Textarea
                  placeholder="Ringkasan singkat temuan utama..."
                  value={form.summary}
                  onChange={(e) => set("summary", e.target.value)}
                  rows={3}
                />
              </FormField>
            </FormSection>
          </motion.div>

          {/* Sticky bottom */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.19 }}
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
                  onClick={() => navigate("/literature")}
                  disabled={isSaving}
                  className="btn btn-ghost"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving || uploading}
                  className="btn btn-primary btn-lg relative overflow-hidden group"
                >
                  {isSaving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {isEdit ? "Simpan Perubahan" : "Simpan Literatur"}
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
