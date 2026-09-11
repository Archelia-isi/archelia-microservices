const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const res = await pool.query(`SELECT count(*) FROM products WHERE "productGroup" = 'GRE' AND family = 'ELE'`);
  console.log('GRE -> ELE products:', res.rows[0].count);
  process.exit(0);
}
run();
