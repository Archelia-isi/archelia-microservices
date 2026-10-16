export async function searchBySkuPrefixClient(q: string, storeMode: string = 'ZUCCHETTI'): Promise<any[]> {
  if (!q || !q.trim()) return [];

  try {
    const res = await fetch(`/api/search/sku?q=${encodeURIComponent(q.trim())}&storeMode=${encodeURIComponent(storeMode)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.hits || [];
  } catch (error) {
    console.error('searchBySkuPrefixClient error:', error);
    return [];
  }
}
