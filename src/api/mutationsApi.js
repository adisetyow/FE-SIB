/**
 * api/mutationsApi.js
 *
 * Semua fungsi API untuk modul Mutations.
 * Endpoints:
 *   GET    /api/v1/mutations                → list dengan filter
 *   POST   /api/v1/mutations                → create
 *   GET    /api/v1/mutations/:id            → detail (include disease + patient)
 *   PUT    /api/v1/mutations/:id            → update
 *   DELETE /api/v1/mutations/:id            → delete (204)
 *
 * Cara pakai:
 *   import { mutationsApi } from "../../api/mutationsApi";
 *   await mutationsApi.listMutations({ sequence_id: 5 })
 */
import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// Axios instance dengan token otomatis dari localStorage
const api = axios.create({ baseURL: BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: lempar error message yang lebih ramah
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const detail = err.response?.data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg).join(", ")
          : err.message;
    return Promise.reject(new Error(message));
  },
);

export const mutationsApi = {
  /**
   * GET /api/v1/mutations
   * Query params yang didukung API:
   *   skip, limit, sequence_id, disease_id, mutation_type, search
   *
   * Response: MutationListResponse[] — sudah include patient & disease_info
   */
  listMutations: (params = {}) => api.get("/api/v1/mutations/", { params }),

  /**
   * GET /api/v1/mutations/:id
   * Response: MutationResponse — include disease (MutationDiseaseInfo) + patient (MutationPatientInfo)
   */
  getMutation: (id) => api.get(`/api/v1/mutations/${id}`),

  /**
   * POST /api/v1/mutations
   * Body (MutationCreate):
   *   Required: position, normal_base, mutation_base, mutation_type, sequence_id
   *   Optional: code, description, disease_id
   *
   * Backend memvalidasi sequence_id dan disease_id (jika diisi) benar-benar ada.
   * Response: MutationResponse (201)
   */
  createMutation: (data) => api.post("/api/v1/mutations/", data),

  /**
   * PUT /api/v1/mutations/:id
   * Body (MutationUpdate): semua field optional
   * Response: MutationResponse (200)
   */
  updateMutation: (id, data) => api.put(`/api/v1/mutations/${id}`, data),

  /**
   * DELETE /api/v1/mutations/:id
   * Response: 204 No Content
   */
  deleteMutation: (id) => api.delete(`/api/v1/mutations/${id}`),
};
