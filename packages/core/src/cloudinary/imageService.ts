import { log as logger } from '../logger.js';

const CLOUDINARY_CLOUD = 'dikvomlhu';
const CLOUDINARY_FOLDER = 'prodotti';
const MAP_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/raw/upload/${CLOUDINARY_FOLDER}/mappa_immagini.json`;

export type ImageMap = Record<string, string[]>;

export class ImageService {
  private imageMap: ImageMap | null = null;
  private normalizedMap: Map<string, string[]> | null = null;

  async loadImageMap(): Promise<ImageMap> {
    if (this.imageMap) return this.imageMap;

    try {
      const cacheBustUrl = `${MAP_URL}?t=${Date.now()}`;
      logger.info(`📸 Download mappa immagini da ${cacheBustUrl}...`, { module: 'core:cloudinary' });
      const response = await fetch(cacheBustUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      this.imageMap = await response.json() as ImageMap;

      this.normalizedMap = new Map();
      for (const [key, value] of Object.entries(this.imageMap)) {
        this.normalizedMap.set(key.toUpperCase(), value);
      }

      const articoli = Object.keys(this.imageMap).length;
      const totImmagini = Object.values(this.imageMap).reduce((s, arr) => s + arr.length, 0);
      logger.info(`📸 Mappa immagini caricata: ${articoli} articoli, ${totImmagini} immagini`, { module: 'core:cloudinary' });
      return this.imageMap;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Errore';
      logger.error(`❌ Errore download mappa immagini: ${msg}`, { module: 'core:cloudinary' });
      this.imageMap = {};
      this.normalizedMap = new Map();
      return this.imageMap;
    }
  }

  async reloadImageMap(): Promise<ImageMap> {
    this.imageMap = null;
    this.normalizedMap = null;
    return this.loadImageMap();
  }

  setImageMapDirect(map: ImageMap): void {
    this.imageMap = map;
    this.normalizedMap = new Map();
    for (const [key, value] of Object.entries(map)) {
      this.normalizedMap.set(key.toUpperCase(), value);
    }
    const articoli = Object.keys(map).length;
    const totImmagini = Object.values(map).reduce((s, arr) => s + arr.length, 0);
    logger.info(`📸 Mappa iniettata direttamente: ${articoli} articoli, ${totImmagini} immagini`, { module: 'core:cloudinary' });
  }

  extractShortCode(sku: string): string {
    if (!sku) return '';

    if (sku.includes('.')) {
      const beforeDot = sku.split('.')[0];
      return beforeDot.replace(/[^a-zA-Z0-9]/g, '');
    }

    if (sku.includes('-')) {
      const beforeDash = sku.split('-')[0];
      return beforeDash.replace(/[^a-zA-Z0-9]/g, '');
    }

    const prefixMatch = sku.match(/^([A-Za-z]{1,4}\d{1,3})/);
    if (prefixMatch) {
      return prefixMatch[1];
    }

    return sku.replace(/[^a-zA-Z0-9]/g, '');
  }

  buildImageUrl(publicId: string): string {
    const encodedId = publicId.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/upload/f_webp,q_auto/${encodedId}.webp`;
  }

  async getImagesForSku(sku: string): Promise<string[]> {
    await this.loadImageMap();
    if (!this.normalizedMap) return [];

    const shortCode = this.extractShortCode(sku);
    if (!shortCode) return [];

    const publicIds = this.normalizedMap.get(shortCode.toUpperCase());
    if (!publicIds || publicIds.length === 0) return [];

    const filtered = publicIds.filter(pid => {
      const hasParentheses = /\(.*\)/.test(pid);
      const isOne = /\(1\)\s*$/.test(pid);
      return hasParentheses && !isOne;
    });

    return filtered.map(pid => this.buildImageUrl(pid));
  }

  async getAllPublicIdsForSku(sku: string): Promise<{ public_id: string; url: string; name: string }[]> {
    await this.loadImageMap();
    if (!this.normalizedMap) return [];

    const shortCode = this.extractShortCode(sku);
    if (!shortCode) return [];

    const publicIds = this.normalizedMap.get(shortCode.toUpperCase());
    if (!publicIds || publicIds.length === 0) return [];

    return publicIds.map(pid => ({
      public_id: pid,
      url: this.buildImageUrl(pid),
      name: pid.replace('prodotti/', ''),
    }));
  }

  getStats() {
    if (!this.imageMap) return { loaded: false, articoli: 0, immagini: 0 };
    const articoli = Object.keys(this.imageMap).length;
    const immagini = Object.values(this.imageMap).reduce((s, arr) => s + arr.length, 0);
    return { loaded: true, articoli, immagini };
  }
}

export const imageService = new ImageService();
