import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { Save, ArrowLeft, Loader2, AlertCircle, Globe } from "lucide-react";
import clsx from "clsx";

import {
  createEthnicity,
  getEthnicityById,
  updateEthnicity,
} from "../../api/ethnicitiesApi";
import { FormField, Input } from "../../components/ui/FormField";

const EMPTY = {
  name: "",
  region_distribution: "",
};

function FormSection({ title, subtitle, children, icon: Icon }) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="border-b border-[--border] pb-3 flex items-start gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center flex-shrink-0">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h2 className="font-display text-base font-bold text-[--text-primary]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-[--text-secondary] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function EthnicityFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState({});

  // Fetch Existing
  const { data: existingRes, isLoading: loadingExisting } = useQuery({
    queryKey: ["ethnicity", id],
    queryFn: () => getEthnicityById(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existingRes?.data) return;
    setForm({
      name: existingRes.data.name || "",
      region_distribution: existingRes.data.region_distribution || "",
    });
  }, [existingRes]);

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
    if (serverErrors[field]) setServerErrors((p) => ({ ...p, [field]: null }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim())
      e.name = t("common.required", "Nama etnis wajib diisi.");
    return e;
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: createEthnicity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ethnicities"] });
      toast.success("Etnis berhasil ditambahkan!");
      navigate("/ethnicities");
    },
    onError: handleApiError,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => updateEthnicity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ethnicities"] });
      qc.invalidateQueries({ queryKey: ["ethnicity", id] });
      toast.success("Data etnis berhasil diperbarui!");
      navigate("/ethnicities");
    },
    onError: handleApiError,
  });

  function handleApiError(err) {
    const details = err?.details;
    if (Array.isArray(details)) {
      const fieldErrors = {};
      details.forEach((d) => {
        fieldErrors[d.loc[d.loc.length - 1]] = d.msg;
      });
      setServerErrors(fieldErrors);
      toast.error("Terdapat kesalahan pada format isian.");
    } else {
      toast.error(
        err?.message || t("common.errorOccurred", "Terjadi kesalahan."),
      );
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.error("Lengkapi field yang wajib diisi");
      return;
    }

    const payload = {
      name: form.name.trim(),
      region_distribution: form.region_distribution.trim() || null,
    };

    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5 max-w-2xl animate-pulse">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          {/* Top Bar Nav */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <button
              type="button"
              onClick={() => navigate("/ethnicities")}
              className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Kembali ke Daftar Etnis
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary hidden sm:flex"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEdit ? "Simpan Perubahan" : "Simpan Etnis"}
            </button>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <Globe size={22} className="text-primary-500" />
              {isEdit
                ? "Ubah Data Etnis"
                : t("ethnicities.addEthnicity", "Tambah Etnis")}
            </h1>
            <p className="page-subtitle mt-0.5">
              Kelola informasi kelompok etnis.
            </p>
          </motion.div>

          {/* Info Etnis */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <FormSection
              title="Informasi Etnis"
              subtitle="Nama resmi dan wilayah persebaran utama"
              icon={Globe}
            >
              <div className="space-y-5">
                <FormField
                  label={t("common.name", "Nama Etnis")}
                  required
                  error={errors.name || serverErrors.name}
                >
                  <Input
                    placeholder="Contoh: Jawa, Sunda, Batak"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    error={errors.name || serverErrors.name}
                  />
                </FormField>

                <FormField
                  label={t(
                    "ethnicities.regionDistribution",
                    "Wilayah Persebaran",
                  )}
                  error={serverErrors.region_distribution}
                >
                  <Input
                    placeholder="Contoh: Jawa Tengah, Jawa Timur, DIY"
                    value={form.region_distribution}
                    onChange={(e) => set("region_distribution", e.target.value)}
                    error={serverErrors.region_distribution}
                  />
                </FormField>
              </div>
            </FormSection>
          </motion.div>

          <div className="h-28" />

          {/* Sticky Bottom Bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="fixed sm:sticky bottom-0 sm:bottom-4 left-0 right-0 sm:left-auto sm:right-auto z-10 px-4 sm:px-0 pb-4 sm:pb-0 pointer-events-none"
          >
            <div className="glass rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-glass-lg pointer-events-auto">
              <div>
                {(Object.keys(errors).length > 0 ||
                  Object.keys(serverErrors).length > 0) && (
                  <span className="flex items-center gap-1.5 text-sm text-danger-500">
                    <AlertCircle size={15} /> Periksa kembali isian form
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/ethnicities")}
                  className="btn btn-ghost"
                  disabled={isSaving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary btn-lg relative overflow-hidden group"
                >
                  {isSaving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {isEdit ? "Simpan Perubahan" : "Simpan Etnis"}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
