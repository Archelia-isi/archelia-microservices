const { Client } = require('pg');
require('dotenv').config({ path: '../../.env' });

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT * FROM public.user_preferences WHERE username='Salvatore'");
  if (res.rows.length > 0) {
    console.log("CURRENT CONFIG:", res.rows[0].widgetConfig);
  } else {
    console.log("No config found for Salvatore");
  }
  await client.end();
}
check().catch(console.error);
