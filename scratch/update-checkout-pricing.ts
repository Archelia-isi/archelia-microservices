import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/actions/checkout.ts', 'utf8');

const calcOld = `    // Calculate final prices and totals
    const genericDiscount = await getEffectiveDiscount();
    const extraDiscount = await getExtraAgentDiscount();
    
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      const p = await getProductById(item.sku) as any;
      if (!p) continue;

      let originalPrice = Number(p.price_b2b || 0);
      let finalPrice = originalPrice;
      
      if (genericDiscount > 0) {
        finalPrice = finalPrice * (1 - (genericDiscount / 100));
      }

      if (item.extraDiscount && item.extraDiscount > 0) {
        finalPrice = finalPrice * (1 - (item.extraDiscount / 100));
      }

      totalAmount += finalPrice * item.quantity;`;

const calcNew = `    // Calculate final prices and totals
    let genericDiscount = 0;
    if (cartType === 'ZUCCHETTI') {
       genericDiscount = await getEffectiveDiscount();
    }
    
    // For Elmark, we need the user's elmarkDiscounts
    let elmarkDiscounts: any = {};
    if (cartType === 'ELMARK') {
       const user = await prisma.b2BUser.findUnique({ where: { id: targetUserId }, select: { elmarkDiscounts: true } });
       elmarkDiscounts = user?.elmarkDiscounts || {};
    }
    
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of cart.items) {
      const p = await getProductById(item.sku) as any;
      if (!p) continue;

      let originalPrice = Number(cartType === 'ELMARK' ? p.price : (p.price_b2b || p.price || 0));
      let finalPrice = originalPrice;
      
      if (cartType === 'ZUCCHETTI') {
        if (genericDiscount > 0) {
          finalPrice = finalPrice * (1 - (genericDiscount / 100));
        }
        if (item.extraDiscount && item.extraDiscount > 0) {
          finalPrice = finalPrice * (1 - (item.extraDiscount / 100));
        }
      } else if (cartType === 'ELMARK') {
        const discGroup = p.discgroup;
        const discountPct = (discGroup && elmarkDiscounts[discGroup]) ? Number(elmarkDiscounts[discGroup]) : 0;
        if (discountPct > 0) {
          finalPrice = finalPrice * (1 - (discountPct / 100));
        }
      }

      totalAmount += finalPrice * item.quantity;`;

content = content.replace(calcOld, calcNew);

// Since we have a B2BOrder schema, we should save if it's an ELMARK order.
// Does B2BOrder have a `type` or `cartType` or `notes`?
// Let's just add `notes: cartType === 'ELMARK' ? 'Ordine Elmark' : ''` for now.
content = content.replace(
  /totalIva: totalAmount \* 0\.22,/,
  "totalIva: totalAmount * 0.22,\n        notes: cartType === 'ELMARK' ? 'ORDINE ELMARK - ' + (action === 'PAUSE_CART' ? 'Preventivo' : 'Approvato') : '',"
);

fs.writeFileSync('apps/b2b-storefront/src/app/actions/checkout.ts', content);
