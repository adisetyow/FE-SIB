/**
 * pages/patients/PatientFormPage.jsx
 * Create & Edit pasien.
 * Schema PatientCreate: nik*, full_name*, place_of_birth, date_of_birth,
 * gender, address_street, address_district, address_city, address_province, ethnicity_id
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowLeft, Users, Save, Loader2, AlertCircle } from "lucide-react";

import { patientsApi } from "../../api/patientsApi";
import {
  FormField,
  Input,
  Select,
  FormRow,
} from "../../components/ui/FormField";
import EthnicitySelect from "../../components/ui/EthnicitySelect";

const EMPTY = {
  nik: "",
  full_name: "",
  place_of_birth: "",
  date_of_birth: "",
  gender: "",
  address_street: "",
  address_district: "",
  address_city: "",
  address_province: "",
  ethnicity_id: null,
};

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

export default function PatientFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => patientsApi.getPatient(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!existing) return;
    setForm({
      nik: existing.nik || "",
      full_name: existing.full_name || "",
      place_of_birth: existing.place_of_birth || "",
      date_of_birth: existing.date_of_birth || "",
      gender: existing.gender || "",
      address_street: existing.address_street || "",
      address_district: existing.address_district || "",
      address_city: existing.address_city || "",
      address_province: existing.address_province || "",
      ethnicity_id: existing.ethnicity_id ?? null,
    });
  }, [existing]);

  function set(f, v) {
    setForm((p) => ({ ...p, [f]: v }));
    setErrors((p) => ({ ...p, [f]: "" }));
  }

  function validate() {
    const e = {};
    if (!form.nik.trim()) e.nik = "NIK wajib diisi";
    else if (form.nik.replace(/\D/g, "").length < 16)
      e.nik = "NIK harus 16 digit";
    if (!form.full_name.trim()) e.full_name = "Nama lengkap wajib diisi";
    return e;
  }

  function buildPayload() {
    return {
      nik: form.nik.replace(/\D/g, "").slice(0, 20),
      full_name: form.full_name.trim(),
      place_of_birth: form.place_of_birth.trim() || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      address_street: form.address_street.trim() || null,
      address_district: form.address_district.trim() || null,
      address_city: form.address_city.trim() || null,
      address_province: form.address_province.trim() || null,
      ethnicity_id: form.ethnicity_id ?? null,
    };
  }

  const createMut = useMutation({
    mutationFn: patientsApi.createPatient,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patients-dropdown"] });
      toast.success(t("patients.saveSuccess"));
      navigate(`/patients/${res.id}`);
    },
    onError: (e) => toast.error(e.message || "Gagal menyimpan"),
  });

  const updateMut = useMutation({
    mutationFn: (data) => patientsApi.updatePatient(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient", id] });
      qc.invalidateQueries({ queryKey: ["patients-dropdown"] });
      toast.success(t("patients.saveSuccess"));
      navigate(`/patients/${id}`);
    },
    onError: (e) => toast.error(e.message || "Gagal memperbarui"),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-48 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-5">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <button
              type="button"
              onClick={() => navigate("/patients")}
              className="flex items-center gap-2 text-sm text-[--text-secondary] hover:text-[--text-primary] transition-colors group"
            >
              <ArrowLeft
                size={16}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Kembali ke Daftar Pasien
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
              {isEdit ? "Simpan Perubahan" : "Simpan Pasien"}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <Users size={22} className="text-primary-500" />
              {isEdit ? t("patients.editPatient") : t("patients.addPatient")}
            </h1>
            {isEdit && existing && (
              <p className="page-subtitle mt-0.5">{existing.full_name}</p>
            )}
          </motion.div>

          {/* Identitas */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <FormSection
              title="Identitas Pasien"
              subtitle="Data kependudukan wajib"
            >
              <FormField
                label={t("patients.nik")}
                required
                error={errors.nik}
                helper="16 digit nomor induk kependudukan"
              >
                <Input
                  placeholder="3374010101010001"
                  value={form.nik}
                  onChange={(e) =>
                    set("nik", e.target.value.replace(/\D/g, "").slice(0, 16))
                  }
                  error={errors.nik}
                  maxLength={16}
                  className="font-mono tracking-widest"
                />
              </FormField>
              <FormField
                label={t("patients.fullName")}
                required
                error={errors.full_name}
              >
                <Input
                  placeholder="Nama lengkap sesuai KTP"
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  error={errors.full_name}
                  maxLength={100}
                />
              </FormField>
              <FormRow>
                <FormField label={t("patients.placeOfBirth")}>
                  <Input
                    placeholder="Surakarta"
                    value={form.place_of_birth}
                    onChange={(e) => set("place_of_birth", e.target.value)}
                    maxLength={100}
                  />
                </FormField>
                <FormField label={t("patients.dateOfBirth")}>
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => set("date_of_birth", e.target.value)}
                  />
                </FormField>
              </FormRow>
              <FormRow>
                <FormField label={t("patients.gender")}>
                  <Select
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <option value="">— Pilih —</option>
                    <option value="MALE">{t("patients.male")}</option>
                    <option value="FEMALE">{t("patients.female")}</option>
                  </Select>
                </FormField>
                <FormField
                  label={t("patients.ethnicity")}
                  helper="Etnis kelompok pasien"
                >
                  <EthnicitySelect
                    value={form.ethnicity_id}
                    onChange={(v) => set("ethnicity_id", v)}
                    placeholder="Pilih etnis..."
                  />
                </FormField>
              </FormRow>
            </FormSection>
          </motion.div>

          {/* Alamat */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <FormSection
              title="Alamat"
              subtitle="Alamat domisili pasien (semua opsional)"
            >
              <FormField label={t("patients.street")}>
                <Input
                  placeholder="Jl. Merdeka No. 10"
                  value={form.address_street}
                  onChange={(e) => set("address_street", e.target.value)}
                  maxLength={200}
                />
              </FormField>
              <FormRow>
                <FormField label={t("patients.district")}>
                  <Input
                    placeholder="Banjarsari"
                    value={form.address_district}
                    onChange={(e) => set("address_district", e.target.value)}
                    maxLength={100}
                  />
                </FormField>
                <FormField label={t("patients.city")}>
                  <Input
                    placeholder="Surakarta"
                    value={form.address_city}
                    onChange={(e) => set("address_city", e.target.value)}
                    maxLength={100}
                  />
                </FormField>
              </FormRow>
              <FormField label={t("patients.province")}>
                <Input
                  placeholder="Jawa Tengah"
                  value={form.address_province}
                  onChange={(e) => set("address_province", e.target.value)}
                  maxLength={100}
                />
              </FormField>
            </FormSection>
          </motion.div>

          {/* Sticky bottom bar */}
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
                  onClick={() => navigate("/patients")}
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
                  {isEdit ? "Simpan Perubahan" : "Simpan Pasien"}
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
