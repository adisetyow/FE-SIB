/**
 * pages/mutations/MutationDetailPage.jsx
 * Detail satu mutasi: info lengkap, sekuens asal, penyakit terkait, pasien.
 * GET /api/v1/mutations/:id → MutationResponse
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Microscope,
  Pencil,
  Trash2,
  Dna,
  HeartPulse,
  Users,
  ArrowRight,
} from "lucide-react";
import clsx from "clsx";

import { mutationsApi } from "../../api/mutationsApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const BASE_COLOR = {
  A: "text-blue-500",
  T: "text-green-500",
  G: "text-red-500",
  C: "text-yellow-500",
  U: "text-purple-500",
};

const TYPE_BADGE = {
  SNP: "badge-danger",
  INSERTION: "badge-warning",
  DELETION: "badge-accent",
  INDEL: "badge-accent",
  FRAMESHIFT: "badge-danger",
  MISSENSE: "badge-warning",
  NONSENSE: "badge-danger",
  SILENT: "badge-muted",
  SPLICE: "badge-warning",
  CNV: "badge-primary",
};

function InfoRow({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[--border] last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-[--text-tertiary] w-28 flex-shrink-0 mt-0.5">
        {label}
      </span>
      <span
        className={clsx(
          "text-sm text-[--text-primary] flex-1",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function InfoCard({ title, icon: Icon, color, children }) {
  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-[--text-secondary] uppercase tracking-wider flex items-center gap-2 mb-4">
        <Icon size={14} className={color} />
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function MutationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: mut,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["mutation", id],
    queryFn: () => mutationsApi.getMutation(id),
  });

  const delMut = useMutation({
    mutationFn: () => mutationsApi.deleteMutation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutations"] });
      toast.success("Mutasi dihapus");
      navigate("/mutations");
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
  if (error || !mut)
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Microscope size={40} className="text-[--text-tertiary]" />
        <p className="text-[--text-secondary]">Mutasi tidak ditemukan.</p>
        <button
          onClick={() => navigate("/mutations")}
          className="btn btn-ghost"
        >
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
          onClick={() => navigate("/mutations")}
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
            onClick={() => navigate(`/mutations/${id}/edit`)}
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
          <div className="w-14 h-14 rounded-2xl bg-danger-500/10 flex items-center justify-center flex-shrink-0">
            <Microscope size={26} className="text-danger-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h1 className=" text-xl font-bold font-mono text-[--text-primary]">
                {mut.code || `Mutasi #${mut.id}`}
              </h1>
              {mut.mutation_type && (
                <span
                  className={clsx(
                    "badge",
                    TYPE_BADGE[mut.mutation_type] || "badge-muted",
                  )}
                >
                  {mut.mutation_type}
                </span>
              )}
            </div>

            {/* Visualisasi perubahan basa */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[--bg-subtle] border border-[--border] w-fit">
              <div className="text-center">
                <p className="text-xs text-[--text-tertiary] mb-1">Normal</p>
                <span
                  className={clsx(
                    "text-3xl font-black font-mono",
                    BASE_COLOR[mut.normal_base] || "text-[--text-secondary]",
                  )}
                >
                  {mut.normal_base || "—"}
                </span>
              </div>
              <div className="flex flex-col items-center">
                <ArrowRight size={18} className="text-[--text-tertiary]" />
                <span className="text-[10px] font-mono text-[--text-tertiary] mt-0.5">
                  pos.{mut.position?.toLocaleString()}
                </span>
              </div>
              <div className="text-center">
                <p className="text-xs text-[--text-tertiary] mb-1">Mutan</p>
                <span
                  className={clsx(
                    "text-3xl font-black font-mono",
                    BASE_COLOR[mut.mutation_base] || "text-[--text-secondary]",
                  )}
                >
                  {mut.mutation_base || "—"}
                </span>
              </div>
              {mut.normal_base &&
                mut.mutation_base &&
                mut.normal_base !== mut.mutation_base && (
                  <span className="badge badge-danger ml-2">
                    Mutasi terdeteksi
                  </span>
                )}
            </div>

            {mut.description && (
              <p className="text-sm text-[--text-secondary] mt-3 leading-relaxed">
                {mut.description}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <InfoCard
            title="Detail Mutasi"
            icon={Microscope}
            color="text-danger-500"
          >
            <InfoRow label="Tipe" value={mut.mutation_type} />
            <InfoRow
              label="Posisi"
              value={mut.position?.toLocaleString()}
              mono
            />
            <InfoRow label="Basa Normal" value={mut.normal_base} mono />
            <InfoRow label="Basa Mutan" value={mut.mutation_base} mono />
            <InfoRow label="Kode" value={mut.code} mono />
          </InfoCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <InfoCard title="Sekuens Asal" icon={Dna} color="text-primary-500">
            {mut.sequence_id ? (
              <>
                <InfoRow
                  label="Nama"
                  value={mut.sequence_name || `ID: ${mut.sequence_id}`}
                />
                <button
                  onClick={() => navigate(`/sequences/${mut.sequence_id}`)}
                  className="mt-3 btn btn-glass btn-sm w-full"
                >
                  <Dna size={13} /> Lihat Sekuens
                </button>
              </>
            ) : (
              <p className="text-sm text-[--text-tertiary] py-2">
                Tidak ada sekuens terkait.
              </p>
            )}
          </InfoCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <InfoCard
            title="Penyakit Terkait"
            icon={HeartPulse}
            color="text-warning-500"
          >
            {mut.disease_id ? (
              <>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {mut.disease_name && (
                    <span className="badge badge-warning">
                      {mut.disease_name}
                    </span>
                  )}
                  {mut.disease_icd_code && (
                    <span className="font-mono text-xs text-[--text-tertiary]">
                      {mut.disease_icd_code}
                    </span>
                  )}
                </div>
                {mut.disease_description && (
                  <p className="text-xs text-[--text-secondary] mb-3 leading-relaxed">
                    {mut.disease_description}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/diseases/${mut.disease_id}`)}
                  className="btn btn-glass btn-sm w-full"
                >
                  <HeartPulse size={13} /> Lihat Penyakit
                </button>
              </>
            ) : (
              <p className="text-sm text-[--text-tertiary] py-2">
                Tidak ada penyakit terkait.
              </p>
            )}
          </InfoCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <InfoCard title="Pasien" icon={Users} color="text-accent-500">
            {mut.patient_id || mut.patient ? (
              <>
                <InfoRow label="Nama" value={mut.patient?.full_name} />
                <InfoRow label="NIK" value={mut.patient?.nik} mono />
                <InfoRow label="Etnis" value={mut.patient?.ethnicity_name} />
                <button
                  onClick={() =>
                    navigate(`/patients/${mut.patient_id || mut.patient?.id}`)
                  }
                  className="mt-3 btn btn-glass btn-sm w-full"
                >
                  <Users size={13} /> Lihat Pasien
                </button>
              </>
            ) : (
              <p className="text-sm text-[--text-tertiary] py-2">
                Tidak ada data pasien.
              </p>
            )}
          </InfoCard>
        </motion.div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => delMut.mutate()}
        title="Hapus Mutasi"
        description={`Yakin menghapus "${mut?.code || "#" + mut?.id}"?`}
        isLoading={delMut.isPending}
      />
    </div>
  );
}
