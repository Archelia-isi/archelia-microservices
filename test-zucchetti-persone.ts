import { zucchettiClient } from '@archelia/zucchetti';

async function main() {
  try {
    const res: any = await zucchettiClient.query('zzna_persone', { limit: '10' }, 'A0002');
    console.log("zzna_persone result:", res);
  } catch(e) {
    console.log("no zzna_persone");
  }
}
main();
