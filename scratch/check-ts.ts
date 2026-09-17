import { getTypesenseStatus } from '@archelia/typesense';

async function check() {
  const status = await getTypesenseStatus();
  console.log(JSON.stringify(status, null, 2));
}

check();
