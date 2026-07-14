import fs from 'fs';
import path from 'path';
import { typesenseClient, initializeGuidesSchema, GUIDES_COLLECTION_NAME } from '@archelia/typesense';

async function main() {
  console.log('Initializing Guides Schema...');
  await initializeGuidesSchema();

  const guidesDir = path.resolve(__dirname, '../../../../packages/ai/src/knowledge/guides');
  const files = fs.readdirSync(guidesDir).filter(f => f.endsWith('.md'));

  const documents: any[] = [];

  for (const file of files) {
    const filePath = path.join(guidesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract title from the first line (e.g. # Guida Pratica: ...)
    const titleMatch = content.match(/^#\s+(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : file.replace('.md', '');

    // Determine category based on filename
    let category = 'Generale';
    if (file.includes('illuminazione')) category = 'Illuminazione';
    if (file.includes('ferramenta')) category = 'Ferramenta';
    if (file.includes('elettricita')) category = 'Elettricità';

    documents.push({
      id: file.replace('.md', ''),
      title: title,
      content: content,
      category: category
    });
  }

  if (documents.length > 0) {
    console.log(`Indexing ${documents.length} guides into Typesense...`);
    try {
      const results = await typesenseClient.collections(GUIDES_COLLECTION_NAME).documents().import(documents, { action: 'upsert' });
      console.log('Import results:', results);
    } catch (err) {
      console.error('Error importing documents:', err);
    }
  } else {
    console.log('No guides found to index.');
  }
}

main().catch(console.error);
