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
    query_by: 'title,description,technical_desc'
  });

  console.log('Trapano Hits:', searchResults.hits?.length);

  const tasselliResults = await client.collections('products').documents().search({
    q: 'tassell',
    query_by: 'title,description,technical_desc'
  });

  console.log('Tasselli Hits:', tasselliResults.hits?.length);
}

main().catch(console.error);
