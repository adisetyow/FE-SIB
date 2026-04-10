import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Globe, Pencil, Trash2, MapPin } from "lucide-react";
import clsx from "clsx";

import { getEthnicities, deleteEthnicity } from "../../api/ethnicitiesApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function EthnicityListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Query Data
  const { data: ethnicities = [], isLoading } = useQuery({
    queryKey: ["ethnicities", search],
    queryFn: () =>
      getEthnicities({ search: search || undefined, limit: 1000 }).then(
        (r) => r.data,
      ),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteEthnicity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ethnicities"] });
      toast.success(t("common.success", "Etnis berhasil dihapus!"));
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          "Gagal menghapus etnis. Pastikan tidak ada pasien yang terhubung.",
      );
    },
  });

  // Kolom Tabel
  const columns = [
    {
      key: "name",
      header: t("common.name", "Nama Etnis"),
      render: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
            <Globe size={13} className="text-primary-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[--text-primary] truncate">
              {val}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "region_distribution",
      header: (
        <div className="flex items-center gap-1.5">
          <MapPin size={14} /> {t("ethnicities.regionDistribution", "Wilayah")}
        </div>
      ),
      width: "250px",
      render: (val) => (
        <span className="text-xs text-[--text-secondary]">{val || "—"}</span>
      ),
    },
    {
      key: "patient_count",
      header: t("ethnicities.patientCount", "Total Pasien"),
      width: "120px",
      align: "center",
      render: (val) => (
        <span className="badge badge-muted text-[10px] font-mono">
          {val || 0}
        </span>
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
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/ethnicities/${row.id}/edit`);
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
    <div className="w-full space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Globe size={22} className="text-primary-500" />
            {t("ethnicities.title", "Data Etnis")}
          </h1>
          <p className="page-subtitle">
            {t("ethnicities.subtitle", "Database kelompok etnis Indonesia")}
          </p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${ethnicities.length.toLocaleString()} etnis`}
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
                "Cari nama etnis atau wilayah...",
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 py-2 text-sm w-full"
            />
          </div>
          <button
            onClick={() => navigate("/ethnicities/new")}
            className="btn btn-primary btn-sm flex-shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">
              {t("ethnicities.addEthnicity", "Tambah Etnis")}
            </span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>

        {/* Tabel */}
        <DataTable
          columns={columns}
          data={ethnicities}
          isLoading={isLoading}
          // Tidak ada detail page untuk Etnis di kode awal, jadi kita nonaktifkan onRowClick
          // onRowClick={(row) => navigate(`/ethnicities/${row.id}`)}
          emptyLabel="Belum ada data etnis."
          pageSize={25}
          hideSearch={true}
        />
      </motion.div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Hapus Data Etnis"
        description={`Apakah Anda yakin ingin menghapus etnis "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan dan akan gagal jika masih ada pasien yang terdaftar di etnis ini.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
