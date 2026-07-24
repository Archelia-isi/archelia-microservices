const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();

    console.log('--- Checking products with multiple images ---');
    const res = await client.query(`
      SELECT sku, "imageUrl", "imageUrls" 
      FROM products 
      WHERE "imageUrls"::text LIKE '%,%'
      LIMIT 3
    `);
    
    console.log('Sample from products:', JSON.stringify(res.rows, null, 2));

  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.end();
  }
}
main();
