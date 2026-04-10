/**
 * pages/genetics/SequenceDetailPage.jsx
 * Halaman detail satu genetic sequence:
 * - Info lengkap sequence (metadata, sequence data dengan wrap)
 * - Status pemrosesan (PENDING/PROCESSED/FAILED) ditampilkan di sini
 * - Daftar mutasi yang terkait
 * - Daftar protein functions
 * - Tombol Edit (buka modal edit) & Delete
 * - Back navigation
 *
 * Perubahan:
 * - status_processed ditampilkan di header card dengan penjelasan kontekstual
 * - Tab Mutasi sekarang menampilkan count yang benar (dari API mutations)
 * - Edit navigates ke /sequences/:id?edit=1 ATAU buka modal — tergantung preferensi
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Dna,
  Pencil,
  Trash2,
  Copy,
  Check,
  Microscope,
  Layers,
  Activity,
  Info,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import clsx from "clsx";

import { geneticsApi } from "../../api/geneticsApi";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

// ─── Badge helpers ────────────────────────────────────────────────────────────
const SEQ_TYPE_COLOR = {
  DNA: "badge-primary",
  RNA: "badge-accent",
  PROTEIN: "badge-warning",
};

// Status badge dengan icon dan penjelasan kontekstual
const STATUS_CONFIG = {
  PENDING: {
    badge: "badge-warning",
    icon: Clock,
    label: "Pending",
    desc: "Sekuens sudah tersimpan dan sedang menunggu antrian analisis oleh sistem.",
  },
  PROCESSED: {
    badge: "badge-success",
    icon: CheckCircle2,
    label: "Processed",
    desc: "Sekuens telah berhasil dianalisis. Data mutasi sudah tersedia.",
  },
  FAILED: {
    badge: "badge-danger",
    icon: XCircle,
    label: "Failed",
    desc: "Analisis gagal. Kemungkinan format sekuens tidak valid atau terjadi kesalahan sistem.",
  },
};

// ─── Status Card ──────────────────────────────────────────────────────────────
function StatusCard({ status }) {
  if (!status) return null;
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-xl px-4 py-3 border",
        status === "PENDING" && "bg-amber-500/5 border-amber-500/20",
        status === "PROCESSED" && "bg-emerald-500/5 border-emerald-500/20",
        status === "FAILED" && "bg-red-500/5 border-red-500/20",
      )}
    >
      <Icon
        size={16}
        className={clsx(
          "mt-0.5 flex-shrink-0",
          status === "PENDING" && "text-amber-500",
          status === "PROCESSED" && "text-emerald-500",
          status === "FAILED" && "text-red-500",
        )}
      />
      <div>
        <div className="flex items-center gap-2">
          <span className={clsx("badge text-xs", cfg.badge)}>{cfg.label}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[--text-tertiary]">
            Status Pemrosesan
          </span>
        </div>
        <p className="text-xs text-[--text-secondary] mt-0.5 leading-relaxed">
          {cfg.desc}
        </p>
      </div>
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, mono }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[--border] last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-[--text-tertiary] flex-shrink-0 min-w-[140px]">
        {label}
      </span>
      <span
        className={clsx(
          "text-sm text-[--text-primary] text-right",
          mono && "font-mono",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Sequence Viewer ──────────────────────────────────────────────────────────
function SequenceViewer({ sequence, seqType }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_LEN = 600;
  const isLong = sequence?.length > PREVIEW_LEN;

  const colorize = (seq, type) => {
    if (!seq) return "";
    const colors =
      type === "PROTEIN"
        ? {
            A: "#00bfbf",
            G: "#22c55e",
            V: "#2d6cff",
            L: "#f59e0b",
            I: "#8b5cf6",
            P: "#ef4444",
            F: "#06b6d4",
          }
        : {
            A: "#2d6cff",
            T: "#22c55e",
            C: "#f59e0b",
            G: "#ef4444",
            U: "#8b5cf6",
          };
    return [...seq]
      .map((ch) => {
        const color = colors[ch.toUpperCase()] || "var(--text-secondary)";
        return `<span style="color:${color}">${ch}</span>`;
      })
      .join("");
  };

  function handleCopy() {
    navigator.clipboard.writeText(sequence || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const display =
    isLong && !expanded ? sequence.slice(0, PREVIEW_LEN) + "..." : sequence;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[--text-tertiary]">
          Sequence Data ({sequence?.length?.toLocaleString()} bp)
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-[--text-secondary] hover:text-primary-500 transition-colors"
        >
          {copied ? (
            <Check size={13} className="text-success-500" />
          ) : (
            <Copy size={13} />
          )}
          {copied ? "Disalin!" : "Salin"}
        </button>
      </div>
      <div
        className="relative rounded-xl border border-[--border] p-4 overflow-hidden"
        style={{ background: "var(--bg-subtle)" }}
      >
        <pre
          className="font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-[--text-secondary]"
          dangerouslySetInnerHTML={{ __html: colorize(display, seqType) }}
        />
        {isLong && (
          <div
            className={clsx(
              "absolute bottom-0 left-0 right-0 text-center pb-2 pt-8",
              !expanded && "bg-gradient-to-t from-[--bg-subtle] to-transparent",
            )}
          >
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-primary-500 hover:underline font-medium"
            >
              {expanded
                ? "Sembunyikan ↑"
                : `Tampilkan semua (${sequence.length.toLocaleString()} karakter) ↓`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabBtn({ label, icon: Icon, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 flex-shrink-0",
        active
          ? "bg-primary-500/15 text-primary-500"
          : "text-[--text-secondary] hover:bg-[--bg-muted] hover:text-[--text-primary]",
      )}
    >
      <Icon size={15} />
      {label}
      {count !== undefined && (
        <span
          className={clsx(
            "text-xs px-1.5 py-0.5 rounded-full font-semibold",
            active
              ? "bg-primary-500/20 text-primary-500"
              : "bg-[--bg-muted] text-[--text-tertiary]",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Detail Page ──────────────────────────────────────────────────────────────
export default function SequenceDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("info");
  const [deleteOpen, setDeleteOpen] = useState(false);

  // ── Query: sequence detail ─────────────────────────────────────────────────
  const {
    data: seq,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sequence", id],
    queryFn: () => geneticsApi.getSequence(id),
  });

  // ── Query: mutations untuk sequence ini (untuk count badge tab) ────────────
  // Menggunakan filter sequence_id dari API mutations
  const { data: mutations = [] } = useQuery({
    queryKey: ["mutations", { sequence_id: id }],
    queryFn: () =>
      geneticsApi.listMutations
        ? geneticsApi.listMutations({ sequence_id: Number(id), limit: 1000 })
        : Promise.resolve([]),
    enabled: !!id,
  });

  // ── Mutation: delete ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => geneticsApi.deleteSequence(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sequences"] });
      toast.success("Sekuens berhasil dihapus");
      navigate("/sequences");
    },
    onError: (err) => toast.error(err.message || "Gagal menghapus"),
  });

  // ── Loading & error states ─────────────────────────────────────────────────
  if (isLoading) return <DetailSkeleton />;

  if (error || !seq) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Dna size={40} className="text-[--text-tertiary]" />
        <p className="text-[--text-secondary]">Sekuens tidak ditemukan.</p>
        <button
          onClick={() => navigate("/sequences")}
          className="btn btn-ghost"
        >
          <ArrowLeft size={15} /> Kembali
        </button>
      </div>
    );
  }

  const proteinFnCount = seq.protein_functions?.length ?? 0;
  const mutationCount = mutations.length;

  const tabs = [
    { key: "info", label: "Informasi", icon: Info },
    {
      key: "mutations",
      label: "Mutasi",
      icon: Microscope,
      // Count dari API mutations (bukan protein_functions — itu bug di versi lama)
      count: mutationCount,
    },
    {
      key: "protein",
      label: "Protein Functions",
      icon: Layers,
      count: proteinFnCount,
    },
  ];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* ── Back + Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <button
          onClick={() => navigate("/sequences")}
          className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
          Kembali ke Daftar Sekuens
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/sequences/${id}/edit`)}
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
        className="glass rounded-2xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center flex-shrink-0 shadow-glow-primary">
            <Dna size={26} className="text-white" />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display text-2xl font-bold text-[--text-primary] truncate">
                {seq.name}
              </h1>
              <span
                className={clsx(
                  "badge",
                  SEQ_TYPE_COLOR[seq.seq_type] || "badge-muted",
                )}
              >
                {seq.seq_type}
              </span>
            </div>
            {seq.accession_id && (
              <p className="text-sm font-mono text-[--text-secondary]">
                {seq.accession_id}
              </p>
            )}
            {seq.full_name && (
              <p className="text-sm text-[--text-secondary] mt-0.5">
                {seq.full_name}
              </p>
            )}
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 sm:flex-col sm:items-end text-right">
            {seq.gene_symbol && (
              <div>
                <p className="text-[11px] text-[--text-tertiary] uppercase tracking-wider">
                  Gene
                </p>
                <p className="font-mono text-sm font-bold text-accent-500">
                  {seq.gene_symbol}
                </p>
              </div>
            )}
            {seq.chromosome && (
              <div>
                <p className="text-[11px] text-[--text-tertiary] uppercase tracking-wider">
                  Chromosome
                </p>
                <p className="font-mono text-sm font-bold text-[--text-primary]">
                  Chr {seq.chromosome}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] text-[--text-tertiary] uppercase tracking-wider">
                Created
              </p>
              <p className="text-xs text-[--text-secondary]">
                {seq.created_at
                  ? new Date(seq.created_at).toLocaleDateString("id-ID")
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {seq.description && (
          <p className="mt-4 text-sm text-[--text-secondary] leading-relaxed border-t border-[--border] pt-4">
            {seq.description}
          </p>
        )}

        {/* Status card — ditampilkan di detail, bukan di list */}
        {seq.status_processed && (
          <div className="mt-4 border-t border-[--border] pt-4">
            <StatusCard status={seq.status_processed} />
          </div>
        )}
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
          {tabs.map((tab) => (
            <TabBtn
              key={tab.key}
              label={tab.label}
              icon={tab.icon}
              count={tab.count}
              active={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
            />
          ))}
        </div>
      </motion.div>

      {/* ── Tab Content ── */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="glass rounded-2xl p-6"
      >
        {/* INFO TAB */}
        {activeTab === "info" && (
          <div className="space-y-6">
            <div>
              <h3 className="section-title text-base mb-3">Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10">
                <div>
                  <InfoRow label="Accession ID" value={seq.accession_id} mono />
                  <InfoRow label="Sequence Type" value={seq.seq_type} />
                  <InfoRow label="Gene Symbol" value={seq.gene_symbol} mono />
                  <InfoRow label="Gene Type" value={seq.gene_type} />
                  <InfoRow
                    label="Chromosome"
                    value={seq.chromosome ? `Chr ${seq.chromosome}` : null}
                  />
                  <InfoRow label="Strand" value={seq.strand} mono />
                </div>
                <div>
                  <InfoRow
                    label="Start Position"
                    value={seq.start_position?.toLocaleString()}
                  />
                  <InfoRow
                    label="End Position"
                    value={seq.end_position?.toLocaleString()}
                  />
                  <InfoRow
                    label="Length"
                    value={
                      seq.sequence_data?.length
                        ? seq.sequence_data.length.toLocaleString() + " bp"
                        : null
                    }
                  />
                  <InfoRow label="RNA Type" value={seq.rna_type} />
                  <InfoRow label="Protein Name" value={seq.protein_name} />
                  <InfoRow
                    label="Molecular Weight"
                    value={
                      seq.molecular_weight ? `${seq.molecular_weight} Da` : null
                    }
                  />
                </div>
              </div>
            </div>

            {seq.sequence_data && (
              <SequenceViewer
                sequence={seq.sequence_data}
                seqType={seq.seq_type}
              />
            )}
          </div>
        )}

        {/* MUTATIONS TAB */}
        {activeTab === "mutations" && (
          <div>
            <h3 className="section-title text-base mb-3">Mutasi Terkait</h3>
            {mutationCount === 0 ? (
              <p className="text-sm text-[--text-secondary]">
                Belum ada mutasi yang tercatat untuk sekuens ini.{" "}
                <button
                  onClick={() => navigate(`/mutations/new?sequence_id=${id}`)}
                  className="text-primary-500 hover:underline"
                >
                  Tambah mutasi baru
                </button>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {mutations.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-[--bg-subtle] border border-[--border] cursor-pointer hover:border-primary-500/30 transition-colors"
                    onClick={() => navigate(`/mutations/${m.id}`)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <Microscope size={14} className="text-primary-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {m.code && (
                          <span className="font-mono text-xs font-bold text-primary-500">
                            {m.code}
                          </span>
                        )}
                        <span className="badge badge-muted text-xs">
                          {m.mutation_type}
                        </span>
                        <span className="text-xs text-[--text-tertiary]">
                          pos. {m.position}
                        </span>
                      </div>
                      <p className="text-xs text-[--text-secondary] mt-0.5">
                        {m.normal_base} → {m.mutation_base}
                        {m.disease_name && (
                          <span className="ml-2 text-amber-500">
                            · {m.disease_name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <button
                    onClick={() => navigate(`/mutations?sequence_id=${id}`)}
                    className="text-xs text-primary-500 hover:underline"
                  >
                    Lihat semua di halaman Mutations →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROTEIN FUNCTIONS TAB */}
        {activeTab === "protein" && (
          <div>
            <h3 className="section-title text-base mb-3">Protein Functions</h3>
            {!seq.protein_functions?.length ? (
              <p className="text-sm text-[--text-secondary]">
                Tidak ada data protein function untuk sekuens ini.
              </p>
            ) : (
              <div className="space-y-2">
                {seq.protein_functions.map((pf) => (
                  <div
                    key={pf.id}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-[--bg-subtle] border border-[--border]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                      <Activity size={14} className="text-accent-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary-500">
                          {pf.pf_code}
                        </span>
                        {pf.go_term && (
                          <span className="font-mono text-xs text-[--text-tertiary]">
                            {pf.go_term}
                          </span>
                        )}
                        {pf.evidence_code && (
                          <span className="badge badge-muted">
                            {pf.evidence_code}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[--text-primary] mt-0.5">
                        {pf.term}
                      </p>
                      {pf.function_term && (
                        <p className="text-xs text-[--text-secondary] mt-0.5">
                          {pf.function_term}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Hapus Sekuens"
        description={`Yakin ingin menghapus sekuens "${seq?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function DetailSkeleton() {
  return (
    <div className="space-y-5 max-w-5xl animate-pulse">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="skeleton h-44 rounded-2xl" />
      <div className="skeleton h-10 w-72 rounded-xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  );
}
