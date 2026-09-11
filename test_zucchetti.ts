import dotenv from 'dotenv';
dotenv.config();
process.env.REDIS_URL = 'redis://localhost:6379'; // fake redis to pass validation
import { zucchettiClient } from './packages/zucchetti/src/client.ts';

async function main() {
  try {
    const res = await zucchettiClient.query('zzna_clienti', { Ancodice: '' }, 'A0002');
    console.log(JSON.stringify(res).substring(0, 1000));
  } catch (err: any) {
    console.error(err.message);
  }
}
main();
