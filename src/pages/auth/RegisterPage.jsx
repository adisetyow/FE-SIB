/**
 * pages/auth/RegisterPage.jsx
 * Register dengan field: email, password, full_name, institution
 * Sesuai schema ResearcherCreate dari API
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  Dna,
  UserPlus,
  Mail,
  Lock,
  User,
  Building2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../store/authStore";
import ThemeLanguageBar from "../../components/auth/ThemeLanguageBar";
import DNABackground from "../../components/auth/DNABackground";
import clsx from "clsx";

const c = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const i = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.4, 0, 0.2, 1] },
  },
};

// Password strength indicator
function PasswordStrength({ password }) {
  const checks = [
    { label: "Min. 8 karakter", ok: password.length >= 8 },
    { label: "Huruf besar", ok: /[A-Z]/.test(password) },
    { label: "Angka", ok: /[0-9]/.test(password) },
  ];
  if (!password) return null;
  const strength = checks.filter((c) => c.ok).length;

  return (
    <div className="mt-2 space-y-1.5">
      {/* Bar */}
      <div className="flex gap-1">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className={clsx(
              "h-1 flex-1 rounded-full transition-all duration-300",
              idx < strength
                ? strength === 1
                  ? "bg-danger-500"
                  : strength === 2
                    ? "bg-warning-400"
                    : "bg-success-500"
                : "bg-[--border]",
            )}
          />
        ))}
      </div>
      {/* Checks */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        {checks.map((ch) => (
          <span
            key={ch.label}
            className={clsx(
              "flex items-center gap-1 text-[11px] transition-colors",
              ch.ok ? "text-success-500" : "text-[--text-tertiary]",
            )}
          >
            <CheckCircle2
              size={10}
              className={ch.ok ? "opacity-100" : "opacity-30"}
            />
            {ch.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    institution: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function set(field, val) {
    setForm((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: "", form: "" }));
  }

  function validate() {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Nama lengkap wajib diisi";
    if (!form.institution.trim()) e.institution = "Institusi wajib diisi";
    if (!form.email.trim()) e.email = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      e.email = "Format email tidak valid";
    if (!form.password) e.password = "Password wajib diisi";
    else if (form.password.length < 8)
      e.password = "Password minimal 8 karakter";
    if (form.confirmPassword !== form.password)
      e.confirmPassword = "Password tidak cocok";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        institution: form.institution.trim(),
      });
      toast.success(t("auth.registerSuccess"));
      navigate("/login");
    } catch (err) {
      const msg = err?.message || "Registrasi gagal. Coba lagi.";
      toast.error(msg);
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden bg-[--bg-page]">
      <DNABackground />
      <ThemeLanguageBar />
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <motion.div
          className="w-full max-w-[460px]"
          variants={c}
          initial="hidden"
          animate="visible"
        >
          {/* Brand */}
          <motion.div variants={i} className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 shadow-glow-primary mb-3">
              <Dna size={26} className="text-white" />
            </div>
            <h1 className="font-display text-[1.85rem] font-bold leading-tight text-[--text-primary]">
              {t("auth.registerTitle")}
            </h1>
            <p className="text-sm text-[--text-secondary] mt-1">
              {t("auth.registerSubtitle")}
            </p>
          </motion.div>

          {/* Glass Card */}
          <motion.div variants={i}>
            <div className="glass rounded-2xl p-7 shadow-glass-md">
              {errors.form && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2.5 px-4 py-3 mb-5 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-500 text-sm"
                >
                  <AlertCircle size={15} className="flex-shrink-0" />
                  {errors.form}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[--text-tertiary]">
                    {t("auth.fullName")}
                  </label>
                  <div className="relative">
                    <User
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder={t("auth.namePlaceholder")}
                      value={form.full_name}
                      autoComplete="name"
                      onChange={(e) => set("full_name", e.target.value)}
                      className={clsx(
                        "input pl-10",
                        errors.full_name && "input-error",
                      )}
                    />
                  </div>
                  {errors.full_name && (
                    <p className="flex items-center gap-1 text-xs text-danger-500">
                      <AlertCircle size={11} />
                      {errors.full_name}
                    </p>
                  )}
                </div>

                {/* Institution */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[--text-tertiary]">
                    {t("auth.institution")}
                  </label>
                  <div className="relative">
                    <Building2
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder={t("auth.institutionPlaceholder")}
                      value={form.institution}
                      autoComplete="organization"
                      onChange={(e) => set("institution", e.target.value)}
                      className={clsx(
                        "input pl-10",
                        errors.institution && "input-error",
                      )}
                    />
                  </div>
                  {errors.institution && (
                    <p className="flex items-center gap-1 text-xs text-danger-500">
                      <AlertCircle size={11} />
                      {errors.institution}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[--text-tertiary]">
                    {t("auth.email")}
                  </label>
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                    />
                    <input
                      type="email"
                      placeholder={t("auth.emailPlaceholder")}
                      value={form.email}
                      autoComplete="email"
                      onChange={(e) => set("email", e.target.value)}
                      className={clsx(
                        "input pl-10",
                        errors.email && "input-error",
                      )}
                    />
                  </div>
                  {errors.email && (
                    <p className="flex items-center gap-1 text-xs text-danger-500">
                      <AlertCircle size={11} />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[--text-tertiary]">
                    {t("auth.password")}
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                    />
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Min. 8 karakter"
                      value={form.password}
                      autoComplete="new-password"
                      onChange={(e) => set("password", e.target.value)}
                      className={clsx(
                        "input pl-10 pr-10",
                        errors.password && "input-error",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
                    >
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="flex items-center gap-1 text-xs text-danger-500">
                      <AlertCircle size={11} />
                      {errors.password}
                    </p>
                  ) : (
                    <PasswordStrength password={form.password} />
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[--text-tertiary]">
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[--text-tertiary] pointer-events-none"
                    />
                    <input
                      type={showConf ? "text" : "password"}
                      placeholder="Ulangi password"
                      value={form.confirmPassword}
                      autoComplete="new-password"
                      onChange={(e) => set("confirmPassword", e.target.value)}
                      className={clsx(
                        "input pl-10 pr-10",
                        errors.confirmPassword && "input-error",
                        !errors.confirmPassword &&
                          form.confirmPassword &&
                          form.confirmPassword === form.password &&
                          "border-success-500",
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConf((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
                    >
                      {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="flex items-center gap-1 text-xs text-danger-500">
                      <AlertCircle size={11} />
                      {errors.confirmPassword}
                    </p>
                  )}
                  {!errors.confirmPassword &&
                    form.confirmPassword &&
                    form.confirmPassword === form.password && (
                      <p className="flex items-center gap-1 text-xs text-success-500">
                        <CheckCircle2 size={11} />
                        Password cocok
                      </p>
                    )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg w-full mt-2 relative overflow-hidden group"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
                      {t("common.loading")}
                    </>
                  ) : (
                    <>
                      <UserPlus size={17} />
                      {t("auth.register")}
                    </>
                  )}
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none" />
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[--border]" />
                <span className="text-xs text-[--text-tertiary] select-none">
                  atau
                </span>
                <div className="flex-1 h-px bg-[--border]" />
              </div>

              <p className="text-center text-sm text-[--text-secondary]">
                {t("auth.haveAccount")}{" "}
                <Link
                  to="/login"
                  className="font-semibold text-primary-500 hover:text-primary-400 transition-colors underline-offset-2 hover:underline"
                >
                  {t("auth.login")} →
                </Link>
              </p>
            </div>
          </motion.div>

          <motion.p
            variants={i}
            className="text-center text-xs text-[--text-tertiary] mt-5"
          >
            {t("common.appFullName")} · Universitas Kristen Satya Wacana
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
