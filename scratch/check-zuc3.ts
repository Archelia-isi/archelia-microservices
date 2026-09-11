import { zucchettiClient } from '@archelia/zucchetti';
async function main() {
  const result = await zucchettiClient.getArticles({ arcodart: 'CA1.KOSH001' });
  console.log(JSON.stringify(result.data.slice(0, 5), null, 2));
}
main().catch(console.error);
