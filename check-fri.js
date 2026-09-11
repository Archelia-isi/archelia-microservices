const { Client } = require('typesense');
const url = new URL(process.env.TYPESENSE_URL);
const client = new Client({
  nodes: [{ host: url.hostname, port: url.port || (url.protocol === 'https:' ? '443' : '80'), protocol: url.protocol.replace(':', '') }],
  apiKey: process.env.TYPESENSE_ADMIN_KEY,
  connectionTimeoutSeconds: 5
});
async function run() {
  const res = await client.collections('products').documents().search({
    q: 'Lavatrice',
    query_by: 'title',
    per_page: 5
  });
  console.log(res.hits.map(h => ({ title: h.document.title, l1: h.document.product_group, l2: h.document.family, l3: h.document.category, pubWeb: h.document.publishedOnWeb })));
}
run();
