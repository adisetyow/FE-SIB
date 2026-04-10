import api from "../utils/apiClient";

// ── MOCK DATA UNTUK DASHBOARD ──
export const getDashboardStats = () => {
  return Promise.resolve({
    data: {
      total_sequences: 1250,
      total_patients: 48,
      total_mutations: 342,
      total_diseases: 15,
    },
  });
};

// Endpoint Analysis (Dari Skema OpenAPI)
export const compareLocal = (data) =>
  api.post("/api/v1/analysis/compare-local", data);
export const getAnalysisTasks = (params) =>
  api.get("/api/v1/analysis/tasks", { params });
export const getAnalysisTaskById = (id) =>
  api.get(`/api/v1/analysis/tasks/${id}`);
