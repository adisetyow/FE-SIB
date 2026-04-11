/**
 * api/searchApi.js
 * Catatan dari API:
 * - GET /api/v1/search/global?q=keyword → cari di Penyakit, Mutasi, Etnis, Sequence
 *   Response schema tidak didefinisikan (open object) — kita handle flexibel
 * - GET /api/v1/search/blast?sequence=ATCG... → BLAST ke NCBI (min 10 basa)
 *   Response schema open object juga
 * - Kedua endpoint TIDAK butuh authentication (tidak ada security di docs)
 */
import apiClient from "../utils/apiClient";

export const searchApi = {
  // GET /api/v1/search/global?q=...
  globalSearch: (query) =>
    apiClient
      .get("/api/v1/search/global", { params: { q: query } })
      .then((r) => r.data),

  // GET /api/v1/search/blast?sequence=...
  blastSearch: (sequence) =>
    apiClient
      .get("/api/v1/search/blast", { params: { sequence } })
      .then((r) => r.data),
};
