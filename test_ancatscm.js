const dotenv = require('dotenv');
dotenv.config();
async function main() {
  const url = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002&limit=100000&offset=0`;
  const headers = { 'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64') };
  const res = await fetch(url, { headers });
  const data = JSON.parse(await res.text());
  
  const categories = {};
  data.data.forEach(c => {
     if(c.ancatscm) {
         if(!categories[c.ancatscm]) categories[c.ancatscm] = [];
         categories[c.ancatscm].push(c.andescri);
     }
  });
  console.log("ANCATSCM values:");
  for(let k in categories) {
    console.log(k, ":", categories[k].slice(0, 3));
  }
}
main();
