/**
 * components/auth/ThemeLanguageBar.jsx
 * Bar kecil di sudut kanan atas halaman auth untuk toggle:
 * - Dark / Light mode
 * - Bahasa EN / ID
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Sun, Moon, Languages } from "lucide-react";
import clsx from "clsx";

export default function ThemeLanguageBar() {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === "dark";
  const isID = i18n.language === "id";

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {/* Language toggle */}
      <button
        onClick={() => i18n.changeLanguage(isID ? "en" : "id")}
        className={clsx(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
          "glass transition-all duration-200 hover:shadow-glass",
          "text-[--text-secondary] hover:text-[--text-primary]",
        )}
        title="Switch language"
      >
        <Languages size={14} />
        {isID ? "ID" : "EN"}
      </button>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={clsx(
          "w-9 h-9 rounded-lg flex items-center justify-center",
          "glass transition-all duration-200 hover:shadow-glass",
          "text-[--text-secondary] hover:text-[--text-primary]",
        )}
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun size={16} className="text-warning-400" />
        ) : (
          <Moon size={16} />
        )}
      </button>
    </div>
  );
}
