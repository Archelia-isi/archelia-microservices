import { Client } from 'typesense';

const typesenseUrl = process.env.TYPESENSE_URL || process.env.TYPESENSE_PUBLIC_URL || 'http://localhost:8108';
let host = typesenseUrl.replace('https://', '').replace('http://', '');
let protocol = typesenseUrl.startsWith('https') ? 'https' : 'http';
let port = typesenseUrl.startsWith('https') ? 443 : 8108;

if (host.includes(':')) {
  const parts = host.split(':');
  host = parts[0];
  port = parseInt(parts[1], 10);
}

export const typesenseClient = new Client({
  nodes: [
    {
      host: host,
      port: port,
      protocol: protocol,
    },
  ],
  apiKey: process.env.TYPESENSE_ADMIN_KEY || 'default_key',
  connectionTimeoutSeconds: 10,
});

export const PRODUCTS_COLLECTION_NAME = 'products';
export const GUIDES_COLLECTION_NAME = 'guides';
