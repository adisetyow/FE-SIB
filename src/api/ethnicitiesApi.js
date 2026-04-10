import api from "../utils/apiClient";

export const getEthnicities = (params) =>
  api.get("/api/v1/ethnicities/", { params });
export const getEthnicityById = (id) => api.get(`/api/v1/ethnicities/${id}`);
export const createEthnicity = (data) => api.post("/api/v1/ethnicities/", data);
export const updateEthnicity = (id, data) =>
  api.put(`/api/v1/ethnicities/${id}`, data);
export const deleteEthnicity = (id) => api.delete(`/api/v1/ethnicities/${id}`);
