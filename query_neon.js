const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function main() {
  const rows = await sql`SELECT * FROM scheduler_config;`;
  console.log(JSON.stringify(rows, null, 2));
}
main().catch(console.error);
