/**
 * components/layout/Navbar.jsx
 * Top navigation bar.
 * Desktop: Menyesuaikan margin kiri dari Sidebar.
 * Mobile: Memenuhi lebar layar, menyediakan tombol hamburger menu.
 */

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../store/authStore";
import { Menu, Moon, Sun, LogOut, User, Languages } from "lucide-react";
import clsx from "clsx";

export default function Navbar({ onMenuClick }) {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();

  // State mounted penting agar komponen next-themes tidak error saat awal load
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme === "dark";
  const isID = i18n.language?.startsWith("id");

  return (
    <header className="navbar flex items-center justify-between px-4 lg:px-8 shadow-sm">
      {/* ── Kiri: Tombol Hamburger (Hanya Mobile) ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 rounded-xl text-[--text-secondary] hover:bg-[--bg-muted] hover:text-[--text-primary] transition-colors"
          aria-label="Buka menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── Kanan: Aksi & Profil ── */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Render toggle hanya jika sudah mounted (mencegah kedipan ikon) */}
        {mounted && (
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Tombol Bahasa (Sesuai ThemeLanguageBar) */}
            <button
              onClick={() => i18n.changeLanguage(isID ? "en" : "id")}
              className="flex items-center gap-1.5 p-2 rounded-xl text-[--text-secondary] hover:bg-[--bg-muted] hover:text-[--text-primary] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              title="Switch language"
            >
              <Languages size={18} />
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">
                {isID ? "ID" : "EN"}
              </span>
            </button>

            {/* Tombol Tema (Sesuai ThemeLanguageBar) */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="p-2 rounded-full text-[--text-secondary] hover:bg-[--bg-muted] hover:text-[--text-primary] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {isDark ? (
                <Sun size={18} className="text-warning-400" />
              ) : (
                <Moon size={18} />
              )}
            </button>
          </div>
        )}

        {/* Garis Pemisah (Divider) */}
        <div className="hidden sm:block w-px h-6 bg-[--border]" />

        {/* Info Pengguna & Logout */}
        <div className="flex items-center gap-3 pl-1 sm:pl-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-[--text-primary] leading-tight">
              {user?.email?.split("@")[0] || "Peneliti"}
            </span>
            <span className="text-[10px] text-[--text-tertiary]">SIB User</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400/20 to-accent-500/20 border border-[--border] flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
              <User size={16} />
            </div>

            <button
              onClick={logout}
              className="p-2 rounded-full text-rose-500 hover:bg-rose-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              title="Keluar"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
