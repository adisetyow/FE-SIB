/**
 * App.jsx
 * Routing utama aplikasi:
 * - Public routes: /login, /register
 * - Protected routes: semua halaman lain (butuh login)
 * - Layout wrapper (Sidebar + Navbar + BottomNav) otomatis untuk protected routes
 */

import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./store/authStore";

// ── Layout ────────────────────────────────────────────────────────────────────
import MainLayout from "./components/layout/MainLayout";

// ── Auth Pages ────────────────────────────────────────────────────────────────
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";

// ── App Pages ─────────────────────────────────────────────────────────────────
import DashboardPage from "./pages/dashboard/DashboardPage";

import SequenceListPage from "./pages/genetics/SequenceListPage";
import SequenceDetailPage from "./pages/genetics/SequenceDetailPage";
import SequenceFormPage from "./pages/genetics/SequenceFormPage";

import AnalyzePage from "./pages/genetics/AnalyzePage";
import AnalysisComparePage from "./pages/analysis/AnalysisComparePage";

import PatientListPage from "./pages/patients/PatientListPage";
import PatientDetailPage from "./pages/patients/PatientDetailPage";
import PatientFormPage from "./pages/patients/PatientFormPage";

import MutationListPage from "./pages/mutations/MutationListPage";
import MutationFormPage from "./pages/mutations/MutationFormPage";
import MutationDetailPage from "./pages/mutations/MutationDetailPage";

import DiseaseListPage from "./pages/diseases/DiseaseListPage";
import DiseaseDetailPage from "./pages/diseases/DiseaseDetailPage";
import DiseaseFormPage from "./pages/diseases/DiseaseFormPage";

import EthnicityListPage from "./pages/ethnicities/EthnicityListPage";
import EthnicityFormPage from "./pages/ethnicities/EthnicityFormPage";

import EthnicSequenceListPage from "./pages/ethnic-sequences/EthnicSequenceListPage";
import EthnicSequenceFormPage from "./pages/ethnic-sequences/EthnicSequenceFormPage";
import EthnicSequenceDetailPage from "./pages/ethnic-sequences/EthnicSequenceDetailPage";

import LiteraturePage from "./pages/literature/LiteraturePage";
import ActivityPage from "./pages/activities/ActivityPage";

import AnalysisTaskPage from "./pages/analysis/AnalysisTaskPage";
import SearchPage from "./pages/search/SearchPage";
import NotFoundPage from "./pages/NotFoundPage";

// ─── Guard: Protected Route ───────────────────────────────────────────────────
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Masih cek localStorage → tampilkan layar kosong sebentar
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Belum login → redirect ke /login, simpan halaman tujuan
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Sudah login → render layout + child route
  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
}

// ─── Guard: Public Route (redirect jika sudah login) ─────────────────────────
function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Sudah login → redirect ke dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Routes>
      {/* ── Public Routes (hanya bisa diakses jika belum login) ── */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* ── Protected Routes (butuh login) ── */}
      <Route element={<ProtectedRoute />}>
        {/* Dashboard */}
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Genetics / Sequences */}
        <Route path="sequences" element={<SequenceListPage />} />
        <Route path="sequences/new" element={<SequenceFormPage />} />
        <Route path="sequences/:id" element={<SequenceDetailPage />} />
        <Route path="sequences/:id/edit" element={<SequenceFormPage />} />

        {/* Analyze — text/FASTA mode */}
        <Route path="analyze" element={<AnalyzePage />} />

        {/* Analysis Compare — async task */}
        <Route path="analyze/compare" element={<AnalysisComparePage />} />

        {/* Patients */}
        <Route path="patients" element={<PatientListPage />} />
        <Route path="patients/new" element={<PatientFormPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="patients/:id/edit" element={<PatientFormPage />} />

        {/* Mutations */}
        <Route path="/mutations" element={<MutationListPage />} />
        <Route path="/mutations/new" element={<MutationFormPage />} />
        <Route path="/mutations/:id" element={<MutationDetailPage />} />

        {/* Diseases */}
        <Route path="diseases" element={<DiseaseListPage />} />
        <Route path="diseases/new" element={<DiseaseFormPage />} />
        <Route path="diseases/:id" element={<DiseaseDetailPage />} />
        <Route path="diseases/:id/edit" element={<DiseaseFormPage />} />

        {/* Ethnicities */}
        <Route path="ethnicities" element={<EthnicityListPage />} />
        <Route path="ethnicities/new" element={<EthnicityFormPage />} />
        <Route path="ethnicities/:id/edit" element={<EthnicityFormPage />} />

        {/* Ethnic Sequences */}
        <Route path="ethnic-sequences" element={<EthnicSequenceListPage />} />
        <Route
          path="ethnic-sequences/new"
          element={<EthnicSequenceFormPage />}
        />
        <Route
          path="ethnic-sequences/:id"
          element={<EthnicSequenceDetailPage />}
        />
        <Route
          path="ethnic-sequences/:id/edit"
          element={<EthnicSequenceFormPage />}
        />

        {/* Literature */}
        <Route path="literature" element={<LiteraturePage />} />

        {/* Activities */}
        <Route path="activities" element={<ActivityPage />} />

        {/* Analysis Tasks */}
        <Route path="analysis/tasks" element={<AnalysisTaskPage />} />

        {/* Global Search */}
        <Route path="search" element={<SearchPage />} />
      </Route>

      {/* ── 404 ── */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
