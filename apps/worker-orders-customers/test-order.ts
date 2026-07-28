import { processOrderSync } from './src/mappers/order.js';
import { prisma } from '@archelia/core';

process.env.TELEGRAM_BOT_TOKEN = "8918642135:AAHtPHBOpUb593ol88j0xIStC7RVSuIDcBg";

const fakeOrder = {
  id: Date.now(), // ID univoco per simulare sempre uno nuovo
  name: `#TEST-${Math.floor(Math.random() * 10000)}`,
  created_at: new Date().toISOString(),
  total_price: "245.50",
  subtotal_price: "238.50",
  shipping_lines: [
    { title: "Spedizione Express", price: "7.00" }
  ],
  line_items: [
    { product_id: 12010629955848, title: "Centralino Incasso Elmark 36 Moduli", sku: "E167.60366", price: "38.38", quantity: 1 },
    { title: "Interruttore Magnetotermico 2P 16A", sku: "MT-2P-16A", price: "12.50", quantity: 4 },
    { title: "Placca Bticino Living Now Nera", sku: "LNC-4803NR", price: "8.20", quantity: 10 },
    { title: "Presa Schuko Bticino Living Now", sku: "K4140A16", price: "5.45", quantity: 10 },
    { title: "Relè Passo Passo Finder 26.01", sku: "FND-2601", price: "13.62", quantity: 1 }
  ],
  customer: {
    id: 123456789, // Un ID inventato (causerà un warning dell'interlock Zucchetti, che va bene)
    first_name: "Gianluca",
    last_name: "Arianese",
    email: "test.cliente@virgilio.it"
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
