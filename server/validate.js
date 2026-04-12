export function isValidConfig(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  const versionOk = v.version === 3 || v.version === 2 || v.version === 1;
  return versionOk && (v.mode === 4 || v.mode === 8) && Array.isArray(v.predictions);
}
