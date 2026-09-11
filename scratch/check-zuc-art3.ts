import { zucchettiClient } from '@archelia/zucchetti';
async function main() {
  const result = await zucchettiClient.query('zzna_art_sal', { offset: '0', limit: '100000', pcpupdtms: '01-01-2000 00:00:00' });
  const articles = Array.isArray(result) ? result : (result as any).data || [];
  const kombo = articles.filter((a: any) => a.arcodar2 === 'CA1.KOSH001');
  const prOrEk = kombo.filter((a: any) => ['PR', 'EK'].includes(a.slcodmag));
  console.log(prOrEk.map((a: any) => ({ licodlis: a.licodlis, slcodmag: a.slcodmag, liprezzo: a.liprezzo })));
}
main().catch(console.error);
