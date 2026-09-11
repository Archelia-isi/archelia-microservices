const { Client } = require('typesense');
const url = new URL(process.env.TYPESENSE_URL);
const client = new Client({
  nodes: [{ host: url.hostname, port: url.port || (url.protocol === 'https:' ? '443' : '80'), protocol: url.protocol.replace(':', '') }],
  apiKey: process.env.TYPESENSE_ADMIN_KEY,
  connectionTimeoutSeconds: 5
});
async function run() {
  const res = await client.collections('products').documents().search({ q: '*', per_page: 0 });
  console.log('Total Typesense products:', res.found);
}
run();
