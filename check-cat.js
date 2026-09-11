const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const res = await pool.query(`SELECT "productGroup", COUNT(*) FROM products GROUP BY "productGroup" ORDER BY count DESC`);
  console.log(res.rows);
  process.exit(0);
}
run();
