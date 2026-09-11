import { syncPrices } from './apps/worker-zucchetti-pull/src/services/sync';
async function main() {
  const result = await syncPrices(true); // force full sync maybe?
  console.log("Sync done", result);
}
main().catch(console.error);
