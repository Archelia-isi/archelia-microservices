const dotenv = require('dotenv');
dotenv.config();
async function main() {
  const res = await fetch(`${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?company=A0002&limit=100000&offset=0`, {
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64') }
  });
  const data = JSON.parse(await res.text());
  const clients = data.data;
  
  const map = {};
  clients.forEach(c => {
     if(!map[c.ancatcon]) map[c.ancatcon] = [];
     if(map[c.ancatcon].length < 2) map[c.ancatcon].push(c.andescri);
  });
  console.log(map);
}
main();
