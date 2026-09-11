import fs from 'fs';

let content = fs.readFileSync('packages/typesense/src/search.ts', 'utf8');

const replacement = `      query_by_weights: '200,150,100,100,100,100,80,80,80,60,50',
      sort_by: (!q || q === '*') 
        ? 'stock_main:desc,stock_ek:desc,natural_sku:asc' 
        : '_text_match:desc,stock_main:desc,stock_ek:desc',
      per_page: options?.limit || 50`;

content = content.replace(/      query_by_weights: '200,150,100,100,100,100,80,80,80,60,50',\n      sort_by: '_text_match:desc,stock_main:desc,stock_ek:desc,is_in_promo:desc,natural_sku:asc',\n      per_page: options\?\.limit \|\| 50/, replacement);

fs.writeFileSync('packages/typesense/src/search.ts', content);
