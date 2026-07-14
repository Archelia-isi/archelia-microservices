import { searchProducts, searchGuides } from '@archelia/typesense';

async function main() {
  const message = "devo illuminare la mia cucina ed ho bisogno di un lampadario di design e di tutta la strumentazione per fissarlo al soffitto.";
  
  const searchQueries = ["lampadario design", "trapano", "tasselli", "viti", "morsetti", "cavo elettrico"];
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
