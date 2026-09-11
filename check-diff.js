const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const diff = await pool.query('SELECT count(*) FROM products WHERE "publishedOnB2b" = true AND ("publishedOnWeb" = false OR "publishedOnWeb" IS NULL)');
  console.log('Published on B2B but not Web:', diff.rows[0].count);
  process.exit(0);
}
run();
