/**
 * components/layout/MainLayout.jsx
 * Layout utama untuk semua halaman yang butuh login.
 * Desktop: Sidebar kiri + Navbar atas
 * Mobile:  Navbar atas + Bottom Navigation
 */

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer
  const location = useLocation();

  // Tutup sidebar mobile saat navigasi berpindah
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Tutup sidebar mobile saat resize ke desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen transition-theme">
      {/* ── Sidebar (Desktop: selalu tampil, Mobile: drawer) ── */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Navbar ── */}
      <Navbar onMenuClick={() => setSidebarOpen(true)} />

      {/* ── Main Content ── */}
      <main className="page-wrapper">
        <div className="page-content animate-fade-in">{children}</div>
      </main>

      {/* ── Bottom Nav (Mobile only) ── */}
      <BottomNav />
    </div>
  );
}
