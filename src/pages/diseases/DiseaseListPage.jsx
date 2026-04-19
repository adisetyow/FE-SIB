/**
 * pages/diseases/DiseaseListPage.jsx
 * Daftar penyakit metabolik dengan search, filter ethnicity_count, export.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  HeartPulse,
  Pencil,
  Trash2,
  Eye,
  Download,
  Filter,
} from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { diseasesApi } from "../../api/diseasesApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useDebounce } from "../../hooks/useDebounce";

export default function DiseaseListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterHasMutation, setFilterHasMutation] = useState("");

  const debouncedSearch = useDebounce(search, 400);

  const { data: rawDiseases = [], isLoading } = useQuery({
    queryKey: ["diseases", debouncedSearch],
    queryFn: () =>
      diseasesApi.listDiseases({
        limit: 1000,
        ...(debouncedSearch && { search: debouncedSearch }),
      }),
    keepPreviousData: true,
  });

  const diseases = rawDiseases.filter((d) => {
    if (filterHasMutation === "yes") return (d.mutation_count || 0) > 0;
    if (filterHasMutation === "no") return (d.mutation_count || 0) === 0;
    return true;
  });

  const deleteMut = useMutation({
    mutationFn: (id) => diseasesApi.deleteDisease(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diseases"] });
      qc.invalidateQueries({ queryKey: ["diseases-dropdown"] });
      toast.success("Penyakit berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (e) =>
      toast.error(
        e.message || "Gagal menghapus — mungkin masih ada mutasi terhubung",
      ),
  });

  function handleExport() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        diseases.map((d) => ({
          ID: d.id,
          Nama: d.name,
          "Kode ICD": d.icd_code || "",
          Deskripsi: d.description || "",
          "Jml Etnis": d.ethnicity_count,
          "Jml Mutasi": d.mutation_count,
        })),
      ),
      "Diseases",
    );
    XLSX.writeFile(
      wb,
      `diseases_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Data diekspor ke Excel");
  }

  const columns = [
    {
      key: "name",
      header: t("common.name"),
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-warning-400/15 flex items-center justify-center flex-shrink-0">
            <HeartPulse size={15} className="text-warning-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] truncate max-w-[200px]">
              {val}
            </p>
            {row.icd_code && (
              <p className="text-xs font-mono text-[--text-tertiary]">
                {row.icd_code}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "description",
      header: t("common.description"),
      width: "200px",
      render: (val) =>
        val ? (
          <span className="text-xs text-[--text-secondary] line-clamp-2">
            {val}
          </span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "ethnicity_count",
      header: t("diseases.ethnicityCount"),
      width: "90px",
      align: "right",
      render: (val) => (
        <span
          className={clsx(
            "badge",
            (val || 0) > 0 ? "badge-primary" : "badge-muted",
          )}
        >
          {val ?? 0} etnis
        </span>
      ),
    },
    {
      key: "mutation_count",
      header: t("diseases.mutationCount"),
      width: "90px",
      align: "right",
      render: (val) => (
        <span
          className={clsx(
            "badge",
            (val || 0) > 0 ? "badge-danger" : "badge-muted",
          )}
        >
          {val ?? 0} mutasi
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
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/diseases/${row.id}`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-accent-500 hover:bg-accent-500/10 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/diseases/${row.id}/edit`);
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
            <HeartPulse size={22} className="text-warning-500" />
            {t("diseases.title")}
          </h1>
          <p className="page-subtitle">{t("diseases.subtitle")}</p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${diseases.length} penyakit`}
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
            {/* Filter icon */}
            <Filter
              size={14}
              className="text-[--text-tertiary] self-center flex-shrink-0"
            />

            {/* Filter mutation */}
            <select
              value={filterHasMutation}
              onChange={(e) => setFilterHasMutation(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-[--border] bg-[--bg-surface] text-[--text-primary] outline-none focus:border-[--border-focus] cursor-pointer flex-shrink-0"
            >
              <option value="">Semua</option>
              <option value="yes">Ada Mutasi</option>
              <option value="no">Tidak Ada</option>
            </select>

            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <svg
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>

              <input
                type="search"
                placeholder="Cari nama penyakit atau kode ICD..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm w-full"
              />
            </div>

            {/* Reset */}
            {(filterHasMutation || search) && (
              <button
                onClick={() => {
                  setFilterHasMutation("");
                  setSearch("");
                }}
                className="text-xs text-primary-500 hover:underline flex-shrink-0 self-center"
              >
                Reset
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleExport} className="btn btn-glass btn-sm">
              <Download size={14} />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              onClick={() => navigate("/diseases/new")}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              {t("diseases.addDisease")}
            </button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={diseases}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/diseases/${row.id}`)}
          emptyLabel={
            search ? "Tidak ada hasil pencarian." : "Belum ada data penyakit."
          }
          pageSize={25}
          hideSearch
        />
      </motion.div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Hapus Penyakit"
        description={`Yakin menghapus "${deleteTarget?.name}"? Akan gagal jika masih ada mutasi terhubung.`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
