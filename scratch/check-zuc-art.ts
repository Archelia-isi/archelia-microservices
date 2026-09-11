import { zucchettiClient } from '@archelia/zucchetti';
async function main() {
  const result = await zucchettiClient.query('zzna_art_sal', { offset: '0', limit: '1000', pcpupdtms: '01-01-2000 00:00:00' });
  const articles = Array.isArray(result) ? result : (result as any).data || [];
  const kombo = articles.filter((a: any) => a.arcodar2 === 'CA1.KOSH001');
  console.log(kombo);
}
main().catch(console.error);
