import { prisma } from '@archelia/database';

async function main() {
  const products = await prisma.elmarkProcessedProduct.findMany({
    where: {
      OR: [
        { category: { contains: 'electrical', mode: 'insensitive' } },
        { family: { contains: 'electrical', mode: 'insensitive' } },
        { productGroup: { contains: 'electrical', mode: 'insensitive' } },
        { originalName: { contains: 'electrical', mode: 'insensitive' } }
      ]
    },
    take: 5
  });
  console.log(products.map(p => ({
     sku: p.sku, 
     category: p.category, 
     family: p.family, 
     productGroup: p.productGroup,
     originalName: p.originalName
  })));
}
main();
