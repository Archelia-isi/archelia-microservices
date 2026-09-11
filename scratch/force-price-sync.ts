import { prisma } from '@archelia/database';
import { zucchettiClient } from '@archelia/zucchetti';

const LISTINI_ECOMMERCE = ['ARC', 'VAELK'];
const LISTINI_B2B = ['B2B'];

async function main() {
  console.log("Fetching all articles from Zucchetti...");
  const page = await zucchettiClient.query('zzna_art_sal', {
    offset: '0', limit: '200000', pcpupdtms: '01-01-2000 00:00:00'
  });
  
  const articles = Array.isArray(page) ? page : (page as any).data || [];
  console.log(`Found ${articles.length} total records from Zucchetti.`);
  
  const filtered = articles.filter((a: any) => LISTINI_ECOMMERCE.includes(a.licodlis) || LISTINI_B2B.includes(a.licodlis));
  console.log(`Filtered down to ${filtered.length} records matching our lists.`);

  const skuAggregated = new Map<string, any>();
  for (const a of filtered) {
    const sku = a.arcodar2;
    if (!sku) continue;

    let newPrice = parseFloat(a.liprezzo) || 0;
    const moltip = parseFloat(a.armoltip) || 1;
    if (a.arunmis2 && moltip > 0 && moltip !== 1) {
      newPrice = parseFloat((newPrice * moltip).toFixed(2));
    }

    const existing = skuAggregated.get(sku) || { sku, newPrice: null, priceList: null, newPriceB2b: null, priceListB2b: null };
    
    if (LISTINI_ECOMMERCE.includes(a.licodlis)) {
       if (existing.newPrice === null || newPrice > existing.newPrice) {
         existing.newPrice = newPrice;
         existing.priceList = a.licodlis;
       }
    } else if (LISTINI_B2B.includes(a.licodlis)) {
       if (existing.newPriceB2b === null || newPrice > existing.newPriceB2b) {
         existing.newPriceB2b = newPrice;
         existing.priceListB2b = a.licodlis;
       }
    }
    skuAggregated.set(sku, existing);
  }

  const updates = Array.from(skuAggregated.values());
  console.log(`Prepared ${updates.length} unique products for DB update.`);

  const CONCURRENCY = 50;
  let updatedCount = 0;
  
  for (let i = 0; i < updates.length; i += CONCURRENCY) {
    const batch = updates.slice(i, i + CONCURRENCY);
    const promises = batch.map((u: any) => {
       const updateData: any = {};
       if (u.newPrice !== null) {
          updateData.price = u.newPrice;
          updateData.priceList = u.priceList;
       }
       if (u.newPriceB2b !== null) {
          updateData.priceB2b = u.newPriceB2b;
          updateData.priceListB2b = u.priceListB2b;
       }
       
       if (Object.keys(updateData).length === 0) return Promise.resolve();
       
       return prisma.product.updateMany({
         where: { sku: u.sku },
         data: updateData
       });
    });

    await Promise.allSettled(promises);
    updatedCount += batch.length;
    if (updatedCount % 1000 === 0) console.log(`Updated ${updatedCount}/${updates.length} products in DB`);
  }
  
  console.log("DB Update complete!");
}

main().catch(console.error);
