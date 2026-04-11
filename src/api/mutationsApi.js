/**
 * api/mutationsApi.js
 */
import apiClient from "../utils/apiClient";

export const mutationsApi = {
  listMutations: (params = {}) =>
    apiClient.get("/api/v1/mutations/", { params }).then((r) => r.data),

  getMutation: (id) =>
    apiClient.get(`/api/v1/mutations/${id}`).then((r) => r.data),

  createMutation: (data) =>
    apiClient.post("/api/v1/mutations/", data).then((r) => r.data),

  updateMutation: (id, data) =>
    apiClient.put(`/api/v1/mutations/${id}`, data).then((r) => r.data),

  deleteMutation: (id) => apiClient.delete(`/api/v1/mutations/${id}`),
};
