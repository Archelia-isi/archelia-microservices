const { Client } = require('typesense');
const url = new URL(process.env.TYPESENSE_URL);
const client = new Client({
  nodes: [{ host: url.hostname, port: url.port || (url.protocol === 'https:' ? '443' : '80'), protocol: url.protocol.replace(':', '') }],
  apiKey: process.env.TYPESENSE_ADMIN_KEY,
  connectionTimeoutSeconds: 5
});
async function run() {
  const res = await client.collections('products').documents().search({
    q: '*',
    filter_by: 'product_group:=ED',
    per_page: 0
  });
  console.log('Typesense ED products:', res.found);
}
run();
