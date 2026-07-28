import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const devUrl = "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-still-surf-ag5oqx54.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({ connectionString: devUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'dikvomlhu',
});
const CLOUDINARY_CLOUD = 'dikvomlhu';
const CLOUDINARY_FOLDER = 'prodotti';

type ImageMap = Record<string, string[]>;

class ImageService {
  private imageMap: ImageMap | null = null;
  private normalizedMap: Map<string, string[]> | null = null;

  async loadImageMap(): Promise<ImageMap> {
    const resource = await cloudinary.api.resource(`${CLOUDINARY_FOLDER}/mappa_immagini.json`, { resource_type: 'raw' });
    const versionedUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/raw/upload/v${resource.version}/${CLOUDINARY_FOLDER}/mappa_immagini.json`;
    
    console.log(`📸 Download mappa immagini (v${resource.version}) da ${versionedUrl}...`);
    const response = await fetch(versionedUrl);
    this.imageMap = await response.json() as ImageMap;

    this.normalizedMap = new Map();
    for (const [key, value] of Object.entries(this.imageMap)) {
      this.normalizedMap.set(key.toUpperCase(), value);
    }
    return this.imageMap;
  }

  extractShortCode(sku: string): string {
    if (!sku) return '';
    if (sku.includes('.')) return sku.split('.')[0].replace(/[^a-zA-Z0-9]/g, '');
    if (sku.includes('-')) return sku.split('-')[0].replace(/[^a-zA-Z0-9]/g, '');
    const prefixMatch = sku.match(/^([A-Za-z]{1,4}\d{1,3})/);
    if (prefixMatch) return prefixMatch[1];
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

  async syncImages() {
    console.log('📸 Inizio sync immagini da Cloudinary...');
    await this.loadImageMap();
    
    const products = await prisma.product.findMany({ select: { id: true, sku: true }, take: 10 });
    
    let withImages = 0;
    
    for (const product of products) {
      const urls = await this.getImagesForSku(product.sku);
      if (urls.length > 0) {
        withImages++;
        console.log(`✅ SKU ${product.sku} -> Trovata immagine: ${urls[0]}`);
      }
    }
    
    return { testCount: products.length, withImages };
  }
}

const srv = new ImageService();
srv.syncImages().then(res => {
  console.log("TEST CONCLUSO:", res);
  process.exit(0);
}).catch(err => {
  console.error("ERRORE:", err);
  process.exit(1);
});
