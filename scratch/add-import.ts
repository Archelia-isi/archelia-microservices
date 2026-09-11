import fs from 'fs';
let content = fs.readFileSync('apps/b2b-storefront/src/app/actions/cart.ts', 'utf8');

if (!content.includes("import { revalidatePath }")) {
  content = content.replace("import { prisma } from '@archelia/b2b-database';", "import { prisma } from '@archelia/b2b-database';\nimport { revalidatePath } from 'next/cache';");
  fs.writeFileSync('apps/b2b-storefront/src/app/actions/cart.ts', content);
}
