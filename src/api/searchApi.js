import api from "../utils/apiClient";

// Berdasarkan skema, endpoint pencariannya adalah global dan blast
export const globalSearch = (query) =>
  api.get("/api/v1/search/global", {
    params: { q: query },
  });

export const blastSearch = (sequence) =>
  api.get("/api/v1/search/blast", {
    params: { sequence },
  });

// Mempertahankan fungsi bawaan Anda yang dialihkan ke global search
export const searchMutations = (query) =>
  api.get("/api/v1/search/global", { params: { q: query } });

export const searchDiseases = (query) =>
  api.get("/api/v1/search/global", { params: { q: query } });
