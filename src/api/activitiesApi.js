import api from "../utils/apiClient";

export const getActivities = (params) =>
  api.get("/api/v1/activities/", { params });
export const getActivityById = (id) => api.get(`/api/v1/activities/${id}`);
export const createActivity = (data) => api.post("/api/v1/activities/", data);
export const updateActivity = (id, data) =>
  api.put(`/api/v1/activities/${id}`, data);
export const deleteActivity = (id) => api.delete(`/api/v1/activities/${id}`);
