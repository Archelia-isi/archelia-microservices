const { log } = require('@archelia/core');
const { prisma } = require('@archelia/database');
async function test() {
  log.info("Questo è un log di test tramite PubSub", { module: 'api-gateway' });
  console.log("Log pubblicato.");
  setTimeout(async () => {
    const logs = await prisma.logEntry.findMany({
      where: { message: { contains: "Questo è un log di test tramite PubSub" } }
    });
    console.log("Log in DB:", logs.length);
    process.exit(0);
  }, 2000);
}
test();
