const Redis = require('ioredis');

// Use the public Railway Redis URL
const redisUrl = "redis://default:hBzNmHlZrBeckCdUBBqrvlxCilqoctZX@hayabusa.proxy.rlwy.net:14144";
const redis = new Redis(redisUrl);

async function main() {
  try {
    console.log("Fetching osSettings for Salvatore (uppercase) from Redis...");
    const uppercaseSettings = await redis.get('osSettings:Salvatore');
    
    if (uppercaseSettings) {
      console.log("Found settings for uppercase Salvatore! Copying to lowercase salvatore...");
      await redis.set('osSettings:salvatore', uppercaseSettings);
      console.log("Successfully copied osSettings in Redis!");
    } else {
      console.log("No osSettings found for uppercase Salvatore.");
    }
    
    console.log("Checking if userPreference in PG needs migration...");
    // Just to be sure, check if there's anything else in Redis
    const keys = await redis.keys('*');
    console.log("All Redis keys:", keys);

  } catch (err) {
    console.error("Redis Error:", err);
  } finally {
    redis.quit();
  }
}
main();
