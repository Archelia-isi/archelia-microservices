const { prisma } = require('./dist/index.js');

async function run() {
  console.log('Fetching from ElmarkProcessedProduct...');
  const anyProducts = await prisma.elmarkProcessedProduct.findMany({ take: 20 });
  for (const p of anyProducts) {
     await insert(p);
  }
  console.log('Done!');
}

async function insert(p) {
  await prisma.equalizzatoreStaging.upsert({
    where: { sourceId: p.elmarkCode },
    create: {
      sourceId: p.elmarkCode,
      sku: p.sku,
      pipelineStatus: 'COMPLETED',
      reviewStatus: 'PENDING_TEXT',
      phase1Payload: p.semanticTags || { color: "Nero" },
      phase2Payload: { aesthetic_score: 8 },
      phase3Payload: { 
        seo_title: p.seoTitle || p.title || "Titolo generico",
        seo_description: p.seoDescription || "Descrizione test",
        copy_html: p.commercialDescHtml || "<p>Testo commerciale</p>"
      }
    },
    update: {}
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
