import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/cart-elmark/page.tsx', 'utf8');

content = content.replace(
  /export default async function CartPage\(\)/,
  "export default async function ElmarkCartPage()"
);

// We need to fetch the ELMARK cart!
content = content.replace(
  /const cart = await prisma\.b2BCart\.findFirst\(\{/,
  `// Fetch Elmark Discounts
  const user = await prisma.b2BUser.findUnique({ where: { id: targetUserId }, select: { elmarkDiscounts: true } });
  const elmarkDiscounts: any = user?.elmarkDiscounts || {};
  
  const cart = await prisma.b2BCart.findFirst({`
);

content = content.replace(
  /where: \{ userId: targetUserId, \.\.\.cartQuery \},/,
  "where: { userId: targetUserId, ...cartQuery, cartType: 'ELMARK' },"
);

// We need to apply the Elmark discounts to the fetched product!
content = content.replace(
  /priceB2b: p\.price_b2b \|\| 0,/,
  `priceB2b: (function() {
          const discGroup = p.discgroup;
          const discountPct = (discGroup && elmarkDiscounts[discGroup]) ? Number(elmarkDiscounts[discGroup]) : 0;
          let finalPrice = Number(p.price || 0);
          if (discountPct > 0) {
            finalPrice = finalPrice * (1 - (discountPct / 100));
          }
          return finalPrice;
        })(),`
);

// No Agent Extra Discount in Elmark!
content = content.replace(
  /<AgentExtraDiscount cartId=\{cart\.id\} currentDiscount=\{cartExtraDiscount\} \/>/,
  `<div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200 mt-2">
     Gli extra sconti agente non sono applicabili sui prodotti Elmark.
   </div>`
);

// Title
content = content.replace(
  /<h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Il tuo carrello<\/h1>/,
  `<h1 className="text-3xl font-extrabold text-[#0066cc] tracking-tight">Carrello Elmark</h1>`
);

// QuickAddCart needs cartType!
content = content.replace(
  /<QuickAddCart \/>/,
  `<QuickAddCart cartType="ELMARK" />`
);

// CartItemClient needs cartType!
content = content.replace(
  /<CartItemClient/g,
  `<CartItemClient cartType="ELMARK"`
);

// CheckoutButtons needs cartType!
content = content.replace(
  /<CheckoutButtons/g,
  `<CheckoutButtons cartType="ELMARK"`
);

fs.writeFileSync('apps/b2b-storefront/src/app/cart-elmark/page.tsx', content);
