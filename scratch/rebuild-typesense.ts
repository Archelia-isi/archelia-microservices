import { runBulkSync } from '@archelia/typesense';

async function main() {
  console.log("Starting Typesense rebuild...");
  await runBulkSync();
  console.log("Done.");
  process.exit(0);
}

main();
