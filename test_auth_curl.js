const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const token = jwt.sign({ username: 'salvatore', role: 'MASTER' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const url = `${process.env.API_GATEWAY_URL || 'https://api-gateway-production-2ec6.up.railway.app'}/api/admin/zucchetti/customers/search?q=ferr`;

async function run() {
  const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
  console.log(res.status);
  console.log(await res.text());
}
run();
