export function isValidConfig(value) {
  if (!value || typeof value !== "object") return false;
  return value.version === 1 && (value.mode === 4 || value.mode === 8) && Array.isArray(value.predictions);
}