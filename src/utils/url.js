export const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function resolveFileUrl(url) {
  if (!url) return "";

  // jika sudah absolute URL → langsung pakai
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // jika relative → gabungkan dengan BASE_URL
  return `${BASE_URL}${url}`;
}
