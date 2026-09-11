const dotenv = require('dotenv');
dotenv.config();
async function main() {
  const url = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_sconti?company=A0002&limit=5`;
  const headers = { 'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64') };
  const res = await fetch(url, { headers });
  if(res.status === 200) {
     const data = JSON.parse(await res.text());
     console.log(data.data[0]);
  } else {
     console.log("Not found or error:", res.status);
  }
}
main();
