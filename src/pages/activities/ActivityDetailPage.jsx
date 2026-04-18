/**
 * pages/activities/ActivityDetailPage.jsx
 * Detail aktivitas dengan tools, evidences, dan modal Tambah Bukti.
 */
import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FolderOpen,
  Pencil,
  Trash2,
  Wrench,
  FileStack,
  ExternalLink,
  Calendar,
  Plus,
  Upload,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import clsx from "clsx";

import { activitiesApi } from "../../api/activitiesApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Modal from "../../components/ui/Modal";
import { FormField, Input, Select } from "../../components/ui/FormField";
import { resolveFileUrl } from "../../utils/fileUrl";

const EVIDENCE_TYPES = ["FILE", "LINK", "IMAGE", "VIDEO", "OTHER"];

// ─── Modal Tambah Bukti ───────────────────────────────────────────────────────
function AddEvidenceModal({ open, onClose, activityId }) {
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    evidence_info: "",
    url: "",
    evidence_type: "FILE",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [errors, setErrors] = useState({});

  function set(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: "" }));
  }

  function reset() {
    setForm({ evidence_info: "", url: "", evidence_type: "FILE" });
    setErrors({});
    setUploading(false);
    setUploadPct(0);
  }

  async function handleFileUpload(file) {
    if (!file) return;
    setUploading(true);
    setUploadPct(0);
    try {
      const res = await activitiesApi.uploadEvidence(file, setUploadPct);
      const rawUrl = res?.url || res?.file_url || "";
      set("url", resolveFileUrl(rawUrl));
      if (!form.evidence_info) set("evidence_info", file.name);
      toast.success("File berhasil diunggah");
    } catch (err) {
      toast.error(err.message || "Gagal mengunggah file");
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  }

  const addMut = useMutation({
    mutationFn: (data) => activitiesApi.addEvidence(activityId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activity", activityId] });
      toast.success("Bukti berhasil ditambahkan");
      reset();
      onClose();
    },
    onError: (e) => toast.error(e.message || "Gagal menambahkan bukti"),
  });

  function handleSubmit() {
    const e = {};
    if (!form.evidence_info.trim()) e.evidence_info = "Keterangan wajib diisi";
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    addMut.mutate({
      evidence_info: form.evidence_info.trim(),
      url: form.url.trim() || null,
      evidence_type: form.evidence_type || "FILE",
    });
  }

  const isSaving = addMut.isPending;

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Tambah Bukti"
      size="sm"
      footer={
        <>
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={isSaving}
            className="btn btn-ghost"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving || uploading}
            className="btn btn-primary"
          >
            {isSaving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            Tambah Bukti
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField
          label="Keterangan"
          required
          error={errors.evidence_info}
          helper="Deskripsi singkat tentang bukti ini"
        >
          <Input
            placeholder="Contoh: Foto pengambilan sampel, laporan hasil lab..."
            value={form.evidence_info}
            onChange={(e) => set("evidence_info", e.target.value)}
            error={errors.evidence_info}
            maxLength={200}
          />
        </FormField>

        <FormField label="Tipe Bukti">
          <Select
            value={form.evidence_type}
            onChange={(e) => set("evidence_type", e.target.value)}
          >
            {EVIDENCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </FormField>

        {/* URL atau upload */}
        <FormField label="File atau URL Bukti">
          {form.url ? (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success-500/8 border border-success-500/20">
              <CheckCircle2
                size={14}
                className="text-success-500 flex-shrink-0"
              />
              <span className="text-xs text-success-600 dark:text-success-400 font-mono truncate flex-1">
                {form.url}
              </span>
              <a
                href={form.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[--text-tertiary] hover:text-accent-500"
              >
                <ExternalLink size={12} />
              </a>
              <button
                type="button"
                onClick={() => set("url", "")}
                className="text-[--text-tertiary] hover:text-danger-500"
              >
                <X size={12} />
              </button>
            </div>
          ) : uploading ? (
            <div className="space-y-1.5 p-3 rounded-lg border border-primary-500/20 bg-primary-500/5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <Loader2
                    size={13}
                    className="text-primary-500 animate-spin"
                  />
                  <span className="text-[--text-primary]">Mengunggah...</span>
                </div>
                <span className="font-mono font-bold text-primary-500">
                  {uploadPct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[--bg-muted] overflow-hidden">
                <motion.div
                  className="h-full bg-primary-500 rounded-full"
                  animate={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="https://... atau URL file"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                maxLength={500}
              />
              <input
                type="file"
                ref={fileRef}
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="btn btn-glass btn-sm flex-shrink-0"
              >
                <Upload size={13} /> Upload
              </button>
            </div>
          )}
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ActivityDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const {
    data: activity,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => activitiesApi.getActivity(id),
  });

  const deleteMut = useMutation({
    mutationFn: () => activitiesApi.deleteActivity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Aktivitas berhasil dihapus");
      navigate("/activities");
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus"),
  });

  if (isLoading)
    return (
      <div className="space-y-5 max-w-3xl animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    );
  if (error || !activity)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FolderOpen size={40} className="text-[--text-tertiary]" />
        <p className="text-[--text-secondary]">Aktivitas tidak ditemukan.</p>
        <button
          onClick={() => navigate("/activities")}
          className="btn btn-ghost"
        >
          <ArrowLeft size={15} /> Kembali
        </button>
      </div>
    );

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={() => navigate("/activities")}
          className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />{" "}
          Kembali
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/activities/${id}/edit`)}
            className="btn btn-glass btn-sm"
          >
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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-success-500/10 flex items-center justify-center flex-shrink-0">
            <FolderOpen size={26} className="text-success-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-[--text-tertiary] mb-1">
              {activity.activity_number}
            </p>
            <h1 className="font-display text-xl font-bold text-[--text-primary]">
              {activity.activity_name}
            </h1>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-[--text-tertiary]">
              {activity.date && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(activity.date).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
              {activity.researcher_name && (
                <span>{activity.researcher_name}</span>
              )}
              {activity.action_type && (
                <span className="badge badge-success">
                  {activity.action_type}
                </span>
              )}
            </div>
          </div>
        </div>
        {activity.details && (
          <div className="mt-4 pt-4 border-t border-[--border]">
            <p className="text-sm text-[--text-secondary] leading-relaxed whitespace-pre-line">
              {activity.details}
            </p>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tools */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="section-title text-sm flex items-center gap-2 mb-4">
            <Wrench size={15} className="text-primary-500" />
            {t("activities.tools")}
            <span className="badge badge-primary">
              {activity.tools?.length ?? 0}
            </span>
          </h3>
          {!activity.tools?.length ? (
            <p className="text-sm text-[--text-tertiary] text-center py-4">
              Tidak ada alat yang dicatat.
            </p>
          ) : (
            <div className="space-y-2">
              {activity.tools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[--bg-subtle] border border-[--border]"
                >
                  <Wrench
                    size={14}
                    className="text-primary-500 flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-[--text-primary]">
                      {tool.tool_name}
                    </p>
                    {tool.description && (
                      <p className="text-xs text-[--text-secondary] mt-0.5">
                        {tool.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Evidences */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title text-sm flex items-center gap-2 mb-0">
              <FileStack size={15} className="text-accent-500" />
              {t("activities.evidences")}
              <span className="badge badge-accent">
                {activity.evidences?.length ?? 0}
              </span>
            </h3>
            <button
              onClick={() => setEvidenceOpen(true)}
              className="btn btn-glass btn-sm gap-1"
            >
              <Plus size={13} /> Tambah
            </button>
          </div>
          {!activity.evidences?.length ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-[--text-tertiary]">Belum ada bukti.</p>
              <button
                onClick={() => setEvidenceOpen(true)}
                className="btn btn-glass btn-sm"
              >
                <Plus size={13} /> Tambah Bukti Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.evidences.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[--bg-subtle] border border-[--border]"
                >
                  <FileStack
                    size={14}
                    className="text-accent-500 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[--text-primary] truncate">
                      {ev.evidence_info}
                    </p>
                    <p className="text-xs text-[--text-tertiary]">
                      {ev.evidence_type}
                    </p>
                  </div>
                  {ev.url && (
                    <a
                      href={resolveFileUrl(ev.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-6 h-6 rounded flex items-center justify-center text-[--text-tertiary] hover:text-accent-500 flex-shrink-0"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Modal Tambah Bukti */}
      <AddEvidenceModal
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        activityId={id}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMut.mutate()}
        title="Hapus Aktivitas"
        description={`Yakin menghapus aktivitas "${activity?.activity_name}"?`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
