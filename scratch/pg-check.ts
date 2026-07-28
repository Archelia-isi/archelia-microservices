import { Client } from 'pg';

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:pgKDBHmszohsWjGZcZgXDFDDBKnhyYfR@viaduct.proxy.rlwy.net:19904/railway"
  });

  await client.connect();
  const res = await client.query("SELECT \"shopifyId\", \"imageSrc\" FROM products LIMIT 3");
  console.log('Products:', res.rows);
  await client.end();
}

run().catch(console.error);
