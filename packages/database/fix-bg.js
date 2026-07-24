const { Client } = require('pg');
require('dotenv').config({ path: '../../.env' });

async function fixBg() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT * FROM public.user_preferences WHERE username='Salvatore'");
  if (res.rows.length > 0) {
    let conf = JSON.parse(res.rows[0].widgetConfig);
    conf.wallpaper = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2940&auto=format&fit=crop';
    await client.query("UPDATE public.user_preferences SET \"widgetConfig\" = $1 WHERE username='Salvatore'", [JSON.stringify(conf)]);
    console.log("Wallpaper fixed!");
  }
  await client.end();
}
fixBg().catch(console.error);
