const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const count = await pool.query('SELECT count(*) FROM products WHERE "publishedOnB2b" = true');
  console.log('Published on B2B count:', count.rows[0].count);
  const total = await pool.query('SELECT count(*) FROM products');
  console.log('Total products count:', total.rows[0].count);
  process.exit(0);
}
run();
