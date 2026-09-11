import { prisma } from '@archelia/database';
import { zucchettiClient } from '@archelia/zucchetti';

const LISTINI_ECOMMERCE = ['ARC', 'VAELK'];
const LISTINI_B2B = ['B2B'];

async function main() {
  const result = await zucchettiClient.query('zzna_art_sal', { offset: '0', limit: '100000', pcpupdtms: '01-01-2000 00:00:00' });
  const articles = Array.isArray(result) ? result : (result as any).data || [];
  
  const filtered = articles.filter(a => a.arcodar2 === 'CA1.KOSH001');
  
  let newPrice = null;
  let newPriceB2b = null;
  
  for (const a of filtered) {
    if (LISTINI_ECOMMERCE.includes(a.licodlis)) {
        if (newPrice === null || parseFloat(a.liprezzo) > newPrice) newPrice = parseFloat(a.liprezzo);
    }
    if (LISTINI_B2B.includes(a.licodlis)) {
        if (newPriceB2b === null || parseFloat(a.liprezzo) > newPriceB2b) newPriceB2b = parseFloat(a.liprezzo);
    }
  }
  
  console.log("Calculated:", { newPrice, newPriceB2b });
  
  await prisma.product.update({
    where: { sku: 'CA1.KOSH001' },
    data: { price: newPrice, priceB2b: newPriceB2b }
  });
  console.log("DB Updated");
}

main().catch(console.error);
