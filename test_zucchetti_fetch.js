const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const url = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002`;
  console.log("Fetching", url);
  
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json'
  };

  try {
    const res = await fetch(url, { headers });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log(text.substring(0, 1000));
  } catch(e) {
    console.error(e);
  }
}
main();
