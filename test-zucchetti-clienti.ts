import { zucchettiClient } from '@archelia/zucchetti';

async function main() {
  const res: any = await zucchettiClient.query('zzna_clienti', { limit: '10' }, 'A0002');
  console.log("Clienti:", res);
}
main();
