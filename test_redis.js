const Redis = require('ioredis');
require('dotenv').config();
const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });

async function run() {
  await redis.connect();
  const payload = JSON.stringify({
    level: "INFO",
    message: "👋 Ciao! Questo è un log generato in diretta per testare il sistema.",
    category: "api-gateway",
    details: JSON.stringify({ test: true }),
    createdAt: new Date().toISOString()
  });
  await redis.publish('archelia:logs', payload);
  console.log("Log pubblicato su Redis!");
  setTimeout(() => process.exit(0), 1000);
}
run();
