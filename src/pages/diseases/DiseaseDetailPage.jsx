/**
 * pages/diseases/DiseaseDetailPage.jsx
 * Detail penyakit: info dasar + daftar etnis berisiko + daftar mutasi terkait
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  HeartPulse,
  Pencil,
  Trash2,
  Globe,
  Microscope,
  Hash,
} from "lucide-react";
import clsx from "clsx";

import { diseasesApi } from "../../api/diseasesApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function DiseaseDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: disease,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["disease", id],
    queryFn: () => diseasesApi.getDisease(id),
  });

  const deleteMut = useMutation({
    mutationFn: () => diseasesApi.deleteDisease(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diseases"] });
      toast.success("Penyakit berhasil dihapus");
      navigate("/diseases");
    },
    onError: (e) =>
      toast.error(e.message || "Gagal menghapus — masih ada mutasi terhubung"),
  });

  if (isLoading)
    return (
      <div className="space-y-5 max-w-3xl animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    );
  if (error || !disease)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <HeartPulse size={40} className="text-[--text-tertiary]" />
        <p className="text-[--text-secondary]">Penyakit tidak ditemukan.</p>
        <button onClick={() => navigate("/diseases")} className="btn btn-ghost">
          <ArrowLeft size={15} />
          Kembali
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
          onClick={() => navigate("/diseases")}
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
            onClick={() => navigate(`/diseases/${id}/edit`)}
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
          <div className="w-14 h-14 rounded-2xl bg-warning-400/15 flex items-center justify-center flex-shrink-0">
            <HeartPulse size={26} className="text-warning-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold text-[--text-primary]">
                {disease.name}
              </h1>
              {disease.icd_code && (
                <span className="badge badge-warning font-mono">
                  {disease.icd_code}
                </span>
              )}
            </div>
            {disease.description && (
              <p className="text-sm text-[--text-secondary] leading-relaxed mt-1">
                {disease.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-primary-500">
                {disease.at_risk_ethnicities?.length ?? 0}
              </p>
              <p className="text-xs text-[--text-tertiary]">etnis berisiko</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-danger-500">
                {disease.mutations?.length ?? 0}
              </p>
              <p className="text-xs text-[--text-tertiary]">mutasi</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Etnis berisiko */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="glass rounded-2xl p-5"
      >
        <h3 className="section-title text-sm flex items-center gap-2 mb-4">
          <Globe size={15} className="text-primary-500" />
          {t("diseases.atRiskEthnicities")}{" "}
          <span className="badge badge-primary">
            {disease.at_risk_ethnicities?.length ?? 0}
          </span>
        </h3>
        {!disease.at_risk_ethnicities?.length ? (
          <p className="text-sm text-[--text-tertiary] text-center py-4">
            Belum ada etnis berisiko yang terdaftar.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {disease.at_risk_ethnicities.map((e) => (
              <button
                key={e.id}
                onClick={() => navigate(`/ethnicities`)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-500/8 border border-primary-500/15 hover:bg-primary-500/15 transition-colors text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-500 flex-shrink-0">
                  {e.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400">
                    {e.name}
                  </p>
                  {e.region_distribution && (
                    <p className="text-xs text-[--text-tertiary]">
                      {e.region_distribution}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Mutasi terkait */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.11 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title text-sm flex items-center gap-2 mb-0">
            <Microscope size={15} className="text-danger-500" />
            {t("diseases.relatedMutations")}{" "}
            <span className="badge badge-danger">
              {disease.mutations?.length ?? 0}
            </span>
          </h3>
          <button
            onClick={() => navigate("/mutations/new")}
            className="btn btn-ghost btn-sm"
          >
            <Microscope size={13} /> Tambah
          </button>
        </div>
        {!disease.mutations?.length ? (
          <p className="text-sm text-[--text-tertiary] text-center py-4">
            Belum ada mutasi terkait penyakit ini.
          </p>
        ) : (
          <div className="space-y-2">
            {disease.mutations.map((m) => (
              <div
                key={m.id}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-[--bg-subtle] border border-[--border]"
              >
                <div className="w-8 h-8 rounded-lg bg-danger-500/10 flex items-center justify-center flex-shrink-0">
                  <Microscope size={14} className="text-danger-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {m.code && (
                      <span className="font-mono text-xs font-bold text-[--text-primary]">
                        {m.code}
                      </span>
                    )}
                    {m.mutation_type && (
                      <span className="badge badge-danger text-[10px]">
                        {m.mutation_type}
                      </span>
                    )}
                    {m.position && (
                      <span className="text-xs text-[--text-tertiary]">
                        Pos. {m.position?.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {m.normal_base && m.mutation_base && (
                    <p className="text-xs font-mono text-[--text-secondary] mt-0.5">
                      {m.normal_base} → {m.mutation_base}
                    </p>
                  )}
                  {m.description && (
                    <p className="text-xs text-[--text-tertiary] mt-0.5 line-clamp-1">
                      {m.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMut.mutate()}
        title="Hapus Penyakit"
        description={`Yakin menghapus "${disease?.name}"? Akan gagal jika masih ada mutasi terhubung.`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
