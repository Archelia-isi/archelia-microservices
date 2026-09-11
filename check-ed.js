const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
  const ed = await pool.query(`SELECT count(*) FROM products WHERE "productGroup" = 'ED'`);
  console.log('ED in DB:', ed.rows[0].count);
  const gre = await pool.query(`SELECT count(*) FROM products WHERE "productGroup" = 'GRE'`);
  console.log('GRE in DB:', gre.rows[0].count);
  process.exit(0);
}
run();
