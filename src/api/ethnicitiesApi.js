/**
 * api/ethnicitiesApi.js
 * Catatan:
 * - DELETE gagal jika masih ada pasien dengan etnis ini
 * - List response → EthnicityListResponse (ada patient_count)
 */
import apiClient from "../utils/apiClient";

export const ethnicitiesApi = {
  listEthnicities: (params = {}) =>
    apiClient.get("/api/v1/ethnicities/", { params }).then((r) => r.data),

  getEthnicity: (id) =>
    apiClient.get(`/api/v1/ethnicities/${id}`).then((r) => r.data),

  createEthnicity: (data) =>
    apiClient.post("/api/v1/ethnicities/", data).then((r) => r.data),

  updateEthnicity: (id, data) =>
    apiClient.put(`/api/v1/ethnicities/${id}`, data).then((r) => r.data),

  deleteEthnicity: (id) => apiClient.delete(`/api/v1/ethnicities/${id}`),
};
