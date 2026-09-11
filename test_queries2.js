const dotenv = require('dotenv');
dotenv.config();
async function main() {
  const queriesToTest = ['ZelClientiB2B', 'ZelClienti', 'zel_clienti', 'zzna_clienti_b2b'];
  for (const q of queriesToTest) {
    const url = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/${q}?company=A0002&limit=5`;
    const headers = { 'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64') };
    const res = await fetch(url, { headers });
    if(res.status === 200) {
      console.log(`Found ${q}!`);
      const text = await res.text();
      console.log(text.substring(0, 300));
    } else {
      console.log(`Not found ${q}`);
    }
  }
}
main();
