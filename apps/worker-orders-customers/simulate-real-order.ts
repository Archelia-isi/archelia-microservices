import { prisma } from '@archelia/database';
import { processOrderSync } from './src/mappers/order';

async function run() {
  console.log('Cerco 5 prodotti reali nel database...');
  
  // Trova 5 prodotti validi
  const products = await prisma.product.findMany({
    where: { shopifyId: { startsWith: 'gid://shopify/Product/' } },
    take: 5
  });
  
  if (products.length < 5) {
    console.log('Non ho trovato 5 prodotti. Trovati:', products.length);
    return;
  }

  // Costruisci le line_items per Shopify
  const line_items = products.map((p, i) => {
    // Estrai ID numerico da "gid://shopify/Product/12345"
    const numId = parseInt(p.shopifyId.split('/').pop() || '0');
    return {
      product_id: numId,
      title: p.title,
      sku: p.sku || `SKU-TEST-${i}`,
      price: (p.price || 10.99).toString(),
      quantity: Math.floor(Math.random() * 3) + 1
    };
  });

  const totalProductsPrice = line_items.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
  const shippingPrice = 7.90;
  const totalPrice = totalProductsPrice + shippingPrice;

  const fakeOrder = {
    id: Date.now(),
    name: `#TEST-${Math.floor(Math.random() * 1000)}`,
    email: "info@archelia.it",
    total_price: totalPrice.toFixed(2),
    created_at: new Date().toISOString(),
    customer: {
      id: 123456789,
      email: "info@archelia.it",
      first_name: "Mario",
      last_name: "Rossi",
      phone: "+393331234567"
    },
    billing_address: {
      first_name: "Mario",
      last_name: "Rossi",
      address1: "Via Roma 1",
      city: "Milano",
      zip: "20100",
      country: "Italy"
    },
    shipping_lines: [
      {
        title: "Spedizione Corriere Espresso",
        price: shippingPrice.toFixed(2)
      }
    ],
    line_items: line_items
  };

  console.log('Avvio simulazione ordine con i seguenti prodotti:');
  line_items.forEach(l => console.log(`- ${l.title} (x${l.quantity}) - €${l.price}`));
  
  try {
    await processOrderSync(fakeOrder);
    console.log('✅ Simulazione inviata ai notification manager! Attendi qualche secondo...');
    // Aspettiamo un paio di secondi per dar tempo a email/telegram di partire (essendo processOrderSync asincrono internamente per i catch)
    await new Promise(r => setTimeout(r, 4000));
    console.log('Completato.');
  } catch (err) {
    console.error('Errore durante processOrderSync:', err);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
