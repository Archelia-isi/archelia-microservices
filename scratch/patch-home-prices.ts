import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/page.tsx', 'utf8');

const oldMapPrices = `  const mapPrices = (products: any[]) => {
    return products.map(p => {
      p.originalPriceB2b = Number(p.price_b2b || 0);
      let finalPrice = p.originalPriceB2b;
      if (genericDiscount > 0) {
        finalPrice = finalPrice * (1 - (genericDiscount / 100));
      }
      if (extraDiscount > 0) {
        finalPrice = finalPrice * (1 - (extraDiscount / 100));
      }
      
      p.price_b2b = finalPrice;
      return p;
    });
  };`;

const newMapPrices = `  const mapPrices = (products: any[]) => {
    return products.map(p => {
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
      return p;
    });
  };`;

content = content.replace(oldMapPrices, newMapPrices);
fs.writeFileSync('apps/b2b-storefront/src/app/page.tsx', content);

