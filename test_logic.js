const dotenv = require('dotenv');
dotenv.config();

async function main() {
  const urlFilter = `${process.env.ZUCCHETTI_BASE_URL}/servlet/api/SPVQRProducer/zzna_clienti?sp_company=A0002`;
  
  const headers = {
    'Authorization': 'Basic ' + Buffer.from(`${process.env.ZUCCHETTI_USERNAME}:${process.env.ZUCCHETTI_PASSWORD}`).toString('base64'),
    'Content-Type': 'application/json'
  };

  try {
    let res = await fetch(urlFilter, { headers });
    let text = await res.text();
    let data = JSON.parse(text);
    
    let customers = [];
    const rawRes = data;
    
    if (rawRes && rawRes.data) {
        customers = rawRes.data;
    } else if (rawRes && rawRes.dataset) {
        customers = rawRes.dataset;
    } else if (rawRes && Array.isArray(rawRes)) {
        customers = rawRes;
    } else if (rawRes && rawRes.zzna_clienti) {
        customers = Array.isArray(rawRes.zzna_clienti) ? rawRes.zzna_clienti : [rawRes.zzna_clienti];
    }
    console.log("Customers length:", customers.length);

    const q = 'ferr';
    const lowerQ = q.toLowerCase();
    const filtered = customers.filter(c => {
         const name = (c.andescri || c.Andescri || '').toLowerCase();
         const code = (c.ancodice || c.Ancodice || '').toLowerCase();
         const vat = (c.anpariva || c.Anpariva || '').toLowerCase();
         return name.includes(lowerQ) || code.includes(lowerQ) || vat.includes(lowerQ);
    });

    const mapped = filtered.map(c => ({
         zucchettiCode: c.ancodice || c.Ancodice || '',
         companyName: c.andescri || c.Andescri || '',
         vatNumber: c.anpariva || c.Anpariva || '',
         fido: parseFloat(c.anvalfid || c.Anvalfid || '0'),
         zucchettiPriceList: c.ancatcon || c.Ancatcon || '',
         customerType: c.antipcon || c.Antipcon || ''
    }));
    console.log("Mapped:", mapped);
  } catch(e) {
    console.error(e);
  }
}
main();
