const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();

    console.log('--- Checking products table ---');
    const res = await client.query(`
      SELECT sku, "imageUrl"
      FROM products 
      WHERE "imageUrl" LIKE '%(1)%' OR "imageUrl" LIKE '%\\%281\\%29%'
    `);
    
    // Manual double-check in JS
    const actualMatches = res.rows.filter(r => r.imageUrl && (r.imageUrl.includes('(1)') || r.imageUrl.includes('%281%29')));
    
    console.log(`Found ${actualMatches.length} products in products table with (1) in imageUrl`);
    if (actualMatches.length > 0) {
       console.log('Sample from products:', JSON.stringify(actualMatches.slice(0, 5), null, 2));
    }
  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.end();
  }
}
main();
