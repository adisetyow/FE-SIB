export function toDateOnly(val) {
  if (!val) return null;

  // pastikan hanya YYYY-MM-DD
  return val.split("T")[0];
}
