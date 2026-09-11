import { Client } from 'typesense';
import dotenv from 'dotenv';
dotenv.config();

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
  nodes: [{
    host: host,
    port: port,
    protocol: protocol,
  }],
  apiKey: process.env.TYPESENSE_ADMIN_KEY || 'default_key',
  connectionTimeoutSeconds: 10,
});

async function run() {
  try {
    await client.collections('products').update({
      fields: [
        { name: 'price_b2b', type: 'float', facet: true, optional: true },
        { name: 'publishedOnB2b', type: 'bool', facet: true, optional: true },
      ]
    });
    console.log("Schema updated.");
  } catch (e) {
    console.error(e);
  }
}
run();
