const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query("SELECT category, family, \"productGroup\" FROM products LIMIT 5");
  console.log(res.rows);
  process.exit(0);
}
run();
