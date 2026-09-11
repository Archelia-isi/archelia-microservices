require('dotenv').config();
const { XMLParser } = require('fast-xml-parser');
const xmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', textNodeName: '_text' });

async function run() {
  try {
    const url = new URL(process.env.ZUCCHETTI_BASE_URL + '/servlet/api/SPVQRProducer/ZelClienti');
    url.searchParams.set('sp_company', process.env.ZUCCHETTI_SP_COMPANY_ISI || process.env.ZUCCHETTI_SP_COMPANY);
    url.searchParams.set('limit', '1');
    
    const basicAuth = 'Basic ' + Buffer.from(process.env.ZUCCHETTI_USERNAME + ':' + process.env.ZUCCHETTI_PASSWORD).toString('base64');
    
    const res = await fetch(url.toString(), { headers: { authorization: basicAuth } });
    const body = await res.text();
    console.log('Status:', res.status);
    console.log(body.substring(0, 1000));
  } catch (e) {
    console.error(e.message);
  }
}
run();
