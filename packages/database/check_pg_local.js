const { Client } = require('pg');
async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT id, username, email, length(\"passwordHash\") as hash_len FROM admin_users;");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
main().catch(console.error);
