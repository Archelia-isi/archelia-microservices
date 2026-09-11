import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', 'utf8');

const oldLogic = `  const products = hits.map((h: any) => {
    const product = { ...h.document };
    
    if (isAuthenticated) {
      product.originalPriceB2b = Number(product.price_b2b || 0);
      let finalPrice = product.originalPriceB2b;
      if (genericDiscount > 0) {
        finalPrice = finalPrice * (1 - (genericDiscount / 100));
      }
      if (extraDiscount > 0) {
        finalPrice = finalPrice * (1 - (extraDiscount / 100));
      }
      
      product.price_b2b = finalPrice;
    }
    
    return product;
  });`;

const newLogic = `  const elmarkDiscounts = session?.user?.elmarkDiscounts as Record<string, number> || {};

  const products = hits.map((h: any) => {
    const product = { ...h.document };
    
    if (isAuthenticated) {
      product.originalPriceB2b = Number(product.price_b2b || 0);
      let finalPrice = product.originalPriceB2b;
      
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
    }
    
    return product;
  });`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('apps/b2b-storefront/src/app/catalog/page.tsx', content);

