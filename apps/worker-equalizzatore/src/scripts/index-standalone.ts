import { Client } from 'typesense';
import fs from 'fs';
import path from 'path';

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

  const GUIDES_COLLECTION_NAME = 'guides';

  console.log('Initializing Schema...');
  const collections = await client.collections().retrieve();
  if (collections.some((c: any) => c.name === GUIDES_COLLECTION_NAME)) {
    console.log('Dropping existing collection...');
    await client.collections(GUIDES_COLLECTION_NAME).delete();
  }

  await client.collections().create({
    name: GUIDES_COLLECTION_NAME,
    fields: [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'content', type: 'string' },
      { name: 'category', type: 'string', facet: true }
    ]
  });

  const guidesDir = path.resolve(__dirname, '../../../../packages/ai/src/knowledge/guides');
  const files = fs.readdirSync(guidesDir).filter(f => f.endsWith('.md'));
  const documents: any[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(guidesDir, file), 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)/);
    
    let category = 'Generale';
    if (file.includes('illuminazione')) category = 'Illuminazione';
    if (file.includes('ferramenta')) category = 'Ferramenta';
    if (file.includes('elettricita')) category = 'Elettricità';

    documents.push({
      id: file.replace('.md', ''),
      title: titleMatch ? titleMatch[1].trim() : file,
      content: content,
      category: category
    });
  }

  if (documents.length > 0) {
    console.log(`Indexing ${documents.length} guides...`);
    await client.collections(GUIDES_COLLECTION_NAME).documents().import(documents, { action: 'upsert' });
    console.log('Done!');
  }
}

main().catch(console.error);
