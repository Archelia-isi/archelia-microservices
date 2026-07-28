import { prisma } from '@archelia/database';

async function run() {
  console.log('Cerco ordini di test da eliminare...');
  
  // Trova gli ordini
  const testOrders = await prisma.zelShopifyOrder.findMany({
    include: {
      zucchettiQueue: true
    }
  });

  const testEmails = [
    'info@archelia.it',
    'test.cliente@virgilio.it',
    'mario.rossi@example.com',
    'fake1785233960726@archeliatest.com'
  ];

  const ordersToDelete = testOrders.filter(order => {
    // 1. Order number contiene TEST o è numerico come #2777 ecc (solo test generati da script)
    if (order.orderNumber && order.orderNumber.includes('TEST')) return true;
    
    // 2. Email cliente (nella coda Zucchetti)
    let email = null;
    if (order.zucchettiQueue && typeof order.zucchettiQueue.payload === 'object' && order.zucchettiQueue.payload !== null) {
       const payload: any = order.zucchettiQueue.payload;
       email = payload?.customer?.email;
    }
    
    if (email && testEmails.includes(email)) return true;
    
    return false;
  });

  console.log(`Trovati ${ordersToDelete.length} ordini di test da eliminare.`);

  for (const o of ordersToDelete) {
    console.log(`Elimino ordine: ${o.orderNumber || o.shopifyOrderId}`);
    
    // Elimina prima da queue (foreign key / relazione)
    if (o.zucchettiQueue) {
      await prisma.zelZucchettiOrderQueue.delete({ where: { id: o.zucchettiQueue.id } });
    }
    
    // Elimina l'ordine
    await prisma.zelShopifyOrder.delete({ where: { id: o.id } });
  }

  console.log('✅ Pulizia ordini completata.');
}

run().catch(console.error).finally(() => prisma.$disconnect());
