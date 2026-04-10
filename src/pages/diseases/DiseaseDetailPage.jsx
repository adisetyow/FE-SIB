import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  Activity,
  Globe,
  HeartPulse,
  MapPin,
} from "lucide-react";

import { diseasesApi } from "../../api/diseasesApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function DiseaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [disease, setDisease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const fetchDisease = async () => {
      try {
        const res = await diseasesApi.getDisease(id);
        setDisease(res);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchDisease();
  }, [id]);

  // Mutation Hapus
  const deleteMutation = useMutation({
    mutationFn: () => diseasesApi.deleteDisease(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diseases"] });
      toast.success("Penyakit berhasil dihapus");
      navigate("/diseases");
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          "Gagal menghapus. Pastikan tidak ada mutasi yang terhubung.",
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

  if (error || !disease) {
    return (
      <div className="empty-state py-12 glass rounded-2xl">
        <Activity size={40} className="text-rose-400 mb-2" />
        <h2 className="text-lg font-bold text-[--text-primary]">
          Data Tidak Ditemukan
        </h2>
        <p className="text-[--text-secondary] mt-1">
          Penyakit yang Anda cari tidak ada atau terjadi kesalahan server.
        </p>
        <button
          onClick={() => navigate("/diseases")}
          className="btn btn-primary mt-4"
        >
          Kembali ke Daftar
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Navigation Top & Actions ── */}
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
          />
          Kembali ke Daftar Penyakit
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/diseases/${id}/edit`)}
            className="btn btn-glass btn-sm"
          >
            <Pencil size={14} /> Ubah Data
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="btn btn-danger btn-sm"
          >
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      </motion.div>

      {/* ── Profile Header Banner ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-2xl overflow-hidden border border-[--border]"
      >
        <div className="px-6 py-8 sm:px-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center border-b border-[--border]">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 shadow-lg flex items-center justify-center shrink-0">
            <HeartPulse size={40} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-[--text-primary] leading-tight">
                {disease.name}
              </h1>
              {disease.icd_code && (
                <span className="badge badge-accent font-mono text-sm px-2.5 py-1">
                  ICD: {disease.icd_code}
                </span>
              )}
            </div>
            <p className="text-sm text-[--text-secondary] max-w-3xl leading-relaxed">
              {disease.description ||
                "Tidak ada deskripsi medis yang tersedia untuk penyakit ini."}
            </p>
          </div>
        </div>

        {/* Etnis Berisiko */}
        <div className="p-6 sm:p-8 bg-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[--text-primary] uppercase tracking-wider">
                Etnis Berisiko Tinggi
              </h3>
              <p className="text-xs text-[--text-tertiary]">
                Kelompok etnis yang memiliki prevalensi tinggi.
              </p>
            </div>
          </div>

          {!disease.at_risk_ethnicities ||
          disease.at_risk_ethnicities.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[--border] rounded-xl bg-[--bg-subtle]">
              <Globe
                size={32}
                className="mx-auto text-[--text-tertiary] mb-2 opacity-50"
              />
              <p className="text-sm font-medium text-[--text-secondary]">
                Belum Ada Data Etnis
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {disease.at_risk_ethnicities.map((eth) => (
                <div
                  key={eth.id}
                  className="bg-white/40 dark:bg-slate-800/40 border border-[--border] p-4 rounded-xl flex flex-col gap-1.5 hover:border-primary-500/30 hover:bg-[--bg-muted] transition-colors"
                >
                  <span className="font-bold text-[--text-primary] text-base">
                    {eth.name}
                  </span>
                  {eth.region_distribution ? (
                    <span className="text-xs text-[--text-secondary] flex items-start gap-1.5 mt-1">
                      <MapPin
                        size={14}
                        className="text-[--text-tertiary] shrink-0 mt-0.5"
                      />
                      <span className="leading-snug">
                        {eth.region_distribution}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-[--text-tertiary] italic mt-1">
                      Wilayah tidak terdata
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Hapus Penyakit"
        description={`Yakin ingin menghapus penyakit "${disease?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
