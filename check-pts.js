const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const res = await pool.query(`SELECT name FROM product_categories WHERE code = 'PTS'`);
  console.log('PTS name:', res.rows[0].name);
  process.exit(0);
}
run();
