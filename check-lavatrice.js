const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const res = await pool.query(`SELECT "productGroup", family, category, title FROM products WHERE title ILIKE '%lavatrice%' OR title ILIKE '%frigorifero%' LIMIT 20`);
  console.log(res.rows);
  process.exit(0);
}
run();
