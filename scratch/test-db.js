const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_QnzJT1yAcP3K@ep-mute-dew-ag6lwn81-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
});

pool.query('SELECT count(*) FROM "ZelShopifyOrder"', (err, res) => {
  if (err) {
    console.error('Error executing query', err.stack);
  } else {
    console.log('Result:', res.rows[0]);
  }
  pool.end();
});
