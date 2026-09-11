const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const res = await pool.query(`SELECT "productGroup", family, category, title FROM products WHERE title ILIKE '%frullatore%' OR title ILIKE '%phon%' OR title ILIKE '%microonde%' LIMIT 10`);
  console.log(res.rows);
  process.exit(0);
}
run();
