const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='products'");
  console.log('Columns:', res.rows.map(r => r.column_name));
  process.exit(0);
}
run();
