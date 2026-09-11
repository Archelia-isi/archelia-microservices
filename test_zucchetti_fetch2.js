const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const url = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002`;
  
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json'
  };

  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    const data = JSON.parse(text);
    console.log("Total records:", data.data ? data.data.length : (data.dataset ? data.dataset.length : 'unknown'));
  } catch(e) {
    console.error(e);
  }
}
main();
