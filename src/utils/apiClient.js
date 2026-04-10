/**
 * apiClient.js
 * Axios instance terpusat dengan:
 * - Base URL dari environment variable
 * - Interceptor: otomatis sisipkan Bearer token di setiap request
 * - Interceptor: handle 401 (token expired → redirect login)
 * - Error normalization (ubah error jadi pesan yang ramah)
 */

import axios from "axios";

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Buat file .env di root project dan isi:
// VITE_API_BASE_URL=http://localhost:8000
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// ─── Create Instance ──────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30 detik (analisis NCBI bisa lambat)
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Request Interceptor: Sisipkan Token ─────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor: Handle Error Global ───────────────────────────────
apiClient.interceptors.response.use(
  // Sukses: langsung return data
  (response) => response,

  // Error: normalize dan handle 401
  (error) => {
    const status = error.response?.status;

    // 401 Unauthorized → token expired atau tidak valid
    if (status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("sib_user");
      // Redirect ke login, kecuali sudah di halaman login/register
      const isAuthPage = ["/login", "/register"].includes(
        window.location.pathname,
      );
      if (!isAuthPage) {
        window.location.href = "/login";
      }
    }

    // Normalize error message
    const normalizedError = normalizeError(error);
    return Promise.reject(normalizedError);
  },
);

// ─── Helper: Normalize Error ─────────────────────────────────────────────────
/**
 * Mengubah berbagai bentuk error dari API menjadi format yang konsisten:
 * { message: string, status: number, details: any }
 */
function normalizeError(error) {
  // Network error (backend tidak bisa diakses)
  if (!error.response) {
    return {
      message:
        "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.",
      status: 0,
      details: null,
      originalError: error,
    };
  }

  const { status, data } = error.response;

  // FastAPI validation error (422)
  if (status === 422 && data?.detail) {
    const details = Array.isArray(data.detail) ? data.detail : [data.detail];
    const messages = details.map((d) => {
      const field = d.loc ? d.loc.slice(1).join(".") : "field";
      return `${field}: ${d.msg}`;
    });
    return {
      message: messages.join(", "),
      status,
      details: data.detail,
      originalError: error,
    };
  }

  // Error dengan message string
  if (data?.message) {
    return {
      message: data.message,
      status,
      details: data,
      originalError: error,
    };
  }

  // Error dengan detail string
  if (typeof data?.detail === "string") {
    return {
      message: data.detail,
      status,
      details: data,
      originalError: error,
    };
  }

  // Fallback berdasarkan status code
  const statusMessages = {
    400: "Permintaan tidak valid.",
    401: "Sesi Anda telah berakhir. Silakan login kembali.",
    403: "Anda tidak memiliki akses ke sumber daya ini.",
    404: "Data yang diminta tidak ditemukan.",
    409: "Terjadi konflik data.",
    500: "Terjadi kesalahan pada server. Coba lagi nanti.",
    502: "Server sedang tidak tersedia.",
    503: "Layanan sementara tidak tersedia.",
  };

  return {
    message: statusMessages[status] || `Terjadi kesalahan (${status}).`,
    status,
    details: data,
    originalError: error,
  };
}

// ─── Helper: Upload File (FormData) ──────────────────────────────────────────
/**
 * Khusus untuk upload file — Content-Type diset otomatis oleh browser
 * (jangan pernah set Content-Type manual saat pakai FormData!)
 */
export function createFormDataRequest(endpoint, formData, onUploadProgress) {
  const token = localStorage.getItem("access_token");
  return apiClient.post(endpoint, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    onUploadProgress: onUploadProgress
      ? (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onUploadProgress(percent);
        }
      : undefined,
  });
}

// ─── Helper: Login (form-urlencoded) ─────────────────────────────────────────
/**
 * Login pakai application/x-www-form-urlencoded (OAuth2 standard)
 * Field "username" diisi dengan email (sesuai dokumentasi API)
 */
export function loginRequest(email, password) {
  const params = new URLSearchParams();
  params.append("username", email); // ← field namanya username tapi isinya email
  params.append("password", password);

  return apiClient.post("/api/v1/auth/login", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
}

// ─── Helper: Streaming NDJSON (untuk FASTA besar) ────────────────────────────
/**
 * Handle NDJSON streaming response dari /api/v1/genetics/analyze/fasta
 * Panggil onChunk untuk setiap baris JSON yang diterima
 */
export async function streamingFastaRequest(
  formData,
  onChunk,
  onDone,
  onError,
) {
  const token = localStorage.getItem("access_token");
  try {
    const response = await fetch(`${BASE_URL}/api/v1/genetics/analyze/fasta`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // JANGAN set Content-Type — browser set otomatis dengan boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.detail || `HTTP error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // simpan baris tidak lengkap

      for (const line of lines) {
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            onChunk(json);
          } catch {
            // skip baris bukan JSON
          }
        }
      }
    }

    onDone?.();
  } catch (err) {
    onError?.(err);
  }
}

export default apiClient;
