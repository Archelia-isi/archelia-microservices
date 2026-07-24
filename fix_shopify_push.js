const fs = require('fs');
const file = 'apps/worker-shopify-push/src/sync.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/shopifyGraphQL\.query</g, 'shopifyGraphQL<');
content = content.replace(/shopifyGraphQL\.query\(/g, 'shopifyGraphQL(');
fs.writeFileSync(file, content);
