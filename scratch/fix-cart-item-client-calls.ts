import fs from 'fs';

function fixCartItemClient(path: string) {
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace(
    /updateCartItemQuantity\(item\.id, newQty\)/g,
    "updateCartItemQuantity(item.id, newQty, false, cartType)"
  );
  
  content = content.replace(
    /updateCartItemQuantity\(item\.id, qty, true\)/g,
    "updateCartItemQuantity(item.id, qty, true, cartType)"
  );
  
  // also fix removeExtraDiscount if it exists
  content = content.replace(
    /removeExtraDiscount\(item\.id\)/g,
    "removeExtraDiscount(item.id, cartType)"
  );
  
  // also fix applyExtraDiscount if it exists
  content = content.replace(
    /applyExtraDiscount\(item\.id, discountPct, minQty\)/g,
    "applyExtraDiscount(item.id, discountPct, minQty, cartType)"
  );
  
  fs.writeFileSync(path, content);
}

fixCartItemClient('apps/b2b-storefront/src/app/cart/CartItemClient.tsx');
fixCartItemClient('apps/b2b-storefront/src/app/cart-elmark/CartItemClient.tsx');
