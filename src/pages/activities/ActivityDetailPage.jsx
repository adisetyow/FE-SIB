/**
 * pages/activities/ActivityDetailPage.jsx
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
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
  Hash,
  Tag,
} from "lucide-react";
import clsx from "clsx";

import { activitiesApi } from "../../api/activitiesApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[--border] last:border-0">
      <div className="w-7 h-7 rounded-lg bg-[--bg-muted] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-[--text-tertiary]" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[--text-tertiary]">
          {label}
        </p>
        <p className="text-sm text-[--text-primary] mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function ActivityDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

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
          <ArrowLeft size={15} />
          Kembali
        </button>
      </div>
    );

  return (
    <div className="space-y-5 max-w-3xl">
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
          />
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
                <span>
                  <Calendar size={12} className="inline mr-1" />
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
            {t("activities.tools")}{" "}
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
          <h3 className="section-title text-sm flex items-center gap-2 mb-4">
            <FileStack size={15} className="text-accent-500" />
            {t("activities.evidences")}{" "}
            <span className="badge badge-accent">
              {activity.evidences?.length ?? 0}
            </span>
          </h3>
          {!activity.evidences?.length ? (
            <p className="text-sm text-[--text-tertiary] text-center py-4">
              Tidak ada bukti yang dicatat.
            </p>
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
                      href={ev.url}
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
