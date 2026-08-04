const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('./.env'));

const client = new Client({
  connectionString: envConfig.DATABASE_URL,
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, username, role, "isRoot" FROM "admin_users" WHERE username=$1', ['Salvatore']);
  console.log('Salvatore:', res.rows[0]);
  
  // also check if there is any other user
  const all = await client.query('SELECT id, username, role, "isRoot" FROM "admin_users"');
  console.log('All users:', JSON.stringify(all.rows, null, 2));
  await client.end();
}
main().catch(console.error);
