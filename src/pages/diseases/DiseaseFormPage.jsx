import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import {
  Save,
  ArrowLeft,
  Loader2,
  AlertCircle,
  HeartPulse,
  Globe,
} from "lucide-react";
import clsx from "clsx";

import { diseasesApi } from "../../api/diseasesApi";
import { getEthnicities } from "../../api/ethnicitiesApi";
import {
  FormField,
  Input,
  Textarea,
  FormRow,
} from "../../components/ui/FormField";

const EMPTY = {
  name: "",
  description: "",
  icd_code: "",
  ethnicity_ids: [],
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

export default function DiseaseFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState({});

  // Fetch Etnis
  const { data: ethnicitiesRes } = useQuery({
    queryKey: ["ethnicities"],
    queryFn: () => getEthnicities({}),
  });
  const ethnicities = ethnicitiesRes?.data || [];

  // Fetch Existing
  const { data: existingRes, isLoading: loadingExisting } = useQuery({
    queryKey: ["disease", id],
    queryFn: () => diseasesApi.getDisease(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existingRes?.data) return;
    const d = existingRes.data;
    setForm({
      name: d.name || "",
      description: d.description || "",
      icd_code: d.icd_code || "",
      ethnicity_ids: d.at_risk_ethnicities?.map((e) => e.id) || [],
    });
  }, [existingRes]);

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
    if (serverErrors[field]) setServerErrors((p) => ({ ...p, [field]: null }));
  }

  function handleEthnicityToggle(ethId) {
    setForm((prev) => {
      const isSelected = prev.ethnicity_ids.includes(ethId);
      const newIds = isSelected
        ? prev.ethnicity_ids.filter((id) => id !== ethId)
        : [...prev.ethnicity_ids, ethId];
      return { ...prev, ethnicity_ids: newIds };
    });
  }

  function validate() {
    const e = {};
    if (!form.name.trim())
      e.name = t("common.required", "Nama penyakit wajib diisi");
    return e;
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: diseasesApi.createDisease,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["diseases"] });
      toast.success("Penyakit berhasil ditambahkan!");
      navigate("/diseases"); // Atau ke detail jika ada page detailnya
    },
    onError: handleApiError,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => diseasesApi.updateDisease(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diseases"] });
      qc.invalidateQueries({ queryKey: ["disease", id] });
      toast.success("Data penyakit berhasil diperbarui!");
      navigate(`/diseases/${id}`);
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
      description: form.description.trim() || null,
      icd_code: form.icd_code.trim() || null,
      ethnicity_ids: form.ethnicity_ids,
    };

    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5 max-w-3xl animate-pulse">
        <div className="skeleton h-8 w-64 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
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
              onClick={() => navigate("/diseases")}
              className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Kembali ke Daftar Penyakit
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
              {isEdit ? "Simpan Perubahan" : "Simpan Penyakit"}
            </button>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <HeartPulse size={22} className="text-rose-500" />
              {isEdit ? "Ubah Data Penyakit" : "Tambah Penyakit"}
            </h1>
            <p className="page-subtitle mt-0.5">
              Kelola informasi penyakit metabolik dan korelasi etnis.
            </p>
          </motion.div>

          {/* Info Penyakit */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <FormSection
              title="Informasi Penyakit"
              subtitle="Nama klinis dan referensi ICD"
              icon={HeartPulse}
            >
              <FormRow>
                <FormField
                  label="Nama Penyakit"
                  required
                  error={errors.name || serverErrors.name}
                >
                  <Input
                    placeholder="Contoh: Diabetes Mellitus Tipe 2"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    error={errors.name || serverErrors.name}
                  />
                </FormField>
                <FormField
                  label="Kode ICD (Opsional)"
                  error={serverErrors.icd_code}
                >
                  <Input
                    placeholder="Contoh: E11"
                    value={form.icd_code}
                    onChange={(e) => set("icd_code", e.target.value)}
                    error={serverErrors.icd_code}
                  />
                </FormField>
              </FormRow>

              <FormField label="Deskripsi (Opsional)">
                <Textarea
                  placeholder="Deskripsi medis singkat..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                />
              </FormField>
            </FormSection>
          </motion.div>

          {/* Etnis Berisiko */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FormSection
              title="Etnis Berisiko Tinggi"
              subtitle="Pilih etnis mana saja yang memiliki prevalensi tinggi"
              icon={Globe}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ethnicities.length === 0 ? (
                  <p className="text-sm text-[--text-tertiary] col-span-full">
                    Belum ada data etnis di database.
                  </p>
                ) : (
                  ethnicities.map((eth) => {
                    const isSelected = form.ethnicity_ids.includes(eth.id);
                    return (
                      <label
                        key={eth.id}
                        className={clsx(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                          isSelected
                            ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-400"
                            : "border-[--border] bg-white/30 dark:bg-white/5 hover:bg-[--bg-muted] text-[--text-secondary]",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-primary-500 bg-transparent border-[--border] focus:ring-primary-500/50 cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleEthnicityToggle(eth.id)}
                        />
                        <span className="text-sm font-medium">{eth.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </FormSection>
          </motion.div>

          <div className="h-28" />

          {/* Sticky Bottom Bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
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
                  onClick={() => navigate("/diseases")}
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
                  {isEdit ? "Simpan Perubahan" : "Simpan Penyakit"}
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
