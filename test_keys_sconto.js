const dotenv = require('dotenv');
dotenv.config();
async function main() {
  const url = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002&limit=5`;
  const headers = { 'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64') };
  const res = await fetch(url, { headers });
  const data = JSON.parse(await res.text());
  
  const allKeys = Object.keys(data.data[0]);
  console.log("Keys containing 'scont':", allKeys.filter(k => k.toLowerCase().includes('scont')));
  console.log("Keys containing 'perc':", allKeys.filter(k => k.toLowerCase().includes('perc')));
}
main();
