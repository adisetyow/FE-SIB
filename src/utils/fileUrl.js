const API_BASE = import.meta.env.VITE_API_BASE_URL;
export function resolveFileUrl(url) {
  if (!url) return "";

  // sudah absolute → langsung pakai
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // pastikan tidak double slash
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
