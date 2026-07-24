import { prisma } from './index.js';

async function main() {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { imageUrl: { contains: '(1)' } },
          { imageUrl: { contains: '%281%29' } }
        ]
      },
      select: { sku: true, imageUrl: true, imageUrls: true }
    });
    console.log(`Found ${products.length} products in Product table with (1) in imageUrl`);
    if (products.length > 0) {
       console.log('Sample from Product:', JSON.stringify(products.slice(0, 3), null, 2));
    }

    const mapped = await prisma.mappedImage.findMany({
      where: {
        OR: [
          { arfulres: { contains: '(1)' } },
          { arfulres: { contains: '%281%29' } }
        ]
      },
      take: 5
    });
    console.log(`Found ${mapped.length} mapped images with (1) in arfulres`);
    if (mapped.length > 0) {
       console.log('Sample from MappedImage:', JSON.stringify(mapped, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
