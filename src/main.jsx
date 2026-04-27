/**
 * main.jsx
 * Entry point aplikasi — mount semua provider di sini
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./store/authStore";
import App from "./App";

// i18n — harus diimport sebelum komponen apapun
import "./i18n/config";

// Global styles
import "./styles/globals.css";

// ─── React Query Client ───────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // data dianggap segar selama 5 menit
      gcTime: 10 * 60 * 1000, // cache disimpan 10 menit setelah tidak dipakai
      retry: 1, // retry 1x saat error
      refetchOnWindowFocus: false, // jangan refetch saat user kembali ke tab
    },
    mutations: {
      retry: 0, // mutasi tidak di-retry otomatis
    },
  },
});

// ─── Root ─────────────────────────────────────────────────────────────────────
// ─── Root ─────────────────────────────────────────────────────────────────────
createRoot(document.getElementById("root")).render(
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem={false}
    storageKey="sib_theme"
  >
    {/* React Query */}
    <QueryClientProvider client={queryClient}>
      {/* Auth state global */}
      <AuthProvider>
        {/* Router */}
        <BrowserRouter>
          <App />
        </BrowserRouter>

        {/* Toast notifikasi — posisi kanan atas */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              backdropFilter: "blur(12px)",
            },
            success: {
              iconTheme: {
                primary: "#00bfbf",
                secondary: "white",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "white",
              },
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>,
);
