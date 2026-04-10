import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, HeartPulse, Pencil, Trash2, Eye } from "lucide-react";
import clsx from "clsx";

import { useDiseases } from "../../hooks/useDiseases";
import { diseasesApi } from "../../api/diseasesApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function DiseaseListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Query Data
  const { data: diseases = [], isLoading } = useDiseases({
    search: search || undefined,
    limit: 1000,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => diseasesApi.deleteDisease(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diseases"] });
      toast.success(t("diseases.deleteSuccess", "Penyakit berhasil dihapus"));
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          "Gagal menghapus. Pastikan tidak ada mutasi yang terhubung.",
      );
    },
  });

  // Kolom Tabel
  const columns = [
    {
      key: "name",
      header: t("diseases.name", "Nama Penyakit"),
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <HeartPulse size={13} className="text-rose-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[--text-primary] truncate max-w-[250px]">
              {val}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "icd_code",
      header: t("diseases.icdCode", "Kode ICD"),
      width: "120px",
      render: (val) =>
        val ? (
          <span className="badge badge-accent font-mono text-[10px]">
            {val}
          </span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "ethnicity_count",
      header: t("diseases.totalEthnicity", "Total Etnis"),
      width: "120px",
      align: "center",
      render: (val) => (
        <span className="badge badge-muted text-[10px]">{val || 0}</span>
      ),
    },
    {
      key: "mutation_count",
      header: t("diseases.totalMutation", "Total Mutasi"),
      width: "120px",
      align: "center",
      render: (val) => (
        <span className="badge badge-muted text-[10px]">{val || 0}</span>
      ),
    },
    {
      key: "id",
      header: "",
      width: "100px",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            title="Lihat detail"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/diseases/${row.id}`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/diseases/${row.id}/edit`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
            title="Hapus"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title flex items-center gap-2">
            <HeartPulse size={22} className="text-rose-500" />
            {t("diseases.title", "Database Penyakit")}
          </h1>
          <p className="page-subtitle">
            {t(
              "diseases.subtitle",
              "Referensi penyakit metabolik dan korelasi etnis",
            )}
          </p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${diseases.length.toLocaleString()} data`}
        </p>
      </motion.div>

      {/* Table Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <div className="relative flex-1 min-w-0 max-w-md">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder={t(
                "search.placeholder",
                "Cari nama penyakit atau kode ICD...",
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 py-2 text-sm w-full"
            />
          </div>
          <button
            onClick={() => navigate("/diseases/new")}
            className="btn btn-primary btn-sm flex-shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">
              {t("diseases.addDisease", "Tambah Penyakit")}
            </span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>

        {/* Tabel */}
        <DataTable
          columns={columns}
          data={diseases}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/diseases/${row.id}`)}
          emptyLabel="Belum ada data penyakit."
          pageSize={25}
          hideSearch={true}
        />
      </motion.div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Hapus Penyakit"
        description={`Yakin ingin menghapus penyakit "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
