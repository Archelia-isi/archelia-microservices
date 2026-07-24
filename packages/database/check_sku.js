const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'
  });

  try {
    await client.connect();

    const sku = 'SC55.8004-05';
    console.log(`--- Checking product ${sku} in DB ---`);
    const res = await client.query(`
      SELECT sku, "shopifyId", "imageUrl", "imageUrls" 
      FROM products 
      WHERE sku ILIKE $1
    `, [sku]);
    
    if (res.rowCount > 0) {
       console.log(JSON.stringify(res.rows[0], null, 2));
    } else {
       console.log('Product not found in DB!');
    }

  } catch (err) {
    console.error('DB Error:', err);
  } finally {
    await client.end();
  }
}
main();
