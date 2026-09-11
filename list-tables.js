const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const res = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
  console.log('Tables:', res.rows.map(r => r.tablename));
  process.exit(0);
}
run();
