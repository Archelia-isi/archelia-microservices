import fs from 'fs';
let content = fs.readFileSync('apps/b2b-storefront/src/app/actions/cart.ts', 'utf8');

// Replace multiple revalidatePath with just one
content = content.replace(/revalidatePath\('\/cart'\);\n\s*revalidatePath\('\/cart'\);/g, "revalidatePath('/cart');");
content = content.replace(/revalidatePath\('\/cart'\);\n\s*revalidatePath\("\/cart"\);/g, "revalidatePath('/cart');");

fs.writeFileSync('apps/b2b-storefront/src/app/actions/cart.ts', content);
