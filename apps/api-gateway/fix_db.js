const { prisma } = require('@archelia/database');

async function main() {
  const desiredConfigs = [
    { jobId: 'sync-mid-zuc', enabled: false, intervalValue: 1, intervalUnit: 'days', startTime: '02:00' },
    { jobId: 'sync-promo', enabled: true, intervalValue: 1, intervalUnit: 'days', startTime: '00:30' },
    { jobId: 'sync-mid-zuc-stock', enabled: true, intervalValue: 30, intervalUnit: 'seconds', startTime: null },
    { jobId: 'sync-mid-zuc-price', enabled: true, intervalValue: 3, intervalUnit: 'days', startTime: '08:00' },
    { jobId: 'sync-shopify-push', enabled: false, intervalValue: 1, intervalUnit: 'days', startTime: '04:00' },
    { jobId: 'sync-stock', enabled: false, intervalValue: 30, intervalUnit: 'seconds', startTime: null }
  ];

  for (const c of desiredConfigs) {
    await prisma.schedulerConfig.upsert({
      where: { jobId: c.jobId },
      update: c,
      create: c
    });
    console.log(`Updated ${c.jobId}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
