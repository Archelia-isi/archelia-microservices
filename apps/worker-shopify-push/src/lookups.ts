export function normalizeKey(key: string): string {
  const normalized = key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // rimuovi accenti
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 30);
    
  return normalized.length === 1 ? `${normalized}_` : normalized;
}

export function parseTechnicalDesc(desc: string | null): { data: Record<string, string>; originalKeys: Record<string, string> } {
  const data: Record<string, string> = {};
  const originalKeys: Record<string, string> = {};

  if (!desc) return { data, originalKeys };

  const parts = desc.split(';');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    const value = trimmed.substring(colonIndex + 1).trim();

    if (key && value && key.length < 50) {
      const normalized = normalizeKey(key);
      if (normalized) {
        data[normalized] = value;
        originalKeys[normalized] = key;
      }
    }
  }

  return { data, originalKeys };
}
