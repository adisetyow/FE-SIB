import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { Save, ArrowLeft, Loader2, AlertCircle, Users } from "lucide-react";

import { patientsApi } from "../../api/patientsApi";
import { getEthnicities } from "../../api/ethnicitiesApi"; // Asumsi path benar
import {
  FormField,
  Input,
  Select,
  FormRow,
} from "../../components/ui/FormField";

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
  ethnicity_id: "",
};

// Form Section Wrapper
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
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useTranslation();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverErrors, setServerErrors] = useState({});

  // Fetch Master Data Etnis
  const { data: ethnicitiesRes } = useQuery({
    queryKey: ["ethnicities"],
    queryFn: getEthnicities,
  });
  const ethnicities = ethnicitiesRes?.data || [];

  // Fetch Existing Data
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
      ethnicity_id: existing.ethnicity_id || "",
    });
  }, [existing]);

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
    if (serverErrors[field]) setServerErrors((p) => ({ ...p, [field]: null }));
  }

  function validate() {
    const e = {};
    if (!form.nik.trim()) e.nik = t("common.required", "NIK wajib diisi");
    if (!form.full_name.trim())
      e.full_name = t("common.required", "Nama Lengkap wajib diisi");
    return e;
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: patientsApi.createPatient,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      toast.success(t("patients.saveSuccess", "Pasien berhasil ditambahkan!"));
      navigate(`/patients/${res.id}`);
    },
    onError: handleApiError,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => patientsApi.updatePatient(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
      qc.invalidateQueries({ queryKey: ["patient", id] });
      toast.success(
        t("patients.saveSuccess", "Data pasien berhasil diperbarui!"),
      );
      navigate(`/patients/${id}`);
    },
    onError: handleApiError,
  });

  function handleApiError(err) {
    const details = err?.details;
    const message = err?.message;

    if (Array.isArray(details)) {
      const fieldErrors = {};
      details.forEach((d) => {
        fieldErrors[d.loc[d.loc.length - 1]] = d.msg;
      });
      setServerErrors(fieldErrors);
      toast.error("Terdapat kesalahan pada format isian.");
    } else if (message && message.toLowerCase().includes("nik")) {
      setServerErrors({ nik: message });
      toast.error("Gagal menyimpan data (NIK duplikat).");
    } else {
      toast.error(message || t("common.errorOccurred", "Terjadi kesalahan."));
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
      ...form,
      ethnicity_id: form.ethnicity_id ? parseInt(form.ethnicity_id) : null,
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
        <div className="skeleton h-72 rounded-2xl" />
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
              className="btn btn-primary hidden sm:flex"
            >
              {isSaving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEdit ? "Simpan Perubahan" : "Simpan Pasien"}
            </button>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            <h1 className="page-title flex items-center gap-2">
              <Users size={22} className="text-emerald-500" />
              {isEdit
                ? t("patients.editPatient", "Ubah Data Pasien")
                : t("patients.addPatient", "Tambah Pasien")}
            </h1>
            {isEdit && existing && (
              <p className="page-subtitle mt-0.5">
                Editing:{" "}
                <span className="font-medium">{existing.full_name}</span>
              </p>
            )}
          </motion.div>

          {/* Identitas Utama */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
          >
            <FormSection
              title={t("patients.primaryIdentity", "Identitas Utama")}
              subtitle="Data dasar demografi pasien"
            >
              <FormRow>
                <FormField
                  label={t("patients.nik", "NIK")}
                  required
                  error={errors.nik || serverErrors.nik}
                >
                  <Input
                    placeholder="16 digit NIK"
                    value={form.nik}
                    onChange={(e) => set("nik", e.target.value)}
                    maxLength={16}
                    error={errors.nik || serverErrors.nik}
                  />
                </FormField>
                <FormField
                  label={t("patients.fullName", "Nama Lengkap")}
                  required
                  error={errors.full_name || serverErrors.full_name}
                >
                  <Input
                    placeholder="Nama sesuai identitas"
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                    error={errors.full_name || serverErrors.full_name}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label={t("patients.placeOfBirth", "Tempat Lahir")}>
                  <Input
                    placeholder={t("patients.placeOfBirth", "Kota kelahiran")}
                    value={form.place_of_birth}
                    onChange={(e) => set("place_of_birth", e.target.value)}
                  />
                </FormField>
                <FormField
                  label={t("patients.dateOfBirth", "Tanggal Lahir")}
                  error={serverErrors.date_of_birth}
                >
                  <Input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => set("date_of_birth", e.target.value)}
                    error={serverErrors.date_of_birth}
                  />
                </FormField>
              </FormRow>

              <FormRow>
                <FormField label={t("patients.gender", "Jenis Kelamin")}>
                  <Select
                    value={form.gender}
                    onChange={(e) => set("gender", e.target.value)}
                  >
                    <option value="">-- Pilih --</option>
                    <option value="MALE">
                      {t("patients.male", "Laki-laki")}
                    </option>
                    <option value="FEMALE">
                      {t("patients.female", "Perempuan")}
                    </option>
                  </Select>
                </FormField>
                <FormField label={t("patients.ethnicity", "Etnis")}>
                  <Select
                    value={form.ethnicity_id}
                    onChange={(e) => set("ethnicity_id", e.target.value)}
                  >
                    <option value="">-- Pilih Etnis --</option>
                    {ethnicities.map((eth) => (
                      <option key={eth.id} value={eth.id}>
                        {eth.name}
                      </option>
                    ))}
                  </Select>
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
              title={t("patients.address", "Alamat Tinggal")}
              subtitle="Domisili saat ini"
            >
              <FormField label={t("patients.street", "Jalan")}>
                <Input
                  placeholder="Nama jalan, RT/RW, no rumah..."
                  value={form.address_street}
                  onChange={(e) => set("address_street", e.target.value)}
                />
              </FormField>
              <FormRow>
                <FormField label={t("patients.district", "Kecamatan")}>
                  <Input
                    placeholder="Kecamatan"
                    value={form.address_district}
                    onChange={(e) => set("address_district", e.target.value)}
                  />
                </FormField>
                <FormField label={t("patients.city", "Kota / Kab.")}>
                  <Input
                    placeholder="Kota atau Kabupaten"
                    value={form.address_city}
                    onChange={(e) => set("address_city", e.target.value)}
                  />
                </FormField>
                <FormField label={t("patients.province", "Provinsi")}>
                  <Input
                    placeholder="Provinsi"
                    value={form.address_province}
                    onChange={(e) => set("address_province", e.target.value)}
                  />
                </FormField>
              </FormRow>
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
                  onClick={() => navigate("/patients")}
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
