const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Import environment variables from the root .env
require('dotenv').config({ path: '.env' });

async function run() {
  const redisUrl = 'redis://default:1W02R9s1N9S0A6y0z6R1@viaduct.proxy.rlwy.net:47287';
  console.log('Connecting to Redis:', redisUrl);
  const connection = new IORedis(redisUrl);
  const queue = new Queue('shopify-orders-queue', { connection });

  const fakeOrder = {
    id: Date.now(),
    name: `#TEST-${Math.floor(Math.random() * 10000)}`,
    created_at: new Date().toISOString(),
    total_price: "99.99",
    current_total_price: "99.99",
    customer: {
      id: 123456789,
      first_name: "Test",
      last_name: "User",
      email: "test@example.com"
    }
  };

  await queue.add('order-create', fakeOrder);
  console.log('✅ Ordine di test accodato su Redis! Il worker remoto lo processerà a breve.');
  
  process.exit(0);
}

run().catch(console.error);
