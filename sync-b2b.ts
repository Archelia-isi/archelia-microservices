import 'dotenv/config';
import { prisma } from '@archelia/database';
import { Client } from 'typesense';

const typesenseUrl = process.env.TYPESENSE_URL || 'http://localhost:8108';
let host = typesenseUrl.replace('https://', '').replace('http://', '');
let protocol = typesenseUrl.startsWith('https') ? 'https' : 'http';
let port = typesenseUrl.startsWith('https') ? 443 : 8108;

if (host.includes(':')) {
  const parts = host.split(':');
  host = parts[0];
  port = parseInt(parts[1], 10);
}

const client = new Client({
  nodes: [{ host, port, protocol }],
  apiKey: process.env.TYPESENSE_ADMIN_KEY || 'default_key',
  connectionTimeoutSeconds: 10,
});

async function run() {
  const products = await prisma.product.findMany({
    select: { id: true, priceB2b: true, publishedOnB2b: true }
  });

  console.log(`Updating ${products.length} products...`);
  
  const batchSize = 250;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const updates = batch.map(p => ({
      id: String(p.id),
      price_b2b: p.priceB2b || 0,
      publishedOnB2b: Boolean(p.publishedOnB2b)
    }));

    try {
      await client.collections('products').documents().import(updates, { action: 'update' });
      console.log(`Updated batch ${i} to ${i + batch.length}`);
    } catch (e) {
      console.error(e);
    }
  }
  
  console.log("Done");
}
run();
