import { prisma } from '@archelia/database';

async function main() {
  const shopifyId = '8891134607624';
  const order = await prisma.zelShopifyOrder.findUnique({
    where: { shopifyOrderId: shopifyId },
    include: { zucchettiQueue: true }
  });
  console.log('Order:', JSON.stringify(order, null, 2));
  
  const cust = await prisma.zelShopifyCustomer.findFirst();
  console.log('Cust:', cust ? cust.shopifyId : null);
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
