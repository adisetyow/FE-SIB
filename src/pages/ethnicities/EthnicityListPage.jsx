/**
 * pages/ethnicities/EthnicityListPage.jsx
 * CRUD kelompok etnis Indonesia.
 * Form pakai modal karena hanya 2 field (name + region_distribution) — tidak perlu halaman sendiri.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  Globe,
  Pencil,
  Trash2,
  Users,
  Download,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
import clsx from "clsx";

import { ethnicitiesApi } from "../../api/ethnicitiesApi";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { FormField, Input, Textarea } from "../../components/ui/FormField";

const EMPTY = { name: "", region_distribution: "" };

export default function EthnicityListPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const { data: list = [], isLoading } = useQuery({
    queryKey: ["ethnicities", search],
    queryFn: () =>
      ethnicitiesApi.listEthnicities({
        limit: 1000,
        ...(search && { search }),
      }),
  });

  const createMut = useMutation({
    mutationFn: ethnicitiesApi.createEthnicity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ethnicities"] });
      qc.invalidateQueries({ queryKey: ["ethnicities-dropdown"] });
      toast.success("Etnis berhasil ditambahkan");
      closeModal();
    },
    onError: (e) => toast.error(e.message || "Gagal menyimpan"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => ethnicitiesApi.updateEthnicity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ethnicities"] });
      qc.invalidateQueries({ queryKey: ["ethnicities-dropdown"] });
      toast.success("Etnis berhasil diperbarui");
      closeModal();
    },
    onError: (e) => toast.error(e.message || "Gagal memperbarui"),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => ethnicitiesApi.deleteEthnicity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ethnicities"] });
      qc.invalidateQueries({ queryKey: ["ethnicities-dropdown"] });
      toast.success("Etnis berhasil dihapus");
      setDeleteTarget(null);
    },
    onError: (e) =>
      toast.error(
        e.message || "Gagal menghapus — mungkin masih ada pasien terhubung",
      ),
  });

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY);
    setErrors({});
    setModalOpen(true);
  }
  function openEdit(row) {
    setEditTarget(row);
    setForm({
      name: row.name || "",
      region_distribution: row.region_distribution || "",
    });
    setErrors({});
    setModalOpen(true);
  }
  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
  }
  function set(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Nama etnis wajib diisi";
    return e;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const payload = {
      name: form.name.trim(),
      region_distribution: form.region_distribution.trim() || null,
    };
    if (editTarget) updateMut.mutate({ id: editTarget.id, data: payload });
    else createMut.mutate(payload);
  }

  function handleExport() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        list.map((e) => ({
          ID: e.id,
          Nama: e.name,
          Wilayah: e.region_distribution || "",
          Pasien: e.patient_count,
        })),
      ),
      "Ethnicities",
    );
    XLSX.writeFile(
      wb,
      `ethnicities_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Data diekspor ke Excel");
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  const columns = [
    {
      key: "name",
      header: t("common.name"),
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {val?.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-[--text-primary]">{val}</p>
            {row.region_distribution && (
              <p className="text-xs text-[--text-tertiary]">
                {row.region_distribution}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "patient_count",
      header: "Pasien",
      width: "90px",
      align: "right",
      render: (val) => (
        <div className="flex items-center justify-end gap-1.5">
          <Users size={13} className="text-[--text-tertiary]" />
          <span className="text-sm font-medium text-[--text-primary]">
            {val ?? 0}
          </span>
        </div>
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
              openEdit(row);
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
            <Globe size={22} className="text-primary-500" />
            {t("ethnicities.title")}
          </h1>
          <p className="page-subtitle">{t("ethnicities.subtitle")}</p>
        </div>
        <p className="text-sm text-[--text-tertiary]">
          {isLoading ? "..." : `${list.length} etnis`}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        <div className="flex gap-2 justify-end">
          <button onClick={handleExport} className="btn btn-glass btn-sm">
            <Download size={14} />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={openCreate} className="btn btn-primary btn-sm">
            <Plus size={15} />
            {t("ethnicities.addEthnicity")}
          </button>
        </div>
        <DataTable
          columns={columns}
          data={list}
          isLoading={isLoading}
          searchPlaceholder="Cari nama etnis atau wilayah..."
          searchKeys={["name", "region_distribution"]}
          emptyLabel="Belum ada data etnis. Klik 'Tambah Etnis' untuk memulai."
          pageSize={25}
          serverSearch={{ value: search, onChange: setSearch }}
        />
      </motion.div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? "Edit Etnis" : t("ethnicities.addEthnicity")}
        size="sm"
        footer={
          <>
            <button
              onClick={closeModal}
              className="btn btn-ghost"
              disabled={isSaving}
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {editTarget ? t("common.update") : t("common.create")}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label={t("common.name")} required error={errors.name}>
            <Input
              placeholder="Contoh: Jawa, Sunda, Batak Toba, Minangkabau"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={errors.name}
            />
          </FormField>
          <FormField
            label={t("ethnicities.regionDistribution")}
            helper="Wilayah penyebaran utama etnis ini"
          >
            <Input
              placeholder="Contoh: Jawa Tengah, Jawa Timur, DI Yogyakarta"
              value={form.region_distribution}
              onChange={(e) => set("region_distribution", e.target.value)}
            />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        title="Hapus Etnis"
        description={`Yakin menghapus etnis "${deleteTarget?.name}"? Akan gagal jika masih ada pasien dengan etnis ini.`}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
