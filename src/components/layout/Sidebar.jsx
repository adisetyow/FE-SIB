/**
 * components/layout/Sidebar.jsx
 * Sidebar navigasi utama.
 * Desktop: fixed di kiri, selalu visible.
 * Mobile: drawer dari kiri (controlled by parent).
 */

import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Dna,
  FlaskConical,
  Users,
  Microscope,
  HeartPulse,
  Globe,
  FileText,
  FolderOpen,
  ListTodo,
  Search,
  ChevronRight,
  X,
  Beaker,
  GitCompare,
} from "lucide-react";
import clsx from "clsx";

// ─── Nav config ───────────────────────────────────────────────────────────────
function useNavItems() {
  const { t } = useTranslation();
  return [
    {
      label: t("nav.dashboard"),
      path: "/",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      group: "Analisis",
      items: [
        // Tambahkan exact: true agar tidak bertabrakan dengan /analyze/compare
        {
          label: t("nav.analyze"),
          path: "/analyze",
          icon: FlaskConical,
          exact: true,
        },
        { label: "Compare", path: "/analyze/compare", icon: GitCompare },
        { label: t("nav.analysis"), path: "/analysis/tasks", icon: ListTodo },
      ],
    },
    {
      group: "Data",
      items: [
        { label: t("nav.sequences"), path: "/sequences", icon: Dna },
        { label: t("nav.patients"), path: "/patients", icon: Users },
        { label: t("nav.mutations"), path: "/mutations", icon: Microscope },
        { label: t("nav.diseases"), path: "/diseases", icon: HeartPulse },
        { label: t("nav.ethnicities"), path: "/ethnicities", icon: Globe },
        {
          label: t("nav.ethnicSequences"),
          path: "/ethnic-sequences",
          icon: Beaker,
        },
      ],
    },
    {
      group: "Research",
      items: [
        { label: t("nav.literature"), path: "/literature", icon: FileText },
        { label: t("nav.activities"), path: "/activities", icon: FolderOpen },
        // Menu Tugas Analisis yang duplikat di sini sudah dihapus
      ],
    },
    {
      label: t("nav.search"),
      path: "/search",
      icon: Search,
    },
  ];
}

// ─── Single Nav Item ──────────────────────────────────────────────────────────
function NavItem({ item }) {
  const location = useLocation();

  // Cek apakah aktif
  const isActive = item.exact
    ? location.pathname === item.path
    : location.pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      end={item.exact}
      className={clsx("nav-item group relative", isActive && "active")}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary-500" />
      )}

      <item.icon
        size={18}
        className={clsx(
          "flex-shrink-0 transition-colors duration-200",
          isActive
            ? "text-primary-500"
            : "text-surface-400 group-hover:text-surface-600 dark:group-hover:text-surface-300",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>

      {isActive && (
        <ChevronRight size={14} className="text-primary-500 opacity-60" />
      )}
    </NavLink>
  );
}

// ─── Sidebar Component ────────────────────────────────────────────────────────
export default function Sidebar({ isOpen, onClose }) {
  const { t } = useTranslation();
  const navItems = useNavItems();

  return (
    <aside
      className={clsx(
        "sidebar",
        // Tambahkan flex flex-col h-screen agar tinggi sidebar mentok di layar dan area tengah bisa di-scroll
        "flex flex-col h-screen",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* ── Logo / Brand ── */}
      <div className="flex items-center justify-between px-5 h-[60px] border-b border-[--border] flex-shrink-0">
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center flex-shrink-0">
            <Dna size={16} className="text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-[--text-primary] leading-none">
              SIB Lab
            </div>
            <div className="text-2xs text-[--text-tertiary] leading-none mt-0.5">
              Biomolecular
            </div>
          </div>
        </NavLink>

        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-[--bg-muted] text-[--text-secondary] transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Navigation ── */}
      {/* Hapus no-scrollbar agar scrollbar alami muncul dan user sadar menu bisa digeser ke bawah */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item, idx) => {
          // Group dengan section header
          if (item.group) {
            return (
              <div key={idx} className="pt-4 pb-1">
                <p className="px-3 mb-1 text-2xs font-semibold uppercase tracking-widest text-[--text-tertiary]">
                  {item.group}
                </p>
                <div className="space-y-0.5">
                  {item.items.map((child) => (
                    <NavItem key={child.path} item={child} />
                  ))}
                </div>
              </div>
            );
          }
          // Item tunggal
          return <NavItem key={item.path} item={item} />;
        })}
      </nav>

      {/* ── Footer Sidebar ── */}
      <div className="px-5 py-4 border-t border-[--border] flex-shrink-0">
        <p className="text-2xs text-[--text-tertiary] text-center">
          {t("common.appFullName")}
        </p>
        <p className="text-2xs text-[--text-tertiary] text-center mt-0.5">
          v1.0.0 — UKSW
        </p>
      </div>
    </aside>
  );
}
