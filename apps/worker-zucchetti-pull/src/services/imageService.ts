import { logger } from '@archelia/core';
import { prisma } from '@archelia/database';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const CLOUDINARY_CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'dikvomlhu';
const CLOUDINARY_FOLDER = 'prodotti';

type ImageMap = Record<string, string[]>;

class ImageService {
  private imageMap: ImageMap | null = null;
  private normalizedMap: Map<string, string[]> | null = null;

  async loadImageMap(): Promise<ImageMap> {
    if (this.imageMap) return this.imageMap;

    try {
      const resource = await cloudinary.api.resource(`${CLOUDINARY_FOLDER}/mappa_immagini.json`, { resource_type: 'raw' });
      const versionedUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/raw/upload/v${resource.version}/${CLOUDINARY_FOLDER}/mappa_immagini.json`;
      
      logger.info(`📸 Download mappa immagini (v${resource.version}) da ${versionedUrl}...`);
      const response = await fetch(versionedUrl);
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
      logger.info(`📸 Mappa immagini caricata: ${articoli} articoli, ${totImmagini} immagini`);
      return this.imageMap;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Errore Sconosciuto';
      logger.error(`❌ Errore download mappa immagini: ${msg}`);
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

  /**
   * Main cron job process: Fetches images map and updates local products with URLs.
   */
  async syncImages() {
    logger.info('📸 Inizio sync immagini da Cloudinary...');
    await this.reloadImageMap();
    
    // Fetch all products from Neon DB
    const products = await prisma.product.findMany({ select: { id: true, sku: true } });
    
    let withImages = 0;
    let withoutImages = 0;
    
    logger.info(`Trovati ${products.length} prodotti locali da verificare.`);
    
    for (const product of products) {
      const urls = await this.getImagesForSku(product.sku);
      
      await prisma.product.update({
        where: { id: product.id },
        data: { 
          imageUrl: urls[0] || null, 
          imageUrls: urls.length > 0 ? urls : undefined 
        },
      });
      
      if (urls.length > 0) {
        withImages++;
      } else {
        withoutImages++;
      }
    }
    
    const result = { total: products.length, withImages, withoutImages, updated: withImages };
    logger.info(`📸 Sync immagini completato! Risultato: ${JSON.stringify(result)}`);
    return result;
  }
}

export const imageService = new ImageService();
