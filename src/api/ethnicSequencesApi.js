/**
 * api/ethnicSequencesApi.js
 * Semua pemanggilan API untuk modul Ethnic Sequences.
 *
 * Catatan penting dari dokumentasi API:
 * - POST create  → multipart/form-data (file + metadata sekaligus)
 * - PUT update   → JSON (metadata saja, file TIDAK bisa diubah)
 * - DELETE       → hapus data + file dari disk
 * - ID sequence  → UUID string, bukan integer
 */
import apiClient, { createFormDataRequest } from "../utils/apiClient";

export const ethnicSequencesApi = {
  // GET /api/v1/ethnic-sequences/
  listEthnicSequences: (params = {}) =>
    apiClient.get("/api/v1/ethnic-sequences/", { params }).then((r) => r.data),

  // GET /api/v1/ethnic-sequences/:id
  getEthnicSequence: (id) =>
    apiClient.get(`/api/v1/ethnic-sequences/${id}`).then((r) => r.data),

  // POST /api/v1/ethnic-sequences/
  // Body: multipart/form-data
  // Field: ethnicity_name (string), data_type (NORMAL|MUTANT), description? (string), file (binary)
  createEthnicSequence: (fields, file, onProgress) => {
    const form = new FormData();
    form.append("ethnicity_name", fields.ethnicity_name);
    form.append("data_type", fields.data_type);
    if (fields.description) form.append("description", fields.description);
    form.append("file", file);
    return createFormDataRequest(
      "/api/v1/ethnic-sequences/",
      form,
      onProgress,
    ).then((r) => r.data);
  },

  // PUT /api/v1/ethnic-sequences/:id
  // Body: JSON — hanya metadata (ethnicity_name, data_type, description)
  // File TIDAK bisa diubah — harus hapus lalu upload ulang
  updateEthnicSequence: (id, data) =>
    apiClient
      .put(`/api/v1/ethnic-sequences/${id}`, {
        ethnicity_name: data.ethnicity_name || null,
        data_type: data.data_type || null,
        description: data.description || null,
      })
      .then((r) => r.data),

  // DELETE /api/v1/ethnic-sequences/:id (204 no content)
  deleteEthnicSequence: (id) =>
    apiClient.delete(`/api/v1/ethnic-sequences/${id}`),

  // GET /api/v1/ethnic-sequences/master/data-types
  // Untuk dropdown data_type (NORMAL / MUTANT) — tidak butuh token
  getDataTypes: () =>
    apiClient
      .get("/api/v1/ethnic-sequences/master/data-types")
      .then((r) => r.data),
};
