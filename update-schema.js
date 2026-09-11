const { Client } = require('typesense');

const url = new URL(process.env.TYPESENSE_URL);

const client = new Client({
  nodes: [{
    host: url.hostname,
    port: url.port || (url.protocol === 'https:' ? '443' : '80'),
    protocol: url.protocol.replace(':', ''),
  }],
  apiKey: process.env.TYPESENSE_ADMIN_KEY,
  connectionTimeoutSeconds: 5
});

async function run() {
  try {
    const res = await client.collections('products').update({
      fields: [
        {"name": "publishedOnB2b", "type": "bool", "facet": true, "optional": true}
      ]
    });
    console.log('Schema updated successfully:', res);
  } catch (e) {
    console.error('Failed to update schema:', e);
  }
}

run();
