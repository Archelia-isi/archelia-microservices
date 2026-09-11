import { zucchettiClient } from '@archelia/zucchetti';
async function main() {
  const prices = await zucchettiClient.getPrices('CA1.KOSH001');
  console.log(prices);
}
main().catch(console.error);
