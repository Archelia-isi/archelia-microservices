import { zucchettiClient } from '@archelia/zucchetti';

async function main() {
  try {
    const res: any = await zucchettiClient.query('zzna_agenti', { limit: '10' }, 'A0002');
    console.log("zzna_agenti found:", res);
  } catch(e) {
    console.log("no zzna_agenti");
  }
}
main();
