/** Tiny helper kept OUT of Hero3D so three.js stays in its lazy chunk. */
export function canRun3D(): boolean {
  const conn = (navigator as any).connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  if (typeof conn.effectiveType === 'string' && /(^|\b)2g/.test(conn.effectiveType))
    return false;
  return true;
}
