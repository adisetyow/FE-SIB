import api from "../utils/apiClient";

export const getLiteratures = (params) =>
  api.get("/api/v1/literature/", { params });
export const getLiteratureById = (id) => api.get(`/api/v1/literature/${id}`);
export const createLiterature = (data) => api.post("/api/v1/literature/", data);
export const updateLiterature = (id, data) =>
  api.put(`/api/v1/literature/${id}`, data);
export const deleteLiterature = (id) => api.delete(`/api/v1/literature/${id}`);
