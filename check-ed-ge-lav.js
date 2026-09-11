const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const res = await pool.query(`SELECT count(*) FROM products WHERE "productGroup" = 'ED' AND family = 'GE' AND category = 'LAV'`);
  console.log('ED -> GE -> LAV products:', res.rows[0].count);
  process.exit(0);
}
run();
