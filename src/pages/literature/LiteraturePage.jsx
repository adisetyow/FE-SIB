/**
 * pages/literature/LiteraturePage.jsx
 * Daftar literatur ilmiah dengan filter tipe + search.
 * Navigasi ke form untuk create/edit.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  FileText,
  Pencil,
  Trash2,
  Eye,
  Download,
  Filter,
  ExternalLink,
} from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { literatureApi } from "../../api/literatureApi";
import DataTable from "../../components/ui/DataTable";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const LIT_TYPES = [
  "Jurnal",
  "Prosiding",
  "Buku",
  "Tesis",
  "Disertasi",
  "Laporan",
  "Lainnya",
];

export default function LiteraturePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["literature", search, filterType],
    queryFn: () =>
      literatureApi.listLiterature({
        limit: 1000,
        ...(search && { search }),
        ...(filterType && { type: filterType }),
      }),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => literatureApi.deleteLiterature(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["literature"] });
      toast.success("Literatur berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message || "Gagal menghapus"),
  });

  function handleExport() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        list.map((l) => ({
          ID: l.id,
          Judul: l.title,
          Penulis: l.authors,
          Tipe: l.type || "",
          Penerbit: l.publisher || "",
          "Tgl Terbit": l.publication_date || "",
          URL: l.url || "",
        })),
      ),
      "Literature",
    );
    XLSX.writeFile(
      wb,
      `literature_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Data diekspor ke Excel");
  }

  const columns = [
    {
      key: "title",
      header: t("literature.title"),
      render: (val, row) => (
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText size={14} className="text-accent-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] line-clamp-1 max-w-[260px]">
              {val}
            </p>
            <p className="text-xs text-[--text-tertiary] truncate max-w-[260px]">
              {row.authors}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: t("common.type"),
      width: "100px",
      render: (val) =>
        val ? (
          <span className="badge badge-accent">{val}</span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "publication_date",
      header: t("literature.publicationDate"),
      width: "110px",
      render: (val) =>
        val ? (
          <span className="text-xs text-[--text-secondary]">
            {new Date(val).getFullYear()}
          </span>
        ) : (
          <span className="text-[--text-tertiary]">—</span>
        ),
    },
    {
      key: "publisher",
      header: t("literature.publisher"),
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
      key: "url",
      header: "Link",
      width: "60px",
      align: "center",
      render: (val, row) =>
        val || row.ncbi_link ? (
          <a
            href={val || row.ncbi_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto text-[--text-tertiary] hover:text-accent-500 hover:bg-accent-500/10 transition-colors"
          >
            <ExternalLink size={13} />
          </a>
        ) : (
          <span className="text-[--text-tertiary] text-center block">—</span>
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
              navigate(`/literature/${row.id}/edit`);
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
            <FileText size={22} className="text-accent-500" />
            {t("literature.title")}
          </h1>
          <p className="page-subtitle">{t("literature.subtitle")}</p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${list.length} literatur`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-1 gap-2 min-w-0">
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
              {LIT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
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
                placeholder="Cari judul atau penulis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9 py-2 text-sm w-full"
              />
            </div>
            {filterType && (
              <button
                onClick={() => setFilterType("")}
                className="text-xs text-primary-500 hover:underline self-center flex-shrink-0"
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
              onClick={() => navigate("/literature/new")}
              className="btn btn-primary btn-sm"
            >
              <Plus size={15} />
              {t("literature.addLiterature")}
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={list}
          isLoading={isLoading}
          searchPlaceholder="Cari judul atau penulis..."
          searchKeys={["title", "authors", "publisher"]}
          emptyLabel="Belum ada data literatur."
          pageSize={25}
          serverSearch={{ value: search, onChange: setSearch }}
        />
      </motion.div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Hapus Literatur"
        description={`Yakin menghapus "${deleteTarget?.title}"?`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
