export interface TypesensePromoData {
  is_in_promo: boolean;
  promo_type?: string;
  promo_discount?: number;
  promo_slogan?: string;
  promo_badge?: string;
  promo_badge_color?: string;
  promo_start?: string;
  promo_end?: string;
}

// Temporary mock for typesense sync build, will be implemented fully in worker-promo
export const shopifyPromoService = {
  getActivePromosMap: async (bypassCache: boolean = false): Promise<Map<string, TypesensePromoData>> => {
    return new Map();
  }
};
