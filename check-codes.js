const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const cats = await pool.query("SELECT * FROM product_categories LIMIT 5");
  console.log("product_categories:", cats.rows);
  const groups = await pool.query("SELECT * FROM product_groups LIMIT 5");
  console.log("product_groups:", groups.rows);
  const fams = await pool.query("SELECT * FROM families LIMIT 5");
  console.log("families:", fams.rows);
  const hcats = await pool.query("SELECT * FROM homogeneous_categories LIMIT 5");
  console.log("homogeneous_categories:", hcats.rows);
  process.exit(0);
}
run();
