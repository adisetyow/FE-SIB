/**
 * api/searchApi.js
 *
 * Endpoints:
 *   GET /api/v1/search/global?q={query}
 *     → Pencarian data-centric: Penyakit, Mutasi, Etnis, Sequence sekaligus.
 *       Jika hasil lokal kosong, backend menyarankan NCBI dan melakukan PubMed search.
 *       Response schema tidak terdefinisi eksplisit di API (schema: {}) — kita
 *       handle secara defensive dengan optional chaining.
 *
 *   GET /api/v1/search/blast?sequence={dnaSequence}
 *     → BLAST ke NCBI. Input: DNA/RNA sequence min. 10 basa.
 *       Returns: hits dengan e-values, identity scores.
 *       Response schema juga tidak terdefinisi eksplisit — kita parse defensif.
 *       CATATAN: BLAST bisa lambat (10–60 detik) karena query ke NCBI eksternal.
 *
 * Kedua endpoint TIDAK memerlukan auth (tidak ada "security" di spec).
 * Namun token tetap dikirim jika ada, untuk konsistensi.
 */
import axios from "axios";

const BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const api = axios.create({
  baseURL: BASE,
  // BLAST bisa lambat — timeout lebih panjang
  timeout: 90_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.code === "ECONNABORTED") {
      return Promise.reject(
        new Error(
          "Request timeout. BLAST membutuhkan waktu lebih lama, coba lagi.",
        ),
      );
    }
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

export const searchApi = {
  /**
   * Global search — mencari di semua entitas sekaligus.
   * @param {string} q - query string
   * @returns {Promise<Object>} - hasil search, struktur dinamis dari backend
   */
  globalSearch: (q) => api.get("/api/v1/search/global", { params: { q } }),

  /**
   * BLAST search — query ke NCBI.
   * @param {string} sequence - DNA/RNA sequence, min. 10 basa
   * @returns {Promise<Object>} - BLAST hits dengan e-value, identity, dsb.
   */
  blastSearch: (sequence) =>
    api.get("/api/v1/search/blast", { params: { sequence } }),
};
