const dotenv = require('dotenv');
dotenv.config();
async function main() {
  const url = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_cat_scont?sp_company=A0002&limit=100000&offset=0`;
  const headers = { 'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64') };
  const res = await fetch(url, { headers });
  if(res.status === 200) {
     const data = JSON.parse(await res.text());
     console.log("Length:", data.data.length);
     console.log(data.data.slice(0, 3));
  } else {
     console.log("Error:", res.status);
  }
}
main();
