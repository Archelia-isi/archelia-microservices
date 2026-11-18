/**
 * Elenco permanente degli articoli Zucchetti/B2B disattivati manualmente sul portale B2B
 * (www.izzodistribuzione.it), nei Catalistini PDF e nelle sincronizzazioni automatiche Typesense.
 *
 * Anche se su Zucchetti ERP il flag `arpubweb` rimane 'S' o partono sync massivi / fast sync,
 * questi SKU vengono esclusi sia in scrittura su Typesense sia in lettura su tutti gli endpoint B2B.
 */
export const B2B_DISABLED_SKUS = [
  'IL216.HG570', // BINARIO ELETTRIFICATO TRIFASE 2 METRI
  'IL217.HG577', // Binario Elettrificato Trifase
  'IL218.HG585', // Giunto Elettrificato Trifase
  'IL219.HG572', // Mini connettore lineare per binari
  'IL220.HG586', // Terminale Chiusura Binario Elettrificato
  'IL226.HG577', // Binario elettrico trifase 1 Metro
  'IL227.HG585', // Giunto Trifase Rapido Henergia
] as const;

export const B2B_DISABLED_PRODUCT_IDS = [
  'cmmxeo9x0003ahp994ywyhlei', // IL216.HG570
  'cmmxneu43013y7r99tzbcfi3z', // IL217.HG577
  'cmmxojur101ybxt99k4j4s4n9', // IL218.HG585
  'cmmxndpca00ng7r993gh9mtg1', // IL219.HG572
  'cmmxnee2j00xi7r99xjuwnp87', // IL220.HG586
  'cmmxeq50c00qmhp99pmjuzego', // IL226.HG577
  'cmmxeovsr00c5hp99pn438ii3', // IL227.HG585
] as const;

const B2B_DISABLED_LOOKUP = new Set<string>([
  ...B2B_DISABLED_SKUS.map((s) => s.trim().toUpperCase()),
  ...B2B_DISABLED_PRODUCT_IDS.map((id) => id.trim().toUpperCase()),
]);

export const B2B_DISABLED_SKUS_TYPESENSE_LIST = B2B_DISABLED_SKUS.map(
  (sku) => `\`${sku}\``
).join(',');

export const B2B_DISABLED_SKUS_FILTER = `sku:!=[${B2B_DISABLED_SKUS_TYPESENSE_LIST}]`;

export function isB2bDisabledSku(skuOrId?: string | null): boolean {
  if (!skuOrId) return false;
  const normalized = String(skuOrId).trim().toUpperCase();
  if (!normalized) return false;
  return B2B_DISABLED_LOOKUP.has(normalized);
}

export function appendB2bDisabledSkusFilter(existingFilter?: string | null): string {
  const trimmed = String(existingFilter || '').trim();
  if (!trimmed) return B2B_DISABLED_SKUS_FILTER;
  if (trimmed.includes(B2B_DISABLED_SKUS_FILTER)) return trimmed;
  return `${trimmed} && ${B2B_DISABLED_SKUS_FILTER}`;
}
