const { Client } = require('typesense');

const url = new URL(process.env.TYPESENSE_URL);
const client = new Client({
  nodes: [{ host: url.hostname, port: url.port || (url.protocol === 'https:' ? '443' : '80'), protocol: url.protocol.replace(':', '') }],
  apiKey: process.env.TYPESENSE_ADMIN_KEY,
  connectionTimeoutSeconds: 5
});

async function run() {
  try {
    const res = await client.collections('products').documents().search({
      q: '*',
      filter_by: 'product_group:=CA && publishedOnWeb:true',
      per_page: 0
    });
    console.log('Typesense CA products:', res.found);
    
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const dbCount = await pool.query(`SELECT count(*) FROM products WHERE "productGroup" = 'CA' AND "publishedOnWeb" = true`);
    console.log('Database CA products:', dbCount.rows[0].count);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
  }
}
run();
