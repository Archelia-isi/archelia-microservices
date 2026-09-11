import { zucchettiClient } from '@archelia/zucchetti';

async function main() {
  const tables = ['zzna_contatti', 'zzna_rubrica', 'zzna_dipendenti', 'zzna_anaper'];
  for (const t of tables) {
    try {
      const res: any = await zucchettiClient.query(t, { limit: '1' }, 'A0002');
      console.log(`${t} result:`, res);
    } catch(e) {
      console.log(`no ${t}`);
    }
  }
}
main();
