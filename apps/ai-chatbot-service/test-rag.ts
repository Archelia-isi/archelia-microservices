import { Client } from 'typesense';

async function searchProducts(q: string) {
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
  return await client.collections('products').documents().search({
    q: q,
    query_by: 'title,description,technical_desc,family',
    per_page: 50
  });
}

async function main() {
  const searchQueries = ["lampadario design", "trapano", "punte trapano", "tasselli", "viti", "morsetti"];
  console.log("Queries:", searchQueries);

  const productPromises = searchQueries.map(q => searchProducts(q));
  const productsResultsArray = await Promise.all(productPromises);
  
  const uniqueHitsMap = new Map();
  productsResultsArray.forEach(res => {
    const topHitsForQuery = (res.hits || []).slice(0, 4);
    topHitsForQuery.forEach((hit: any) => {
      if (!uniqueHitsMap.has(hit.document.sku)) {
        uniqueHitsMap.set(hit.document.sku, hit);
      }
    });
  });
  const hits = Array.from(uniqueHitsMap.values());
  
  console.log(`Trovati ${hits.length} prodotti unici.`);
  
  let searchContext = "RISULTATI RICERCA CATALOGO ARCHELIA:\n";
  hits.slice(0, 20).forEach((hit: any, index: number) => {
    const doc = hit.document;
    searchContext += `${index + 1}. Nome: ${doc.title} (SKU: ${doc.sku}) | Prezzo: €${doc.price} | Categoria: ${doc.family}\n`;
  });

  console.log("\n--- CONTESTO PRODOTTI ---");
  console.log(searchContext);
}

main().catch(console.error);
