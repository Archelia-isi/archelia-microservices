import { Client } from 'pg';

async function run() {
  const client = new Client({
    connectionString: "postgresql://neondb_owner:oP3mR2tCgYlS@ep-rapid-wind-a2y2w676-pooler.eu-central-1.aws.neon.tech/v2-development?sslmode=require"
  });

  await client.connect();
  const res = await client.query("SELECT config FROM global_settings WHERE id = 'default'");
  let config = res.rows[0].config;
  if (typeof config === 'string') config = JSON.parse(config);
  
  config.telegramChatId = '-1003965079266';
  
  await client.query("UPDATE global_settings SET config = $1 WHERE id = 'default'", [JSON.stringify(config)]);
  console.log('Fatto! Nuovo Chat ID impostato.');
  await client.end();
}

run().catch(console.error);
