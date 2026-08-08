import { Job } from 'bullmq';

export interface ISupplierStrategy {
  /**
   * Identificativo univoco del fornitore (es. 'ELMARK')
   */
  getSupplierId(): string;

  /**
   * Il processo di download e importazione asincrono
   */
  importCatalog(job: Job): Promise<void>;

  /**
   * (Opzionale) Sincronizzazione stock/prezzi
   */
  syncStockAndPrices?(job: Job): Promise<void>;

  /**
   * (Opzionale) Sincronizzazione immagini su Cloudinary
   */
  syncImages?(job: Job): Promise<void>;
}
