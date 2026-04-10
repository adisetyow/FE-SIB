/**
 * components/layout/BottomNav.jsx
 * Bottom navigation khusus untuk mobile (< lg breakpoint).
 * Menampilkan 5 menu utama yang paling sering diakses.
 */

import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FlaskConical,
  Users,
  HeartPulse,
  Search,
} from "lucide-react";
import clsx from "clsx";

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const items = [
    {
      label: t("nav.dashboard"),
      path: "/",
      icon: LayoutDashboard,
      exact: true,
    },
    { label: t("nav.analyze"), path: "/analyze", icon: FlaskConical },
    { label: t("nav.patients"), path: "/patients", icon: Users },
    { label: t("nav.diseases"), path: "/diseases", icon: HeartPulse },
    { label: t("nav.search"), path: "/search", icon: Search },
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {items.map((item) => {
        const isActive = item.exact
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path);

        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors duration-150"
            aria-label={item.label}
          >
            <div
              className={clsx(
                "w-10 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                isActive ? "bg-primary-500/15" : "hover:bg-[--bg-muted]",
              )}
            >
              <item.icon
                size={20}
                className={clsx(
                  "transition-colors duration-200",
                  isActive ? "text-primary-500" : "text-[--text-tertiary]",
                )}
              />
            </div>
            <span
              className={clsx(
                "text-2xs font-medium transition-colors duration-200",
                isActive ? "text-primary-500" : "text-[--text-tertiary]",
              )}
            >
              {item.label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
