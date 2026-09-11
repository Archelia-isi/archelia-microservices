const dotenv = require('dotenv');
dotenv.config();
async function main() {
  const res = await fetch(`${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002&limit=5`, {
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64') }
  });
  const data = JSON.parse(await res.text());
  console.log(Object.keys(data.data[0]));
}
main();
