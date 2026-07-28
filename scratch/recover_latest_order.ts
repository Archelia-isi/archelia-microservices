import { ShopifyAuthService } from '@archelia/shopify';
import { shopifyOrdersQueue, shopifyCustomersQueue } from '@archelia/core';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function recoverLatestOrder() {
  const shopify = new ShopifyAuthService();
  console.log('Cerco l\'ultimo ordine su Shopify...');

  // 1. Fetch latest order via REST API
  const response = await shopify.fetch('/orders.json?limit=1&status=any');
  if (!response.ok) {
    console.error('Errore durante il fetch dell\'ordine:', await response.text());
    return;
  }

  const data = await response.json();
  const latestOrder = data.orders && data.orders[0];

  if (!latestOrder) {
    console.log('Nessun ordine trovato.');
    return;
  }

  console.log(`Trovato ordine #${latestOrder.order_number} (ID: ${latestOrder.id}).`);

  // 2. Aggiungo prima il cliente in coda per sbloccare l'Interlock
  if (latestOrder.customer) {
    console.log(`Inietto il cliente ${latestOrder.customer.id} nella coda di BullMQ...`);
    await shopifyCustomersQueue.add('customer-create', latestOrder.customer);
    // Attendo 2 secondi per dare tempo al worker di processare il cliente su Zucchetti prima di inviare l'ordine
    await new Promise(r => setTimeout(r, 2000));
  }

  // 3. Aggiungo in coda come se fosse arrivato dal webhook
  console.log('Inietto l\'ordine nella coda di BullMQ...');
  await shopifyOrdersQueue.add('order-create', latestOrder);

  console.log('✅ Fatto! L\'ordine è stato spinto nella coda ed elaborato dal worker.');
  process.exit(0);
}

recoverLatestOrder().catch(err => {
  console.error(err);
  process.exit(1);
});
