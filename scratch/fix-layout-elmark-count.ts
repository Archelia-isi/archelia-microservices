import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');

const oldLogic = `  let cartItemCount = 0;
  if (session) {
    const targetUserId = session.user.role === "AGENT" && cookies().get("impersonatedClientCode")?.value
      ? (await prisma.b2BUser.findUnique({ where: { zucchettiCode: cookies().get("impersonatedClientCode")?.value } }))?.id || session.userId
      : session.userId;
    const cart = await getCart(targetUserId, "ACTIVE");
    if (cart) {
      cartItemCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    }
  }`;

const newLogic = `  let cartItemCount = 0;
  let elmarkCartCount = 0;
  if (session) {
    const targetUserId = session.user.role === "AGENT" && cookies().get("impersonatedClientCode")?.value
      ? (await prisma.b2BUser.findUnique({ where: { zucchettiCode: cookies().get("impersonatedClientCode")?.value } }))?.id || session.userId
      : session.userId;
    const cart = await getCart(targetUserId, "ACTIVE");
    if (cart) {
      cartItemCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    }
    const elmarkCart = await getCart(targetUserId, "ACTIVE", undefined, "ELMARK");
    if (elmarkCart) {
      elmarkCartCount = elmarkCart.items.reduce((acc, item) => acc + item.quantity, 0);
    }
  }`;

content = content.replace(oldLogic, newLogic);

fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', content);
