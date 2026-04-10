/**
 * pages/auth/LoginPage.jsx
 * Login dengan glass card, DNA background, validasi, i18n
 */
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Eye, EyeOff, Dna, LogIn, Mail, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../../store/authStore";
import ThemeLanguageBar from "../../components/auth/ThemeLanguageBar";
import DNABackground from "../../components/auth/DNABackground";
import clsx from "clsx";

const c = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const i = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

export default function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const from = location.state?.from?.pathname || "/";

  function validate() {
    const e = {};
    if (!email.trim()) e.email = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = "Format email tidak valid";
    if (!password) e.password = "Password wajib diisi";
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
      await login(email.trim(), password);
      toast.success(t("auth.loginSuccess"));
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err?.message || t("auth.invalidCredentials");
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
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          className="w-full max-w-[420px]"
          variants={c}
          initial="hidden"
          animate="visible"
        >
          {/* Brand */}
          <motion.div variants={i} className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-accent-500 shadow-glow-primary mb-4">
              <Dna size={30} className="text-white" />
            </div>
            <h1 className="font-display text-[2rem] font-bold leading-tight text-[--text-primary]">
              {t("auth.loginTitle")}
            </h1>
            <p className="text-sm text-[--text-secondary] mt-1">
              {t("auth.loginSubtitle")}
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

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
                      value={email}
                      autoComplete="email"
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors((p) => ({ ...p, email: "", form: "" }));
                      }}
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
                      placeholder={t("auth.passwordPlaceholder")}
                      value={password}
                      autoComplete="current-password"
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((p) => ({ ...p, password: "", form: "" }));
                      }}
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
                  {errors.password && (
                    <p className="flex items-center gap-1 text-xs text-danger-500">
                      <AlertCircle size={11} />
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg w-full mt-1 relative overflow-hidden group"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
                      {t("common.loading")}
                    </>
                  ) : (
                    <>
                      <LogIn size={17} />
                      {t("auth.login")}
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
                {t("auth.noAccount")}{" "}
                <Link
                  to="/register"
                  className="font-semibold text-primary-500 hover:text-primary-400 transition-colors underline-offset-2 hover:underline"
                >
                  {t("auth.register")} →
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
