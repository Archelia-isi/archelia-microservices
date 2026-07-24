const { Client } = require('pg');
require('dotenv').config({ path: '../../.env' });

async function fix() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query("SELECT * FROM public.user_preferences WHERE username='Salvatore'");
  if (res.rows.length > 0) {
    let conf = JSON.parse(res.rows[0].widgetConfig);
    console.log("OLD CONFIG:", conf);
    conf.wallpaper = '/wallpapers/mac-dark.jpg';
    conf.desktopIcons = {}; // Reset icons to default
    await client.query("UPDATE public.user_preferences SET \"widgetConfig\" = $1 WHERE username='Salvatore'", [JSON.stringify(conf)]);
    console.log("Config restored to defaults!");
  }
  await client.end();
}
fix().catch(console.error);
