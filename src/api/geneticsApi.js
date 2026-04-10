/**
 * api/geneticsApi.js
 * Semua pemanggilan API untuk modul Genetics:
 * - Sequences (CRUD)
 * - Analyze (text + FASTA small + FASTA stream)
 * - Master data (dropdown)
 */
import apiClient, {
  createFormDataRequest,
  streamingFastaRequest,
} from "../utils/apiClient";

// ─── Sequences ────────────────────────────────────────────────────────────────
export const geneticsApi = {
  // GET /api/v1/genetics/sequences
  listSequences: (params = {}) =>
    apiClient.get("/api/v1/genetics/sequences", { params }).then((r) => r.data),

  // GET /api/v1/genetics/sequences/:id
  getSequence: (id) =>
    apiClient.get(`/api/v1/genetics/sequences/${id}`).then((r) => r.data),

  // POST /api/v1/genetics/sequences
  createSequence: (data) =>
    apiClient.post("/api/v1/genetics/sequences", data).then((r) => r.data),

  // PUT /api/v1/genetics/sequences/:id
  updateSequence: (id, data) =>
    apiClient.put(`/api/v1/genetics/sequences/${id}`, data).then((r) => r.data),

  // DELETE /api/v1/genetics/sequences/:id  (204 no content)
  deleteSequence: (id) => apiClient.delete(`/api/v1/genetics/sequences/${id}`),

  // ── Analyze ────────────────────────────────────────────────────────────────

  // POST /api/v1/genetics/analyze  (text sequence)
  analyzeSequence: (data) =>
    apiClient.post("/api/v1/genetics/analyze", data).then((r) => r.data),

  // POST /api/v1/genetics/analyze/fasta/small  (file ≤ 50 MB)
  analyzeFastaSmall: (
    file,
    checkNcbi = false,
    searchLiterature = true,
    onProgress,
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("check_ncbi", String(checkNcbi));
    form.append("search_literature", String(searchLiterature));
    return createFormDataRequest(
      "/api/v1/genetics/analyze/fasta/small",
      form,
      onProgress,
    ).then((r) => r.data);
  },

  // POST /api/v1/genetics/analyze/fasta  (stream, file besar)
  analyzeFastaStream: (
    file,
    checkNcbi = false,
    searchLiterature = true,
    onChunk,
    onDone,
    onError,
  ) => {
    const form = new FormData();
    form.append("file", file);
    form.append("check_ncbi", String(checkNcbi));
    form.append("search_literature", String(searchLiterature));
    return streamingFastaRequest(form, onChunk, onDone, onError);
  },

  // ── Master Data (dropdown) ─────────────────────────────────────────────────
  getSequenceTypes: () =>
    apiClient.get("/api/v1/genetics/master/sequence-types").then((r) => r.data),

  getStrands: () =>
    apiClient.get("/api/v1/genetics/master/strands").then((r) => r.data),

  getProcessStatus: () =>
    apiClient.get("/api/v1/genetics/master/process-status").then((r) => r.data),
};
