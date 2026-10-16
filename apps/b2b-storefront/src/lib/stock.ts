export function getAvailableStock(product: any, storeMode?: string): number {
  if (!product) return 0;

  if (storeMode === 'ELMARK' || product.catalog_source === 'elmark' || product.brand === 'ELMARK') {
    return Math.max(0, Math.floor(Number(product.stock ?? 0)));
  }

  if ('stock_main' in product || 'stock_ek' in product) {
    const main = Math.max(0, Math.floor(Number(product.stock_main ?? 0)));
    const ek = Math.max(0, Math.floor(Number(product.stock_ek ?? 0)));
    const sum = main + ek;
    const rawStock = Math.max(0, Math.floor(Number(product.stock ?? 0)));
    return Math.max(sum, rawStock);
  }

  return Math.max(0, Math.floor(Number(product.stock ?? 0)));
}
