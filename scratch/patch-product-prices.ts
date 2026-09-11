import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/product/[id]/page.tsx', 'utf8');

const oldLogic = `  if (isAuthenticated) {
    product.originalPriceB2b = Number(product.price_b2b || 0);
    let finalPrice = product.originalPriceB2b;
    if (genericDiscount > 0) {
      finalPrice = finalPrice * (1 - (genericDiscount / 100));
    }
    if (extraDiscount > 0) {
      finalPrice = finalPrice * (1 - (extraDiscount / 100));
    }
    product.price_b2b = finalPrice;
  }`;

const newLogic = `  if (isAuthenticated) {
    product.originalPriceB2b = Number(product.price_b2b || 0);
    let finalPrice = product.originalPriceB2b;
    
    const storeMode = (cookies().get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
    const elmarkDiscounts = session?.user?.elmarkDiscounts as Record<string, number> || {};
    
    if (storeMode === 'ELMARK') {
      const dGroup = product.discgroup || '';
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
    product.price_b2b = finalPrice;
  }`;

if (content.includes(oldLogic)) {
    content = content.replace(oldLogic, newLogic);
    
    if (!content.includes("import { cookies } from 'next/headers';")) {
        content = content.replace(
          "import { verifySession } from '@/lib/session';",
          "import { verifySession } from '@/lib/session';\nimport { cookies } from 'next/headers';"
        );
    }
    
    fs.writeFileSync('apps/b2b-storefront/src/app/product/[id]/page.tsx', content);
    console.log("Patched product page");
} else {
    console.log("Could not find old logic in product page");
}

