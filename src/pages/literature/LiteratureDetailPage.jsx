/**
 * pages/literature/LiteratureDetailPage.jsx
 * Halaman detail untuk satu entri literatur.
 * Menampilkan metadata lengkap, abstrak, dan akses ke file/URL.
 * SEMUA field akan tetap tampil meskipun datanya null/kosong.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  FileText,
  Pencil,
  Trash2,
  ExternalLink,
  Calendar,
  Building,
  Globe,
  Tag,
  BookOpen,
  AlignLeft,
  Hash,
  Link as LinkIcon,
  FileDown,
} from "lucide-react";
import clsx from "clsx";

import { literatureApi } from "../../api/literatureApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

// ─── Helper: Get Full URL untuk File ──────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const getFullUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};

// ─── Komponen Baris Info (Selalu Tampil) ──────────────────────────────────────
function InfoRow({ icon: Icon, label, value, mono }) {
  // Jika value null atau kosong, tampilkan tanda strip (—)
  const displayValue = value || "—";
  const isEmpty = !value;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[--border] last:border-0">
      <Icon size={16} className="text-[--text-tertiary] mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[--text-tertiary] uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <p
          className={clsx(
            "text-sm",
            isEmpty ? "text-[--text-tertiary]" : "text-[--text-primary]",
            mono && !isEmpty && "font-mono",
          )}
        >
          {displayValue}
        </p>
      </div>
    </div>
  );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────
export default function LiteratureDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [deleteOpen, setDeleteOpen] = useState(false);

  // Ambil data literatur
  const {
    data: lit,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["literature", id],
    queryFn: () => literatureApi.getLiterature(id),
  });

  // Mutasi hapus
  const deleteMutation = useMutation({
    mutationFn: () => literatureApi.deleteLiterature(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["literature"] });
      toast.success("Literatur berhasil dihapus");
      navigate("/literature");
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus literatur"),
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-5 max-w-4xl animate-pulse">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  // Error / Not Found
  if (error || !lit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FileText size={40} className="text-[--text-tertiary]" />
        <p className="text-[--text-secondary]">Literatur tidak ditemukan.</p>
        <button
          onClick={() => navigate("/literature")}
          className="btn btn-ghost"
        >
          <ArrowLeft size={15} /> Kembali ke Daftar
        </button>
      </div>
    );
  }

  // Parse keywords menjadi array
  const keywordList = lit.keywords
    ? lit.keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Navigasi & Aksi ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <button
          onClick={() => navigate("/literature")}
          className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Kembali ke Daftar Literatur
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/literature/${id}/edit`)}
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

      {/* ── Header Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass rounded-3xl p-6 sm:p-8"
      >
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-accent px-2.5 py-1 text-xs">
                {lit.type || "Publikasi"}
              </span>
              <span className="text-sm font-medium text-[--text-tertiary] flex items-center gap-1.5">
                <Calendar size={14} />
                {lit.publication_date
                  ? new Date(lit.publication_date).toLocaleDateString("id-ID", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Tanggal tidak diketahui"}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[--text-primary] leading-snug">
              {lit.title || "—"}
            </h1>

            <p className="text-[--text-secondary] font-medium leading-relaxed">
              {lit.authors || "—"}
            </p>

            {/* Quick Links / Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              {lit.file_url ? (
                <a
                  href={getFullUrl(lit.file_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm gap-2"
                >
                  <FileDown size={15} />
                  Buka Dokumen
                </a>
              ) : (
                <button
                  disabled
                  className="btn btn-glass btn-sm gap-2 opacity-50 cursor-not-allowed"
                >
                  <FileDown size={15} />
                  Tidak ada file
                </button>
              )}

              {lit.url && (
                <a
                  href={getFullUrl(lit.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-glass btn-sm gap-2"
                >
                  <LinkIcon size={14} />
                  Link Jurnal
                </a>
              )}
              {lit.ncbi_link && (
                <a
                  href={getFullUrl(lit.ncbi_link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-glass btn-sm gap-2"
                >
                  <ExternalLink size={14} />
                  NCBI / PubMed
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Kolom Kiri: Abstrak & Ringkasan ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Abstrak */}
          <div className="glass rounded-2xl p-6 sm:p-8">
            <h3 className="section-title text-base mb-4 flex items-center gap-2">
              <AlignLeft size={18} className="text-primary-500" />
              Abstrak
            </h3>
            {lit.abstract ? (
              <p className="text-sm text-[--text-secondary] leading-relaxed text-justify">
                {lit.abstract}
              </p>
            ) : (
              <p className="text-sm text-[--text-tertiary] italic">
                Abstrak tidak tersedia.
              </p>
            )}
          </div>

          {/* Ringkasan Internal */}
          <div className="glass rounded-2xl p-6 sm:p-8 bg-primary-500/5 border-primary-500/20">
            <h3 className="section-title text-base mb-3 flex items-center gap-2">
              <BookOpen size={18} className="text-accent-500" />
              Ringkasan Internal
            </h3>
            {lit.summary ? (
              <p className="text-sm text-[--text-secondary] leading-relaxed">
                {lit.summary}
              </p>
            ) : (
              <p className="text-sm text-[--text-tertiary] italic">
                Tidak ada ringkasan internal.
              </p>
            )}
          </div>

          {/* Keywords */}
          <div className="glass rounded-2xl p-6">
            <h3 className="section-title text-sm mb-3 flex items-center gap-2">
              <Tag size={16} className="text-[--text-tertiary]" />
              Kata Kunci
            </h3>
            {keywordList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {keywordList.map((kw, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-lg bg-[--bg-muted] text-xs font-medium text-[--text-secondary] border border-[--border]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[--text-tertiary] italic">
                Tidak ada kata kunci.
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Kolom Kanan: Detail Publikasi ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-6"
        >
          <div className="glass rounded-2xl p-6">
            <h3 className="section-title text-base mb-2">Detail Publikasi</h3>
            <div className="flex flex-col">
              <InfoRow icon={Building} label="Penerbit" value={lit.publisher} />
              <InfoRow
                icon={Globe}
                label="Lokasi Terbit"
                value={[lit.city, lit.country].filter(Boolean).join(", ")}
              />
              <InfoRow
                icon={Hash}
                label="Volume / Issue"
                value={[
                  lit.volume && `Vol. ${lit.volume}`,
                  lit.issue && `Issue ${lit.issue}`,
                ]
                  .filter(Boolean)
                  .join(" — ")}
              />
              <InfoRow icon={LinkIcon} label="DOI" value={lit.doi} mono />
              <InfoRow icon={BookOpen} label="ISSN" value={lit.issn} mono />
              <InfoRow icon={BookOpen} label="ISBN" value={lit.isbn} mono />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Dialog Konfirmasi Hapus ── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Hapus Literatur"
        description={`Yakin ingin menghapus literatur "${lit?.title}"? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
