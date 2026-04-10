/**
 * api/patientsApi.js
 * Semua pemanggilan API untuk modul Patients
 */
import apiClient from "../utils/apiClient";

export const patientsApi = {
  // GET /api/v1/patients/
  listPatients: (params = {}) =>
    apiClient.get("/api/v1/patients/", { params }).then((r) => r.data),

  // GET /api/v1/patients/:id
  getPatient: (id) =>
    apiClient.get(`/api/v1/patients/${id}`).then((r) => r.data),

  // POST /api/v1/patients/
  createPatient: (data) =>
    apiClient.post("/api/v1/patients/", data).then((r) => r.data),

  // PUT /api/v1/patients/:id
  updatePatient: (id, data) =>
    apiClient.put(`/api/v1/patients/${id}`, data).then((r) => r.data),

  // DELETE /api/v1/patients/:id  (204 no content)
  deletePatient: (id) => apiClient.delete(`/api/v1/patients/${id}`),
};
