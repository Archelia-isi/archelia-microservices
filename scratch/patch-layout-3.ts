import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

const badChunk = `    const cart = await getCart(targetUserId, "ACTIVE");
    if (cart) {
      cartItemCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    }
    const elmarkCart = await getCart(targetUserId, "ACTIVE", undefined, "ELMARK");
    if (elmarkCart) {
      elmarkCartCount = elmarkCart.items.reduce((acc, item) => acc + item.quantity, 0);
    }
  }
  const cookieStore = cookies();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';`;

const goodChunk = `  const cookieStore = cookies();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';

  if (session) {
    const targetUserId = session.user.role === "AGENT" && cookies().get("impersonatedClientCode")?.value
      ? (await prisma.b2BUser.findUnique({ where: { zucchettiCode: cookies().get("impersonatedClientCode")?.value } }))?.id || session.userId
      : session.userId;
    const cart = await getCart(targetUserId, "ACTIVE", undefined, storeMode);
    if (cart) {
      cartItemCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    }
  }`;

// Note that the first part of badChunk starts after targetUserId. I need to be precise.
let fullReplace = content.replace(
  /if \(session\) \{\n    const targetUserId = session\.user\.role === "AGENT" && cookies\(\)\.get\("impersonatedClientCode"\)\?\.value\n      \? \(await prisma\.b2BUser\.findUnique\(\{ where: \{ zucchettiCode: cookies\(\)\.get\("impersonatedClientCode"\)\?\.value \} \}\)\)\?\.id \|\| session\.userId\n      : session\.userId;\n    const cart = await getCart\(targetUserId, "ACTIVE"\);\n    if \(cart\) \{\n      cartItemCount = cart\.items\.reduce\(\(acc, item\) => acc \+ item\.quantity, 0\);\n    \}\n    const elmarkCart = await getCart\(targetUserId, "ACTIVE", undefined, "ELMARK"\);\n    if \(elmarkCart\) \{\n      elmarkCartCount = elmarkCart\.items\.reduce\(\(acc, item\) => acc \+ item\.quantity, 0\);\n    \}\n  \}\n  const cookieStore = cookies\(\);\n  const storeMode = \(cookieStore\.get\('b2b_store_mode'\)\?\.value as 'ZUCCHETTI' \| 'ELMARK'\) \|\| 'ZUCCHETTI';/,
  goodChunk
);

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', fullReplace);

