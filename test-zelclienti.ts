import 'dotenv/config';
import { zucchettiClient } from './packages/zucchetti/src/client.ts';

async function run() {
  try {
    const res = await zucchettiClient.query('ZelClienti', { limit: '1' });
    console.log(JSON.stringify(res).substring(0, 1000));
  } catch (e) {
    console.error(e.message);
  }
}
run();
