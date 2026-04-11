/**
 * pages/diseases/DiseaseFormPage.jsx
 * Create & Edit Disease.
 * Schema DiseaseCreate: name*, description?, icd_code?, ethnicity_ids?[]
 * Catatan: jika ethnicity_ids disertakan saat PUT → REPLACE semua relasi etnis
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  HeartPulse,
  Save,
  Loader2,
  AlertCircle,
  X,
  Plus,
} from "lucide-react";
import clsx from "clsx";

import { diseasesApi } from "../../api/diseasesApi";
import { ethnicitiesApi } from "../../api/ethnicitiesApi";
import {
  FormField,
  Input,
  Textarea,
  FormRow,
} from "../../components/ui/FormField";

const EMPTY = { name: "", description: "", icd_code: "", ethnicity_ids: [] };

function FormSection({ title, subtitle, children }) {
  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="border-b border-[--border] pb-3">
        <h2 className="font-display text-base font-bold text-[--text-primary]">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[--text-secondary] mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// Multi-select etnis dengan toggle
function EthnicityMultiSelect({ value, onChange }) {
  const [search, setSearch] = useState("");
  const { data: list = [] } = useQuery({
    queryKey: ["ethnicities-dropdown"],
    queryFn: () => ethnicitiesApi.listEthnicities({ limit: 1000 }),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = list.filter(
    (e) => !search || e.name?.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id) {
    if (value.includes(id)) onChange(value.filter((i) => i !== id));
    else onChange([...value, id]);
  }

  const selectedEthnicities = list.filter((e) => value.includes(e.id));

  return (
    <div className="space-y-3">
      {/* Chips etnis yang sudah dipilih */}
      {selectedEthnicities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedEthnicities.map((e) => (
            <span
              key={e.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500/12 text-primary-600 dark:text-primary-400 text-xs font-medium border border-primary-500/20"
            >
              {e.name}
              <button
                type="button"
                onClick={() => toggle(e.id)}
                className="hover:text-danger-500 transition-colors"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-[--text-tertiary] hover:text-danger-500 transition-colors px-1"
          >
            Hapus semua
          </button>
        </div>
      )}

      {/* Search + daftar pilihan */}
      <div className="border border-[--border] rounded-xl overflow-hidden">
        <div className="p-2 border-b border-[--border]">
          <input
            type="text"
            placeholder="Cari etnis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm bg-[--bg-subtle] border border-[--border] rounded-lg outline-none focus:border-[--border-focus] text-[--text-primary] placeholder:text-[--text-tertiary]"
          />
        </div>
        <div className="max-h-48 overflow-y-auto divide-y divide-[--border]">
          {filtered.length === 0 ? (
            <p className="px-4 py-4 text-sm text-[--text-tertiary] text-center">
              Tidak ada etnis
            </p>
          ) : (
            filtered.map((e) => (
              <label
                key={e.id}
                className={clsx(
                  "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[--bg-muted]",
                  value.includes(e.id) && "bg-primary-500/5",
                )}
              >
                <div
                  className={clsx(
                    "w-4 h-4 rounded flex items-center justify-center border-2 transition-all flex-shrink-0",
                    value.includes(e.id)
                      ? "bg-primary-500 border-primary-500"
                      : "border-[--border-hover]",
                  )}
                >
                  {value.includes(e.id) && (
                    <svg viewBox="0 0 12 10" fill="none" className="w-2.5">
                      <path
                        d="M1 5l3.5 3.5L11 1"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[--text-primary]">
                    {e.name}
                  </p>
                  {e.region_distribution && (
                    <p className="text-xs text-[--text-tertiary]">
                      {e.region_distribution}
                    </p>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={value.includes(e.id)}
                  onChange={() => toggle(e.id)}
                  className="sr-only"
                />
              </label>
            ))
          )}
        </div>
      </div>
      <p className="text-xs text-[--text-tertiary]">
        {value.length} etnis dipilih
      </p>
    </div>
  );
}

export default function DiseaseFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["disease", id],
    queryFn: () => diseasesApi.getDisease(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      name: existing.name || "",
      description: existing.description || "",
      icd_code: existing.icd_code || "",
      ethnicity_ids: existing.at_risk_ethnicities?.map((e) => e.id) || [],
    });
  }, [existing]);

  function set(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Nama penyakit wajib diisi";
    return e;
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      icd_code: form.icd_code.trim() || null,
      ethnicity_ids: form.ethnicity_ids.length > 0 ? form.ethnicity_ids : [],
    };
  }

  const createMut = useMutation({
    mutationFn: diseasesApi.createDisease,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["diseases"] });
      qc.invalidateQueries({ queryKey: ["diseases-dropdown"] });
      toast.success("Penyakit berhasil ditambahkan");
      navigate(`/diseases/${res.id}`);
    },
    onError: (e) => toast.error(e.message || "Gagal menyimpan"),
  });

  const updateMut = useMutation({
    mutationFn: (data) => diseasesApi.updateDisease(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diseases"] });
      qc.invalidateQueries({ queryKey: ["disease", id] });
      qc.invalidateQueries({ queryKey: ["diseases-dropdown"] });
      toast.success("Penyakit berhasil diperbarui");
      navigate(`/diseases/${id}`);
    },
    onError: (e) => toast.error(e.message || "Gagal memperbarui"),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const payload = buildPayload();
    if (isEdit) updateMut.mutate(payload);
    else createMut.mutate(payload);
  }

  const isSaving = createMut.isPending || updateMut.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="space-y-5 max-w-2xl animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="skeleton h-48 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
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
              />{" "}
              Kembali
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEdit ? "Simpan Perubahan" : "Simpan Penyakit"}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <HeartPulse size={22} className="text-warning-500" />
              {isEdit ? "Edit Penyakit" : t("diseases.addDisease")}
            </h1>
            {isEdit && existing && (
              <p className="page-subtitle mt-0.5">{existing.name}</p>
            )}
          </motion.div>

          {/* Info penyakit */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <FormSection
              title="Informasi Penyakit"
              subtitle="Data penyakit metabolik"
            >
              <FormField label={t("common.name")} required error={errors.name}>
                <Input
                  placeholder="Contoh: Diabetes Mellitus Tipe 2, Hipertensi Esensial"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  error={errors.name}
                  maxLength={150}
                />
              </FormField>
              <FormRow>
                <FormField
                  label={t("diseases.icdCode")}
                  helper="Kode klasifikasi ICD-10 atau ICD-11"
                >
                  <Input
                    placeholder="E11, I10, G20..."
                    value={form.icd_code}
                    onChange={(e) => set("icd_code", e.target.value)}
                    maxLength={20}
                    className="font-mono uppercase"
                  />
                </FormField>
              </FormRow>
              <FormField label={t("common.description")}>
                <Textarea
                  placeholder="Deskripsi singkat penyakit, patofisiologi, atau catatan klinis..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                />
              </FormField>
            </FormSection>
          </motion.div>

          {/* Etnis berisiko */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FormSection
              title={t("diseases.atRiskEthnicities")}
              subtitle="Kelompok etnis yang memiliki risiko lebih tinggi terhadap penyakit ini. Saat edit, pilihan ini akan menggantikan seluruh relasi etnis yang ada."
            >
              <EthnicityMultiSelect
                value={form.ethnicity_ids}
                onChange={(v) => set("ethnicity_ids", v)}
              />
            </FormSection>
          </motion.div>

          {/* Sticky bottom */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
            className="sticky bottom-4 z-10"
          >
            <div className="glass rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 shadow-glass-md">
              <div>
                {Object.keys(errors).length > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-danger-500">
                    <AlertCircle size={15} />
                    Lengkapi field wajib
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/diseases")}
                  disabled={isSaving}
                  className="btn btn-ghost"
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
