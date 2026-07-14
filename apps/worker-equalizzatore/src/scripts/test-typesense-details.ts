import { Client } from 'typesense';

async function main() {
  const typesenseUrl = process.env.TYPESENSE_URL || process.env.TYPESENSE_PUBLIC_URL || 'http://localhost:8108';
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

  const searchResults = await client.collections('products').documents().search({
    q: 'trapano',
    query_by: 'title,description,technical_desc',
    per_page: 5
  });

  console.log('--- TRAPANO ---');
  (searchResults.hits || []).forEach(h => console.log((h.document as any).title));

  const punteResults = await client.collections('products').documents().search({
    q: 'punte',
    query_by: 'title,description,technical_desc',
    per_page: 5
  });

  console.log('--- PUNTE ---');
  (punteResults.hits || []).forEach(h => console.log((h.document as any).title));
}

main().catch(console.error);
