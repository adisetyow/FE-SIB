/**
 * pages/patients/PatientListPage.jsx
 * Daftar pasien dengan filter gender + etnisitas + search.
 * Tambah/Edit → halaman form. Detail → halaman detail.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  Eye,
  Download,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { patientsApi } from "../../api/patientsApi";
import { ethnicitiesApi } from "../../api/ethnicitiesApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const GENDER_LABEL = { MALE: "Laki-laki", FEMALE: "Perempuan" };
const GENDER_COLOR = { MALE: "badge-accent", FEMALE: "badge-primary" };

function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function PatientListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterEthnic, setFilterEthnic] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", search, filterGender, filterEthnic],
    queryFn: () =>
      patientsApi.listPatients({
        limit: 1000,
        ...(search && { search }),
        ...(filterGender && { gender: filterGender }),
        ...(filterEthnic && { ethnicity_id: filterEthnic }),
      }),
  });

  const { data: ethnicities = [] } = useQuery({
    queryKey: ["ethnicities-dropdown"],
    queryFn: () => ethnicitiesApi.listEthnicities({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => patientsApi.deletePatient(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patients-dropdown"] });
      toast.success(t("patients.deleteSuccess"));
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus"),
  });

  function handleExport() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        patients.map((p) => ({
          ID: p.id,
          NIK: p.nik,
          Nama: p.full_name,
          "Tgl Lahir": p.date_of_birth || "",
          "Jenis Kelamin": p.gender ? GENDER_LABEL[p.gender] : "",
          Kota: p.address_city || "",
          Etnis: p.ethnicity_name || "",
        })),
      ),
      "Patients",
    );
    XLSX.writeFile(
      wb,
      `patients_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Data diekspor ke Excel");
  }

  const hasFilter = filterGender || filterEthnic;

  const columns = [
    {
      key: "full_name",
      header: t("patients.fullName"),
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div
            className={clsx(
              "w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0",
              row.gender === "FEMALE"
                ? "bg-gradient-to-br from-pink-400 to-primary-500"
                : "bg-gradient-to-br from-accent-400 to-accent-600",
            )}
          >
            {val?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] truncate max-w-[160px]">
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
      key: "date_of_birth",
      header: "Usia / Tgl Lahir",
      width: "130px",
      render: (val) => {
        const age = calcAge(val);
        return val ? (
          <div>
            <p className="text-sm text-[--text-primary]">{age} thn</p>
            <p className="text-xs text-[--text-tertiary]">
              {new Date(val).toLocaleDateString("id-ID")}
            </p>
          </div>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        );
      },
    },
    {
      key: "gender",
      header: t("patients.gender"),
      width: "100px",
      render: (val) =>
        val ? (
          <span className={clsx("badge", GENDER_COLOR[val])}>
            {GENDER_LABEL[val]}
          </span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "address_city",
      header: t("patients.city"),
      width: "120px",
      render: (val) =>
        val ? (
          <span className="text-sm text-[--text-secondary]">{val}</span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "ethnicity_name",
      header: t("patients.ethnicity"),
      width: "110px",
      render: (val) =>
        val ? (
          <span className="badge badge-muted">{val}</span>
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
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patients/${row.id}`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-accent-500 hover:bg-accent-500/10 transition-colors"
            title="Detail"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patients/${row.id}/edit`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-danger-500 hover:bg-danger-500/10 transition-colors"
            title="Hapus"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users size={22} className="text-primary-500" />
            {t("patients.title")}
          </h1>
          <p className="page-subtitle">{t("patients.subtitle")}</p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${patients.length.toLocaleString()} pasien`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-1 gap-2 flex-wrap sm:flex-nowrap">
            <Filter
              size={14}
              className="text-[--text-tertiary] self-center flex-shrink-0"
            />
            {/* Filter gender */}
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus] cursor-pointer flex-shrink-0"
            >
              <option value="">Semua Gender</option>
              <option value="MALE">Laki-laki</option>
              <option value="FEMALE">Perempuan</option>
            </select>
            {/* Filter etnis */}
            <select
              value={filterEthnic}
              onChange={(e) => setFilterEthnic(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus] cursor-pointer flex-shrink-0 max-w-[160px]"
            >
              <option value="">Semua Etnis</option>
              {ethnicities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {/* Search */}
            <div className="relative flex-1 min-w-0">
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
                placeholder={t("patients.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm w-full"
              />
            </div>
            {hasFilter && (
              <button
                onClick={() => {
                  setFilterGender("");
                  setFilterEthnic("");
                }}
                className="text-xs text-primary-500 hover:underline flex-shrink-0 self-center"
              >
                Reset
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleExport} className="btn btn-glass btn-sm">
              <Download size={14} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => navigate("/patients/new")}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              {t("patients.addPatient")}
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={patients}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/patients/${row.id}`)}
          emptyLabel="Belum ada data pasien."
          pageSize={25}
          serverSearch={{ value: search, onChange: setSearch }}
        />
      </motion.div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Hapus Pasien"
        description={`Yakin menghapus pasien "${deleteTarget?.full_name}"? Semua data sekuens terkait juga terpengaruh.`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
