/**
 * pages/patients/PatientDetailPage.jsx
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Users,
  Pencil,
  Trash2,
  Dna,
  MapPin,
  Calendar,
  Hash,
  Globe,
} from "lucide-react";
import clsx from "clsx";

import { patientsApi } from "../../api/patientsApi";
import { geneticsApi } from "../../api/geneticsApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const GENDER_LABEL = { MALE: "Laki-laki", FEMALE: "Perempuan" };
const GENDER_COLOR = { MALE: "badge-accent", FEMALE: "badge-primary" };

function InfoRow({ icon: Icon, label, value, mono }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[--border] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-[--bg-muted] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-[--text-tertiary]" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-[--text-tertiary]">
          {label}
        </p>
        <p
          className={clsx(
            "text-sm text-[--text-primary] mt-0.5",
            mono && "font-mono",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    data: patient,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientsApi.getPatient(id),
  });

  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences-patient", id],
    queryFn: () => geneticsApi.listSequences({ patient_id: id, limit: 100 }),
    enabled: !!id,
  });

  const deleteMut = useMutation({
    mutationFn: () => patientsApi.deletePatient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success(t("patients.deleteSuccess"));
      navigate("/patients");
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus"),
  });

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-3xl animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="skeleton h-48 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Users size={40} className="text-[--text-tertiary]" />
        <p className="text-[--text-secondary]">Pasien tidak ditemukan.</p>
        <button onClick={() => navigate("/patients")} className="btn btn-ghost">
          <ArrowLeft size={15} /> Kembali
        </button>
      </div>
    );
  }

  function calcAge(dob) {
    if (!dob) return null;
    return Math.floor(
      (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25),
    );
  }

  const addressParts = [
    patient.address_street,
    patient.address_district,
    patient.address_city,
    patient.address_province,
  ].filter(Boolean);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={() => navigate("/patients")}
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
            onClick={() => navigate(`/patients/${id}/edit`)}
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
          <div
            className={clsx(
              "w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-display font-bold flex-shrink-0",
              patient.gender === "FEMALE"
                ? "bg-gradient-to-br from-pink-400 to-primary-500"
                : "bg-gradient-to-br from-accent-400 to-accent-600",
            )}
          >
            {patient.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold text-[--text-primary]">
                {patient.full_name}
              </h1>
              {patient.gender && (
                <span className={clsx("badge", GENDER_COLOR[patient.gender])}>
                  {GENDER_LABEL[patient.gender]}
                </span>
              )}
              {patient.ethnicity_name && (
                <span className="badge badge-muted">
                  {patient.ethnicity_name}
                </span>
              )}
            </div>
            <p className="text-sm font-mono text-[--text-tertiary]">
              NIK: {patient.nik}
            </p>
            {patient.date_of_birth && (
              <p className="text-sm text-[--text-secondary] mt-0.5">
                {calcAge(patient.date_of_birth)} tahun ·{" "}
                {new Date(patient.date_of_birth).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Info grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="section-title text-sm mb-3">Data Kependudukan</h3>
          <InfoRow icon={Hash} label="NIK" value={patient.nik} mono />
          <InfoRow
            icon={Calendar}
            label="Tempat Lahir"
            value={patient.place_of_birth}
          />
          <InfoRow
            icon={Calendar}
            label="Tanggal Lahir"
            value={
              patient.date_of_birth
                ? new Date(patient.date_of_birth).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : null
            }
          />
          <InfoRow icon={Globe} label="Etnis" value={patient.ethnicity_name} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <h3 className="section-title text-sm mb-3">Alamat</h3>
          {addressParts.length > 0 ? (
            <InfoRow
              icon={MapPin}
              label="Alamat Lengkap"
              value={addressParts.join(", ")}
            />
          ) : (
            <p className="text-sm text-[--text-tertiary]">
              Alamat belum diisi.
            </p>
          )}
        </motion.div>
      </div>

      {/* Sekuens terkait */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="glass rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-title text-sm flex items-center gap-2 mb-0">
            <Dna size={15} className="text-primary-500" /> Sekuens Genetik
            Terkait
            <span className="badge badge-primary">{sequences.length}</span>
          </h3>
          <button
            onClick={() => navigate("/sequences/new")}
            className="btn btn-ghost btn-sm"
          >
            <Dna size={13} /> Tambah Sekuens
          </button>
        </div>
        {sequences.length === 0 ? (
          <p className="text-sm text-[--text-tertiary] text-center py-6">
            Belum ada sekuens genetik untuk pasien ini.
          </p>
        ) : (
          <div className="space-y-2">
            {sequences.map((seq) => (
              <button
                key={seq.id}
                onClick={() => navigate(`/sequences/${seq.id}`)}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-[--bg-muted] transition-colors text-left group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Dna size={14} className="text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[--text-primary] truncate">
                    {seq.name}
                  </p>
                  <p className="text-xs text-[--text-tertiary]">
                    {seq.seq_type} · {seq.sequence_length?.toLocaleString()} bp
                  </p>
                </div>
                <span
                  className={clsx(
                    "badge",
                    seq.seq_type === "DNA"
                      ? "badge-primary"
                      : seq.seq_type === "RNA"
                        ? "badge-accent"
                        : "badge-warning",
                  )}
                >
                  {seq.seq_type}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMut.mutate()}
        title="Hapus Pasien"
        description={`Yakin menghapus "${patient?.full_name}"? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
