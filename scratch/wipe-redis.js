const { Redis } = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
async function main() {
  const keys = await redis.keys('b2b_cart_v2:*');
  if (keys.length > 0) {
    await redis.del(...keys);
    console.log(`Deleted ${keys.length} cart keys.`);
  } else {
    console.log('No cart keys found.');
  }
}
main().catch(console.error).finally(() => process.exit(0));
