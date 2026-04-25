/**
 * pages/activities/ActivityFormPage.jsx
 * Create & Edit Research Activity.
 * Schema ResearchActivityCreate: activity_number*, activity_name*, date*,
 *   action_type?, details?, tools[]?, evidences[]?
 *
 * Flow evidence: upload file → dapat URL → tambahkan ke evidences list
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FolderOpen,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Upload,
  Wrench,
  FileStack,
  X,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

import { activitiesApi } from "../../api/activitiesApi";
import {
  FormField,
  Input,
  Select,
  Textarea,
  FormRow,
} from "../../components/ui/FormField";

const EMPTY_TOOL = { tool_name: "", description: "" };
const EMPTY_EVIDENCE = { evidence_info: "", url: "", evidence_type: "FILE" };
const EVIDENCE_TYPES = ["FILE", "LINK", "IMAGE", "VIDEO", "OTHER"];

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

// Dynamic list untuk tools
function ToolsEditor({ value, onChange }) {
  function add() {
    onChange([...value, { ...EMPTY_TOOL }]);
  }
  function remove(i) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function set(i, f, v) {
    onChange(value.map((t, idx) => (idx === i ? { ...t, [f]: v } : t)));
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {value.map((tool, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-3 p-3.5 rounded-xl border border-[--border] bg-[--bg-subtle]"
          >
            <Wrench
              size={16}
              className="text-[--text-tertiary] flex-shrink-0 mt-2.5"
            />
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Nama alat / software (wajib)"
                value={tool.tool_name}
                onChange={(e) => set(i, "tool_name", e.target.value)}
                maxLength={100}
              />
              <Input
                placeholder="Deskripsi penggunaan (opsional)"
                value={tool.description}
                onChange={(e) => set(i, "description", e.target.value)}
                maxLength={300}
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors flex-shrink-0 mt-1"
            >
              <Trash2 size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        type="button"
        onClick={add}
        className="btn btn-glass btn-sm w-full border-dashed"
      >
        <Plus size={14} /> Tambah Alat
      </button>
    </div>
  );
}

// Dynamic list untuk evidences + upload file
function EvidencesEditor({ value, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadIdx, setUploadIdx] = useState(null);

  function add() {
    onChange([...value, { ...EMPTY_EVIDENCE }]);
  }
  function remove(i) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function set(i, f, v) {
    onChange(value.map((e, idx) => (idx === i ? { ...e, [f]: v } : e)));
  }

  async function handleFileUpload(idx, file) {
    setUploading(true);
    setUploadIdx(idx);
    try {
      const res = await activitiesApi.uploadEvidence(file);
      const url = res?.url || res?.file_url || "";
      set(idx, "url", url);
      set(idx, "evidence_info", file.name);
      toast.success("File bukti berhasil diunggah");
    } catch (err) {
      toast.error(err.message || "Gagal mengunggah file");
    } finally {
      setUploading(false);
      setUploadIdx(null);
    }
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {value.map((ev, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 rounded-xl border border-[--border] bg-[--bg-subtle] space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[--text-tertiary] uppercase tracking-wider">
                Bukti #{i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
            <FormRow>
              <FormField label="Keterangan" required>
                <Input
                  placeholder="Deskripsi bukti ini"
                  value={ev.evidence_info}
                  onChange={(e) => set(i, "evidence_info", e.target.value)}
                  maxLength={200}
                />
              </FormField>
              <FormField label="Tipe">
                <Select
                  value={ev.evidence_type}
                  onChange={(e) => set(i, "evidence_type", e.target.value)}
                >
                  {EVIDENCE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </FormField>
            </FormRow>
            {/* URL atau upload */}
            {ev.url ? (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success-500/8 border border-success-500/20">
                <CheckCircle2
                  size={14}
                  className="text-success-500 flex-shrink-0"
                />
                <span className="text-xs text-success-600 dark:text-success-400 font-mono truncate flex-1">
                  {ev.url}
                </span>
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[--text-tertiary] hover:text-accent-500"
                >
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={() => set(i, "url", "")}
                  className="text-[--text-tertiary] hover:text-danger-500"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="URL bukti (link eksternal)"
                  value={ev.url}
                  onChange={(e) => set(i, "url", e.target.value)}
                  maxLength={500}
                  className="flex-1"
                />
                <input
                  type="file"
                  ref={fileRef}
                  className="hidden"
                  onChange={(e) => handleFileUpload(i, e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => {
                    fileRef.current.click();
                  }}
                  disabled={uploading && uploadIdx === i}
                  className="btn btn-glass btn-sm flex-shrink-0 gap-1.5"
                >
                  {uploading && uploadIdx === i ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Upload size={13} />
                  )}
                  Upload
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
      <button
        type="button"
        onClick={add}
        className="btn btn-glass btn-sm w-full border-dashed"
      >
        <Plus size={14} /> Tambah Bukti
      </button>
    </div>
  );
}

export default function ActivityFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    activity_number: "",
    activity_name: "",
    date: "",
    action_type: "",
    details: "",
  });
  const [tools, setTools] = useState([]);
  const [evs, setEvs] = useState([]);
  const [errors, setErrors] = useState({});

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => activitiesApi.getActivity(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      activity_number: existing.activity_number || "",
      activity_name: existing.activity_name || "",
      date: existing.date || "",
      action_type: existing.action_type || "",
      details: existing.details || "",
    });
    setTools(
      existing.tools?.map((t) => ({
        tool_name: t.tool_name || "",
        description: t.description || "",
      })) || [],
    );
    setEvs(
      existing.evidences?.map((e) => ({
        evidence_info: e.evidence_info || "",
        url: e.url || "",
        evidence_type: e.evidence_type || "FILE",
      })) || [],
    );
  }, [existing]);

  function set(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.activity_number.trim())
      e.activity_number = "Nomor aktivitas wajib diisi";
    if (!form.activity_name.trim())
      e.activity_name = "Nama aktivitas wajib diisi";
    if (!form.date) e.date = "Tanggal wajib diisi";
    tools.forEach((t, i) => {
      if (!t.tool_name.trim())
        e[`tool_${i}`] = `Alat #${i + 1}: nama wajib diisi`;
    });
    evs.forEach((e2, i) => {
      if (!e2.evidence_info.trim())
        e[`ev_${i}`] = `Bukti #${i + 1}: keterangan wajib diisi`;
    });
    return e;
  }

  function buildPayload() {
    // ResearchActivityUpdate (PUT) hanya support: activity_number, activity_name, date, action_type, details
    // ResearchActivityCreate (POST) support tambahan: tools[], evidences[]
    const base = {
      activity_number: form.activity_number.trim(),
      activity_name: form.activity_name.trim(),
      date: form.date,
      action_type: form.action_type.trim() || null,
      details: form.details.trim() || null,
    };
    if (isEdit) return base; // PUT: API tidak menerima tools/evidences

    // POST only
    return {
      ...base,
      tools: tools
        .filter((t) => t.tool_name.trim())
        .map((t) => ({
          tool_name: t.tool_name.trim(),
          description: t.description.trim() || null,
        })),
      evidences: evs
        .filter((e) => e.evidence_info.trim())
        .map((e) => ({
          evidence_info: e.evidence_info.trim(),
          url: e.url.trim() || null,
          evidence_type: e.evidence_type || "FILE",
        })),
    };
  }

  const createMut = useMutation({
    mutationFn: activitiesApi.createActivity,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Aktivitas berhasil ditambahkan");
      navigate(`/activities/${res.id}`);
    },
    onError: (e) => toast.error(e.message || "Gagal menyimpan"),
  });

  const updateMut = useMutation({
    mutationFn: (data) => activitiesApi.updateActivity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["activity", id] });
      toast.success("Aktivitas berhasil diperbarui");
      navigate(`/activities/${id}`);
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
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <button
              type="button"
              onClick={() => navigate("/activities")}
              className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Kembali ke Daftar Aktivitas
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
              {isEdit ? "Simpan Perubahan" : "Simpan Aktivitas"}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <FolderOpen size={22} className="text-success-500" />
              {isEdit ? "Edit Aktivitas" : t("activities.addActivity")}
            </h1>
          </motion.div>

          {/* Info dasar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <FormSection
              title="Informasi Aktivitas"
              subtitle="Data utama aktivitas penelitian"
            >
              <FormRow>
                <FormField
                  label={t("activities.activityNumber")}
                  required
                  error={errors.activity_number}
                  helper="Nomor unik aktivitas, contoh: AKT-2024-001"
                >
                  <Input
                    placeholder="AKT-2024-001"
                    value={form.activity_number}
                    onChange={(e) => set("activity_number", e.target.value)}
                    error={errors.activity_number}
                    maxLength={20}
                    className="font-mono"
                  />
                </FormField>
                <FormField
                  label={t("common.date")}
                  required
                  error={errors.date}
                >
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => set("date", e.target.value)}
                    error={errors.date}
                  />
                </FormField>
              </FormRow>
              <FormField
                label={t("activities.activityName")}
                required
                error={errors.activity_name}
              >
                <Input
                  placeholder="Nama/judul aktivitas penelitian"
                  value={form.activity_name}
                  onChange={(e) => set("activity_name", e.target.value)}
                  error={errors.activity_name}
                  maxLength={200}
                />
              </FormField>
              <FormField
                label={t("activities.actionType")}
                helper="Jenis tindakan: Pengambilan Sampel, Analisis, Presentasi, dll."
              >
                <Input
                  placeholder="Pengambilan Sampel DNA"
                  value={form.action_type}
                  onChange={(e) => set("action_type", e.target.value)}
                  maxLength={50}
                />
              </FormField>
              <FormField label="Detail / Catatan">
                <Textarea
                  placeholder="Deskripsi lengkap kegiatan, temuan, atau catatan peneliti..."
                  value={form.details}
                  onChange={(e) => set("details", e.target.value)}
                  rows={4}
                />
              </FormField>
            </FormSection>
          </motion.div>

          {/* Tools */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FormSection
              title={t("activities.tools")}
              subtitle="Alat, software, atau instrumen yang digunakan dalam aktivitas ini"
            >
              <ToolsEditor value={tools} onChange={setTools} />
            </FormSection>
          </motion.div>

          {/* Evidences */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
          >
            <FormSection
              title={t("activities.evidences")}
              subtitle="File atau link sebagai bukti pelaksanaan aktivitas"
            >
              <EvidencesEditor value={evs} onChange={setEvs} />
            </FormSection>
          </motion.div>

          {/* Sticky bottom */}
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
                    Lengkapi field wajib
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/activities")}
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
                  {isEdit ? "Simpan Perubahan" : "Simpan Aktivitas"}
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
