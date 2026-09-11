const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const cats = await pool.query('SELECT count(*) FROM product_categories');
  console.log('Categories count:', cats.rows[0].count);
  const groups = await pool.query('SELECT count(*) FROM product_groups');
  console.log('Groups count:', groups.rows[0].count);
  const families = await pool.query('SELECT count(*) FROM families');
  console.log('Families count:', families.rows[0].count);
  const cats2 = await pool.query('SELECT * FROM product_categories');
  console.log('Categories:', cats2.rows);
  process.exit(0);
}
run();
