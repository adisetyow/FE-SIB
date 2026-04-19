/**
 * pages/activities/ActivityPage.jsx
 * Daftar aktivitas penelitian dengan search + export.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  FolderOpen,
  Pencil,
  Trash2,
  Eye,
  Download,
  Wrench,
  FileStack,
} from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { activitiesApi } from "../../api/activitiesApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useDebounce } from "../../hooks/useDebounce";

export default function ActivityPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["activities", debouncedSearch],
    queryFn: () =>
      activitiesApi.listActivities({
        limit: 1000,
        ...(debouncedSearch && { search: debouncedSearch }),
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => activitiesApi.deleteActivity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Aktivitas berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus"),
  });

  function handleExport() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        list.map((a) => ({
          ID: a.id,
          "No. Aktivitas": a.activity_number,
          "Nama Aktivitas": a.activity_name,
          Tanggal: a.date ? new Date(a.date).toLocaleDateString("id-ID") : "",
          Peneliti: a.researcher_name || "",
          Alat: a.tools_count,
          Bukti: a.evidences_count,
        })),
      ),
      "Activities",
    );
    XLSX.writeFile(
      wb,
      `activities_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Data diekspor ke Excel");
  }

  const columns = [
    {
      key: "activity_name",
      header: t("activities.activityName"),
      render: (val, row) => (
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-success-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FolderOpen size={14} className="text-success-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] truncate max-w-[220px]">
              {val}
            </p>
            <p className="text-xs text-[--text-tertiary] font-mono">
              {row.activity_number}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "date",
      header: t("common.date"),
      width: "110px",
      render: (val) =>
        val ? (
          <span className="text-xs text-[--text-secondary]">
            {new Date(val).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "researcher_name",
      header: "Peneliti",
      width: "140px",
      render: (val) =>
        val ? (
          <span className="text-xs text-[--text-secondary] truncate block max-w-[130px]">
            {val}
          </span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "tools_count",
      header: "Alat",
      width: "70px",
      align: "center",
      render: (val) => (
        <div className="flex items-center justify-center gap-1">
          <Wrench size={11} className="text-[--text-tertiary]" />
          <span className="text-xs text-[--text-secondary]">{val ?? 0}</span>
        </div>
      ),
    },
    {
      key: "evidences_count",
      header: "Bukti",
      width: "70px",
      align: "center",
      render: (val) => (
        <div className="flex items-center justify-center gap-1">
          <FileStack size={11} className="text-[--text-tertiary]" />
          <span className="text-xs text-[--text-secondary]">{val ?? 0}</span>
        </div>
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
              navigate(`/activities/${row.id}`);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[--text-tertiary] hover:text-accent-500 hover:bg-accent-500/10 transition-colors"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/activities/${row.id}/edit`);
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
            <FolderOpen size={22} className="text-success-500" />
            {t("activities.title")}
          </h1>
          <p className="page-subtitle">{t("activities.subtitle")}</p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${list.length} aktivitas`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          {/* LEFT: Search */}
          <div className="relative flex-1 min-w-0">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]"
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
              placeholder="Cari nama atau nomor aktivitas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 py-2 text-sm w-full"
            />
          </div>

          {/* RIGHT: Actions */}
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn btn-glass btn-sm">
              <Download size={14} />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button
              onClick={() => navigate("/activities/new")}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              {t("activities.addActivity")}
            </button>
          </div>
        </div>
        <DataTable
          columns={columns}
          data={list}
          isLoading={isLoading}
          onRowClick={(row) => navigate(`/activities/${row.id}`)}
          emptyLabel={
            search
              ? "Tidak ada hasil pencarian."
              : "Belum ada aktivitas penelitian."
          }
          pageSize={25}
          hideSearch
        />
      </motion.div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Hapus Aktivitas"
        description={`Yakin menghapus aktivitas "${deleteTarget?.activity_name}"?`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
