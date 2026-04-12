export function isValidConfig(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  // v3 existed briefly (link-mode experiment). Still accept it so stored configs
  // don't get replaced with defaults; server will normalize down to v2 on read/write.
  const versionOk = v.version === 3 || v.version === 2 || v.version === 1;
  return versionOk && (v.mode === 4 || v.mode === 8) && Array.isArray(v.predictions);
}
