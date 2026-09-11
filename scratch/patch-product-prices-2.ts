import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/product/[id]/page.tsx', 'utf8');

if (!content.includes("import { cookies } from 'next/headers';")) {
  content = content.replace(
    "import { verifySession } from '@/lib/session';",
    "import { verifySession } from '@/lib/session';\nimport { cookies } from 'next/headers';"
  );
}

const mapPricesFunc = `  const cookieStore = cookies();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const elmarkDiscounts = session?.user?.elmarkDiscounts as Record<string, number> || {};
  
  const applyPricing = (p: any) => {
    p.originalPriceB2b = Number(p.price_b2b || 0);
    let finalPrice = p.originalPriceB2b;
    
    if (storeMode === 'ELMARK') {
      const dGroup = p.discgroup || '';
      const groupDisc = elmarkDiscounts[dGroup] || 0;
      if (groupDisc > 0) {
        finalPrice = finalPrice * (1 - (groupDisc / 100));
      }
    } else {
      if (genericDiscount > 0) {
        finalPrice = finalPrice * (1 - (genericDiscount / 100));
      }
      if (extraDiscount > 0) {
        finalPrice = finalPrice * (1 - (extraDiscount / 100));
      }
    }
    p.price_b2b = finalPrice;
  };

  if (isAuthenticated) {
    applyPricing(product);
  }`;

// Replace the main product pricing
content = content.replace(
  /if \(isAuthenticated\) \{\n    product\.originalPriceB2b = Number\(product\.price_b2b \|\| 0\);\n    let finalPrice = product\.originalPriceB2b;\n    if \(genericDiscount > 0\) \{\n      finalPrice = finalPrice \* \(1 - \(genericDiscount \/ 100\)\);\n    \}\n    if \(extraDiscount > 0\) \{\n      finalPrice = finalPrice \* \(1 - \(extraDiscount \/ 100\)\);\n    \}\n    \n    product\.price_b2b = finalPrice;\n  \}/,
  mapPricesFunc
);

// Replace related products pricing
content = content.replace(
  /if \(isAuthenticated\) \{\n        p\.originalPriceB2b = Number\(p\.price_b2b \|\| 0\);\n        let finalPrice = p\.originalPriceB2b;\n        if \(genericDiscount > 0\) \{\n          finalPrice = finalPrice \* \(1 - \(genericDiscount \/ 100\)\);\n        \}\n        if \(extraDiscount > 0\) \{\n          finalPrice = finalPrice \* \(1 - \(extraDiscount \/ 100\)\);\n        \}\n        \n        p\.price_b2b = finalPrice;\n      \}/g,
  "if (isAuthenticated) { applyPricing(p); }"
);

fs.writeFileSync('apps/b2b-storefront/src/app/product/[id]/page.tsx', content);

