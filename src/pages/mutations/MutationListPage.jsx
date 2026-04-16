/**
 * pages/mutations/MutationListPage.jsx
 * CRUD Mutations. Form tambah/edit di halaman sendiri.
 * Schema MutationCreate: position*, normal_base*, mutation_base*, mutation_type*, sequence_id*
 *                        code?, description?, disease_id?
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  Microscope,
  Pencil,
  Trash2,
  Download,
  Filter,
  Eye,
} from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { mutationsApi } from "../../api/mutationsApi";
import { diseasesApi } from "../../api/diseasesApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function MutationListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDisease, setFilterDisease] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: mutations = [], isLoading } = useQuery({
    queryKey: ["mutations", search, filterType, filterDisease],
    queryFn: () =>
      mutationsApi.listMutations({
        limit: 1000,
        ...(search && { search }),
        ...(filterType && { mutation_type: filterType }),
        ...(filterDisease && { disease_id: filterDisease }),
      }),
  });

  const { data: diseases = [] } = useQuery({
    queryKey: ["diseases-dropdown"],
    queryFn: () => diseasesApi.listDiseases({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => mutationsApi.deleteMutation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mutations"] });
      toast.success("Mutasi berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus"),
  });

  // Tipe mutasi unik dari data
  const mutationTypes = [
    ...new Set(mutations.map((m) => m.mutation_type).filter(Boolean)),
  ].sort();

  function handleExport() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        mutations.map((m) => ({
          ID: m.id,
          Kode: m.code || "",
          Tipe: m.mutation_type || "",
          Posisi: m.position || "",
          "Basa Normal": m.normal_base || "",
          "Basa Mutasi": m.mutation_base || "",
          Penyakit: m.disease_name || "",
          Sekuens: m.sequence_name || "",
          Deskripsi: m.description || "",
        })),
      ),
      "Mutations",
    );
    XLSX.writeFile(
      wb,
      `mutations_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Data diekspor ke Excel");
  }

  const BASE_COLOR = {
    A: "text-blue-500",
    T: "text-green-500",
    G: "text-red-500",
    C: "text-yellow-500",
    U: "text-purple-500",
  };

  const columns = [
    {
      key: "code",
      header: t("mutations.code"),
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-danger-500/10 flex items-center justify-center flex-shrink-0">
            <Microscope size={14} className="text-danger-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold font-mono text-[--text-primary]">
              {val || `Mutasi #${row.id}`}
            </p>
            {row.sequence_name && (
              <p className="text-xs text-[--text-tertiary] truncate max-w-[150px]">
                {row.sequence_name}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "mutation_type",
      header: t("mutations.mutationType"),
      width: "110px",
      render: (val) =>
        val ? (
          <span className="badge badge-danger">{val}</span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "position",
      header: t("mutations.position"),
      width: "90px",
      align: "right",
      render: (val) => (
        <span className="font-mono text-sm text-[--text-primary]">
          {val?.toLocaleString() ?? "—"}
        </span>
      ),
    },
    {
      key: "normal_base",
      header: "Normal → Mutan",
      width: "130px",
      render: (val, row) => (
        <div className="flex items-center gap-1.5 font-mono text-base font-bold">
          <span className={BASE_COLOR[val] || "text-[--text-secondary]"}>
            {val || "—"}
          </span>
          <span className="text-[--text-tertiary] text-xs">→</span>
          <span
            className={
              BASE_COLOR[row.mutation_base] || "text-[--text-secondary]"
            }
          >
            {row.mutation_base || "—"}
          </span>
        </div>
      ),
    },
    {
      key: "disease_name",
      header: t("mutations.disease"),
      width: "160px",
      render: (val) =>
        val ? (
          <span className="badge badge-warning text-xs">{val}</span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "id",
      header: "",
      width: "80px",
      align: "right",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/mutations/${row.id}`); // arahkan ke detail page
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/mutations/${row.id}/edit`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-primary-500 hover:bg-primary-500/10 transition-colors"
          >
            <Pencil size={14} />
          </button>
          <button
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
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header"
      >
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Microscope size={22} className="text-danger-500" />
            {t("mutations.title")}
          </h1>
          <p className="page-subtitle">{t("mutations.subtitle")}</p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${mutations.length.toLocaleString()} mutasi`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-1 gap-2 flex-wrap sm:flex-nowrap">
            <Filter
              size={14}
              className="text-[--text-tertiary] self-center flex-shrink-0"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus] cursor-pointer flex-shrink-0"
            >
              <option value="">Semua Tipe</option>
              {mutationTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={filterDisease}
              onChange={(e) => setFilterDisease(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus] cursor-pointer flex-shrink-0 max-w-[160px]"
            >
              <option value="">Semua Penyakit</option>
              {diseases.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
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
                placeholder="Cari kode atau deskripsi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm w-full"
              />
            </div>
            {(filterType || filterDisease) && (
              <button
                onClick={() => {
                  setFilterType("");
                  setFilterDisease("");
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
              onClick={() => navigate("/mutations/new")}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              {t("mutations.addMutation")}
            </button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={mutations}
          isLoading={isLoading}
          searchPlaceholder="Cari kode atau deskripsi..."
          searchKeys={["code", "description", "disease_name", "sequence_name"]}
          emptyLabel="Belum ada data mutasi."
          pageSize={25}
          serverSearch={{ value: search, onChange: setSearch }}
        />
      </motion.div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Hapus Mutasi"
        description={`Yakin menghapus mutasi "${deleteTarget?.code || "#" + deleteTarget?.id}"?`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
