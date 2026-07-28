import { processOrderSync } from './src/mappers/order.js';
import { prisma } from '@archelia/core';

const fakeOrder = {
  id: Date.now(), // ID univoco per simulare sempre uno nuovo
  order_number: Math.floor(Math.random() * 10000) + 1000,
  created_at: new Date().toISOString(),
  total_price: "199.99",
  current_total_price: "199.99",
  name: `#${Math.floor(Math.random() * 10000) + 1000}`,
  customer: {
    id: 123456789,
    first_name: 'Mario',
    last_name: 'Rossi',
    email: 'mario.rossi@example.com'
  }
};

async function run() {
  console.log('Avvio simulazione ordine...');
  try {
    await processOrderSync(fakeOrder);
    console.log('✅ Simulazione completata con successo! Attendo 3 secondi per le email...');
    await new Promise(r => setTimeout(r, 3000));
  } catch (err) {
    console.error('❌ Errore durante la simulazione:', err);
  }
  process.exit(0);
}

run();
