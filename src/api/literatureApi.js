/**
 * api/literatureApi.js
 * Catatan dari API:
 * - Upload file dulu → dapat URL → baru create literature dengan URL tsb
 * - Response 201 untuk create
 * - GET list → LiteratureListResponse (tanpa abstract/full content)
 * - GET detail → LiteratureResponse (lengkap + file_url)
 */
import apiClient, { createFormDataRequest } from "../utils/apiClient";

export const literatureApi = {
  // GET /api/v1/literature/
  listLiterature: (params = {}) =>
    apiClient.get("/api/v1/literature/", { params }).then((r) => r.data),

  // GET /api/v1/literature/:id
  getLiterature: (id) =>
    apiClient.get(`/api/v1/literature/${id}`).then((r) => r.data),

  // POST /api/v1/literature/upload-file  → multipart, return { url }
  uploadFile: (file, onProgress) => {
    const form = new FormData();
    form.append("file", file);
    return createFormDataRequest(
      "/api/v1/literature/upload-file",
      form,
      onProgress,
    ).then((r) => r.data);
  },

  // POST /api/v1/literature/  → JSON body
  createLiterature: (data) =>
    apiClient.post("/api/v1/literature/", data).then((r) => r.data),

  // PUT /api/v1/literature/:id
  updateLiterature: (id, data) =>
    apiClient.put(`/api/v1/literature/${id}`, data).then((r) => r.data),

  // DELETE /api/v1/literature/:id  (204)
  deleteLiterature: (id) => apiClient.delete(`/api/v1/literature/${id}`),
};
