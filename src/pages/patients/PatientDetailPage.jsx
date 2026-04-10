import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; // Ganti Link jadi useNavigate untuk consistency
import { useTranslation } from "react-i18next";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Pencil, // Diganti dari Edit agar seragam dengan Sequences
  Trash2, // Tambahan tombol hapus
  Activity,
  MapPin,
  User,
  Hash,
  CalendarDays,
} from "lucide-react";
import { patientsApi } from "../../api/patientsApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog"; // Gunakan ini untuk hapus

export default function PatientDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false); // State untuk modal hapus

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const res = await patientsApi.getPatient(id);
        setPatient(res);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPatient();
  }, [id]);

  // Mutation Hapus
  const deleteMutation = useMutation({
    mutationFn: () => patientsApi.deletePatient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success(t("patients.deleteSuccess", "Pasien berhasil dihapus"));
      navigate("/patients");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          "Gagal menghapus pasien. Data mungkin terhubung dengan mutasi.",
      );
    },
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="empty-state py-12 glass rounded-2xl">
        <Activity size={40} className="text-rose-400 mb-2" />
        <h2 className="text-lg font-bold text-[--text-primary]">
          Data Tidak Ditemukan
        </h2>
        <p className="text-[--text-secondary]">
          Pasien yang Anda cari tidak ada atau terjadi kesalahan.
        </p>
        <button
          onClick={() => navigate("/patients")}
          className="btn btn-primary mt-4"
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  const calculateAge = (birthDate) => {
    if (!birthDate) return "-";
    const today = new Date();
    const birth = new Date(birthDate);
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        0,
      ).getDate();
      days += prevMonth;
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years} tahun ${months} bulan ${days} hari`;
  };

  return (
    <div className="w-full space-y-6">
      {/* ── DIPERBARUI: Navigation Top & Actions (Seragam dengan Sequences) ── */}
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
          />
          {t("common.back", "Kembali ke Daftar Pasien")}
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/patients/${id}/edit`)}
            className="btn btn-glass btn-sm"
          >
            <Pencil size={14} /> {t("common.edit", "Ubah Data")}
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="btn btn-danger btn-sm"
          >
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      </motion.div>

      {/* ── Profile Header Banner (TIDAK DIUBAH, SESUAI PERMINTAAN) ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl overflow-hidden border border-[--border]"
      >
        <div className="h-24 sm:h-32 bg-gradient-to-r from-primary-500/20 via-accent-500/20 to-emerald-500/20 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay"></div>
        </div>

        <div className="px-6 pb-6 sm:px-8 sm:pb-8 relative">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-12 sm:-mt-16 mb-6">
            {/* Avatar */}
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-white dark:bg-slate-800 p-2 shadow-lg ring-1 ring-[--border]">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                <User
                  size={48}
                  className="text-slate-400 dark:text-slate-500"
                />
              </div>
            </div>

            {/* Main Info */}
            <div className="flex-1 pb-1">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-[--text-primary] leading-tight">
                {patient.full_name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[--text-secondary]">
                {/* NIK */}
                <div className="flex items-center gap-1.5">
                  <Hash size={14} className="text-[--text-tertiary]" />
                  <span className="text-[--text-tertiary]">NIK</span>
                  <span className="font-medium">{patient.nik}</span>
                </div>
                <span className="text-[--border]">•</span>
                {/* Tanggal lahir */}
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-[--text-tertiary]" />
                  <span>
                    {patient.date_of_birth
                      ? new Date(patient.date_of_birth).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "long", year: "numeric" },
                        )
                      : "-"}
                  </span>
                </div>
                <span className="text-[--border]">•</span>
                {/* Umur */}
                <div className="flex items-center gap-1.5">
                  <Activity size={14} className="text-[--text-tertiary]" />
                  <span className="font-medium">
                    {calculateAge(patient.date_of_birth)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <span
                className={`badge px-3 py-1 text-sm justify-center ${patient.gender === "MALE" ? "bg-accent-500/10 text-accent-600" : "bg-primary-500/10 text-primary-600"}`}
              >
                {patient.gender === "MALE"
                  ? t("patients.male", "Laki-laki")
                  : patient.gender === "FEMALE"
                    ? t("patients.female", "Perempuan")
                    : "Gender -"}
              </span>
              <span className="badge px-3 py-1 text-sm bg-[--bg-muted] text-[--text-secondary] justify-center">
                {patient.ethnicity_name || "Etnis belum diatur"}
              </span>
            </div>
          </div>

          <hr className="border-[--border] mb-6" />

          {/* Demographics Detail (TIDAK DIUBAH) */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold text-[--text-tertiary] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MapPin size={14} /> Demografi & Lokasi
                </h3>
                <div className="bg-[--bg-subtle] rounded-xl p-4 border border-[--border] space-y-3">
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-[--text-secondary]">
                      Tempat Kelahiran
                    </span>
                    <span className="col-span-2 font-medium text-[--text-primary]">
                      {patient.place_of_birth || "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-[--text-secondary]">Jalan</span>
                    <span className="col-span-2 font-medium text-[--text-primary]">
                      {patient.address_street || "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-[--text-secondary]">Kecamatan</span>
                    <span className="col-span-2 font-medium text-[--text-primary]">
                      {patient.address_district || "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-[--text-secondary]">Kota / Kab.</span>
                    <span className="col-span-2 font-medium text-[--text-primary]">
                      {patient.address_city || "-"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 text-sm">
                    <span className="text-[--text-secondary]">Provinsi</span>
                    <span className="col-span-2 font-medium text-[--text-primary]">
                      {patient.address_province || "-"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Dialog Konfirmasi Hapus ── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Hapus Pasien"
        description={`Yakin ingin menghapus pasien "${patient?.full_name}"? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
