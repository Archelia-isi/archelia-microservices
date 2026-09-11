import fs from 'fs';

let content = fs.readFileSync('packages/typesense/src/index.ts', 'utf8');

content = content.replace(/{ name: 'stock_main', type: 'int32' }/g, "{ name: 'stock_main', type: 'int32', sort: true }");
content = content.replace(/{ name: 'stock_ek', type: 'int32' }/g, "{ name: 'stock_ek', type: 'int32', sort: true }");

fs.writeFileSync('packages/typesense/src/index.ts', content);
