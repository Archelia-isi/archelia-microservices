import { env } from './packages/core/src/index.js';
import * as jwt from 'jsonwebtoken';

const token = jwt.sign({ username: 'salvatore', role: 'MASTER' }, env.JWT_SECRET, { expiresIn: '1h' });
const url = `${env.API_GATEWAY_URL || 'https://api-gateway-production-2ec6.up.railway.app'}/api/admin/zucchetti/customers/search?q=ferr`;

async function run() {
  const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
  console.log(res.status);
  console.log(await res.text());
}
run();
