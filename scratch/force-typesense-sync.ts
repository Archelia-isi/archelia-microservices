import { runBulkSync } from '@archelia/typesense';

async function main() {
  console.log("Starting bulk sync to Typesense...");
  await runBulkSync();
  console.log("Typesense sync complete!");
}
main().catch(console.error);
