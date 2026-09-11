const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const urlFilter = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002&__limit=5`;
  
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json'
  };

  try {
    let res = await fetch(urlFilter, { headers });
    let text = await res.text();
    let data = JSON.parse(text);
    console.log("Filtered length:", data.data ? data.data.length : 'none');
  } catch(e) {
    console.error(e);
  }
}
main();
