const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const url = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002&__limit=1000`;
  const urlFilter = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002&andescri=*FERR*`;
  
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json'
  };

  try {
    const res = await fetch(urlFilter, { headers });
    const text = await res.text();
    const data = JSON.parse(text);
    console.log("Filtered records:", data.data ? data.data.length : 'none');
    if (data.data && data.data.length > 0) {
       console.log(data.data[0].andescri);
    }
  } catch(e) {
    console.error(e);
  }
}
main();
