/**
 * api/analysisApi.js
 * Semua pemanggilan API untuk modul Sequence Analysis.
 *
 * Flow kerja (dari dokumentasi API):
 * 1. POST /api/v1/analysis/compare-local
 *    → Kirim: sample_sequence (string, min 10 char) + reference_sequence_id (UUID)
 *    → Terima: { task_id, status: "PENDING", message }
 *    → Response: 202 Accepted (bukan 200)
 *
 * 2. GET /api/v1/analysis/tasks/{task_id}  ← polling
 *    → Status: PENDING → PROCESSING → COMPLETED | FAILED
 *    → Saat COMPLETED: ada mutations[], total_mutations, alignment_summary
 *
 * 3. GET /api/v1/analysis/tasks  ← list semua task milik user
 *    → Filter: status, reference_sequence_id
 */
import apiClient from '../utils/apiClient'

export const analysisApi = {

  // POST /api/v1/analysis/compare-local
  // Response 202 — task berjalan di background
  startAnalysis: (data) =>
    apiClient.post('/api/v1/analysis/compare-local', {
      sample_sequence:      data.sample_sequence,
      reference_sequence_id: data.reference_sequence_id,
    }).then(r => r.data),

  // GET /api/v1/analysis/tasks/{task_id}
  getTask: (taskId) =>
    apiClient.get(`/api/v1/analysis/tasks/${taskId}`).then(r => r.data),

  // GET /api/v1/analysis/tasks
  listTasks: (params = {}) =>
    apiClient.get('/api/v1/analysis/tasks', { params }).then(r => r.data),
}