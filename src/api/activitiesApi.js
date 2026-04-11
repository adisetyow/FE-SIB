/**
 * api/activitiesApi.js
 * Catatan dari API:
 * - Create activity bisa sekaligus kirim tools[] dan evidences[]
 * - Upload evidence file dulu → dapat URL → gunakan saat add evidence
 * - POST /activities/:id/evidence → tambah evidence ke activity yang ada (201, no body)
 * - Response 201 untuk create, 204 untuk delete
 */
import apiClient, { createFormDataRequest } from "../utils/apiClient";

export const activitiesApi = {
  // GET /api/v1/activities/
  listActivities: (params = {}) =>
    apiClient.get("/api/v1/activities/", { params }).then((r) => r.data),

  // GET /api/v1/activities/:id
  getActivity: (id) =>
    apiClient.get(`/api/v1/activities/${id}`).then((r) => r.data),

  // POST /api/v1/activities/upload-evidence  → multipart
  uploadEvidence: (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    return createFormDataRequest(
      "/api/v1/activities/upload-evidence",
      form,
      onProgress,
    ).then((r) => r.data);
  },

  // POST /api/v1/activities/
  createActivity: (data) =>
    apiClient.post("/api/v1/activities/", data).then((r) => r.data),

  // PUT /api/v1/activities/:id
  updateActivity: (id, data) =>
    apiClient.put(`/api/v1/activities/${id}`, data).then((r) => r.data),

  // DELETE /api/v1/activities/:id  (204)
  deleteActivity: (id) => apiClient.delete(`/api/v1/activities/${id}`),

  // POST /api/v1/activities/:id/evidence
  addEvidence: (activityId, data) =>
    apiClient
      .post(`/api/v1/activities/${activityId}/evidence`, data)
      .then((r) => r.data),
};
