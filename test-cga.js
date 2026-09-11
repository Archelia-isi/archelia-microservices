require('dotenv').config();
async function run() {
  const qs = ['Clienti', 'CgaClie', 'AnagraficaClienti', 'ClientiWeb'];
  for (const q of qs) {
    const url = new URL(process.env.ZUCCHETTI_BASE_URL + '/servlet/api/SPVQRProducer/' + q);
    url.searchParams.set('sp_company', process.env.ZUCCHETTI_SP_COMPANY_ISI || process.env.ZUCCHETTI_SP_COMPANY);
    const basicAuth = 'Basic ' + Buffer.from(process.env.ZUCCHETTI_USERNAME + ':' + process.env.ZUCCHETTI_PASSWORD).toString('base64');
    const res = await fetch(url.toString(), { headers: { authorization: basicAuth } });
    console.log(q, res.status);
  }
}
run();
