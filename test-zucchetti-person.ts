import { zucchettiClient } from '@archelia/zucchetti';

async function main() {
  try {
    const res: any = await zucchettiClient.query('zzna_person', { limit: '10' }, 'A0002');
    console.log("zzna_person result:", res);
  } catch(e) {
    console.log("no zzna_person");
  }
}
main();
