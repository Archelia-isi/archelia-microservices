const fs = require('fs');
const file = 'apps/worker-shopify-push/src/sync.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const res = await shopifyGraphQL/g, 'const res: any = await shopifyGraphQL');
fs.writeFileSync(file, content);
