import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Plus, Users, Pencil, Trash2, Eye, User } from "lucide-react";
import clsx from "clsx";

import { usePatients } from "../../hooks/usePatients";
import { patientsApi } from "../../api/patientsApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function PatientListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Query Data
  const { data: patients = [], isLoading } = usePatients({
    search: search || undefined,
    limit: 1000,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => patientsApi.deletePatient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success(t("patients.deleteSuccess", "Pasien berhasil dihapus"));
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message ||
          "Gagal menghapus pasien. Data mungkin terhubung dengan mutasi.",
      );
    },
  });

  // Kolom Tabel
  const columns = [
    {
      key: "full_name",
      header: t("patients.fullName", "Nama Pasien"),
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <User size={13} className="text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[--text-primary] truncate max-w-[200px]">
              {val}
            </p>
            <p className="text-xs text-[--text-tertiary] font-mono">
              {row.nik}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "gender",
      header: t("patients.gender", "Jenis Kelamin"),
      width: "120px",
      render: (val) => (
        <span
          className={clsx(
            "badge",
            val === "MALE"
              ? "badge-accent"
              : val === "FEMALE"
                ? "badge-primary"
                : "badge-muted",
          )}
        >
          {val === "MALE"
            ? t("patients.male", "Laki-laki")
            : val === "FEMALE"
              ? t("patients.female", "Perempuan")
              : "-"}
        </span>
      ),
    },
    {
      key: "date_of_birth",
      header: t("patients.dateOfBirth", "Tgl Lahir"),
      width: "120px",
      render: (val) => (
        <span className="text-xs text-[--text-secondary]">
          {val ? new Date(val).toLocaleDateString("id-ID") : "—"}
        </span>
      ),
    },
    {
      key: "address_city",
      header: t("patients.city", "Kota"),
      width: "150px",
      render: (val) => (
        <span className="text-xs text-[--text-secondary] truncate block max-w-[130px]">
          {val || "—"}
        </span>
      ),
    },
    {
      key: "ethnicity_name",
      header: t("patients.ethnicity", "Etnis"),
      width: "120px",
      render: (val) =>
        val ? (
          <span className="badge badge-muted text-[10px]">{val}</span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
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
              navigate(`/patients/${row.id}`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patients/${row.id}/edit`);
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
            <Users size={22} className="text-emerald-500" />
            {t("patients.title", "Data Pasien")}
          </h1>
          <p className="page-subtitle">
            {t("patients.subtitle", "Kelola profil dan demografi pasien")}
          </p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${patients.length.toLocaleString()} pasien`}
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
                "patients.searchPlaceholder",
                "Cari berdasarkan nama, NIK, atau kota...",
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 py-2 text-sm w-full"
            />
          </div>
          <button
            onClick={() => navigate("/patients/new")}
            className="btn btn-primary btn-sm flex-shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">
              {t("patients.addPatient", "Tambah Pasien")}
            </span>
            <span className="sm:hidden">Tambah</span>
          </button>
        </div>

        {/* Tabel */}
        <DataTable
          columns={columns}
          data={patients}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/patients/${row.id}`)}
          emptyLabel="Belum ada data pasien."
          pageSize={25}
          hideSearch={true} // Search sudah dihandle Toolbar
        />
      </motion.div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
        title="Hapus Pasien"
        description={`Yakin ingin menghapus pasien "${deleteTarget?.full_name}"? Tindakan ini tidak dapat dibatalkan.`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
