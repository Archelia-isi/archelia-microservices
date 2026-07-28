const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query('SELECT "totalPrice" FROM "zel_zucchetti_order_queue" LIMIT 1');
    console.log("totalPrice column exists! Rows:", res.rows);
  } catch(e) {
    console.error("ERROR querying zel_zucchetti_order_queue:", e.message);
  }
  
  try {
    const res2 = await client.query('SELECT count(*) FROM "cart_sync_queue"');
    console.log("cart_sync_queue exists! Count:", res2.rows[0]);
  } catch(e) {
    console.error("ERROR querying cart_sync_queue:", e.message);
  }
  await client.end();
}
run();
