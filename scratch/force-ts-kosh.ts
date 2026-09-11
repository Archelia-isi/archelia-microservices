import { prisma } from '@archelia/database';
import { syncProductToTypesense } from '@archelia/typesense';

async function main() {
  const p = await prisma.product.findUnique({ where: { sku: 'CA1.KOSH001' } });
  if (p) {
    await syncProductToTypesense(p);
    console.log("Typesense updated for CA1.KOSH001");
  } else {
    console.log("Product not found");
  }
}
main().catch(console.error);
