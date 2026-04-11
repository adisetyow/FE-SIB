/**
 * api/diseasesApi.js
 * Catatan dari API:
 * - GET list   → array DiseaseListResponse (ada ethnicity_count, mutation_count)
 * - GET detail → DiseaseDetailResponse (ada at_risk_ethnicities[], mutations[])
 * - POST/PUT   → bisa sertakan ethnicity_ids[] untuk relasi etnis
 * - DELETE     → gagal jika masih ada mutasi terhubung
 */
import apiClient from "../utils/apiClient";

export const diseasesApi = {
  listDiseases: (params = {}) =>
    apiClient.get("/api/v1/diseases", { params }).then((r) => r.data),

  getDisease: (id) =>
    apiClient.get(`/api/v1/diseases/${id}`).then((r) => r.data),

  createDisease: (data) =>
    apiClient.post("/api/v1/diseases", data).then((r) => r.data),

  updateDisease: (id, data) =>
    apiClient.put(`/api/v1/diseases/${id}`, data).then((r) => r.data),

  deleteDisease: (id) => apiClient.delete(`/api/v1/diseases/${id}`),
};
