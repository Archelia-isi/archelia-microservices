const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const urlFilter = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002&Andescri=FERR*`;
  const urlFilter2 = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002&Andescri=*FERR*`;
  
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json'
  };

  try {
    let res = await fetch(urlFilter, { headers });
    let text = await res.text();
    let data = JSON.parse(text);
    console.log("Filtered 1:", data.data ? data.data.length : 'none');

    res = await fetch(urlFilter2, { headers });
    text = await res.text();
    data = JSON.parse(text);
    console.log("Filtered 2:", data.data ? data.data.length : 'none');
  } catch(e) {
    console.error(e);
  }
}
main();
