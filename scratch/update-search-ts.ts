import fs from 'fs';

let content = fs.readFileSync('packages/typesense/src/search.ts', 'utf8');

// Update signature
content = content.replace(
  /export async function searchProducts\(q: string, options\?: \{ includeUnpublished\?: boolean, b2bMode\?: boolean, sortBy\?: string, limit\?: number, l1\?: string, l2\?: string, l3\?: string \}\) \{/,
  "export async function searchProducts(q: string, options?: { includeUnpublished?: boolean, b2bMode?: boolean, sortBy?: string, limit?: number, l1?: string, l2?: string, l3?: string, catalogSource?: 'zucchetti' | 'elmark' }) {"
);

// Add filter logic
const filterLogic = `    if (options?.l1) filters.push(\`product_group:=\${options.l1}\`);
    if (options?.l2) filters.push(\`family:=\${options.l2}\`);
    if (options?.l3) filters.push(\`category:=\${options.l3}\`);`;

const newFilterLogic = `    if (options?.l1) filters.push(\`product_group:=\${options.l1}\`);
    if (options?.l2) filters.push(\`family:=\${options.l2}\`);
    if (options?.l3) filters.push(\`category:=\${options.l3}\`);
    
    // Default to hiding elmark from standard searches unless explicitly requested
    if (options?.catalogSource === 'elmark') {
      filters.push('catalog_source:=elmark');
    } else {
      filters.push('catalog_source:!=[elmark]'); // Hide elmark products
    }`;

content = content.replace(filterLogic, newFilterLogic);
fs.writeFileSync('packages/typesense/src/search.ts', content);
