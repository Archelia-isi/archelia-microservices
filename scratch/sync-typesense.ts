import { runBulkSync } from '@archelia/typesense';

async function main() {
  console.log('Running Bulk Sync...');
  await runBulkSync();
  console.log('Done!');
}

main().catch(console.error);
