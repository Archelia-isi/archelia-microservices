import { runBulkSync } from '@archelia/typesense';
async function main() {
  console.log('Starting bulk sync...');
  await runBulkSync();
  console.log('Bulk sync completed.');
}
main().catch(console.error);
