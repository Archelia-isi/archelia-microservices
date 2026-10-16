export const STOCK_META_SEPARATOR = '||__STOCK_META__:';

export interface SavedOrderAdjustment {
  sku: string;
  originalQty: number;
  currentQty: number;
  availableStock: number;
}

export interface SavedOrderStockMeta {
  origQty: Record<string, number>;
  adjusted: Record<string, SavedOrderAdjustment>;
}

export function parseSavedOrderStockMeta(notes?: string | null): {
  cleanNotes: string;
  meta: SavedOrderStockMeta;
  hasAdjustments: boolean;
  adjustedCount: number;
  adjustedList: SavedOrderAdjustment[];
} {
  const defaultMeta: SavedOrderStockMeta = { origQty: {}, adjusted: {} };
  if (!notes) {
    return {
      cleanNotes: '',
      meta: defaultMeta,
      hasAdjustments: false,
      adjustedCount: 0,
      adjustedList: []
    };
  }

  const sepIndex = notes.indexOf(STOCK_META_SEPARATOR);
  if (sepIndex === -1) {
    return {
      cleanNotes: notes,
      meta: defaultMeta,
      hasAdjustments: false,
      adjustedCount: 0,
      adjustedList: []
    };
  }

  const cleanNotes = notes.slice(0, sepIndex);
  const rawJson = notes.slice(sepIndex + STOCK_META_SEPARATOR.length);

  try {
    const parsed = JSON.parse(rawJson);
    const meta: SavedOrderStockMeta = {
      origQty: parsed?.origQty && typeof parsed.origQty === 'object' ? parsed.origQty : {},
      adjusted: parsed?.adjusted && typeof parsed.adjusted === 'object' ? parsed.adjusted : {}
    };
    const adjustedList = Object.values(meta.adjusted);
    return {
      cleanNotes,
      meta,
      hasAdjustments: adjustedList.length > 0,
      adjustedCount: adjustedList.length,
      adjustedList
    };
  } catch {
    return {
      cleanNotes,
      meta: defaultMeta,
      hasAdjustments: false,
      adjustedCount: 0,
      adjustedList: []
    };
  }
}

export function serializeSavedOrderNotes(cleanNotes: string, meta: SavedOrderStockMeta): string {
  const base = cleanNotes || 'Ordine salvato dal cliente';
  return `${base}${STOCK_META_SEPARATOR}${JSON.stringify(meta)}`;
}
