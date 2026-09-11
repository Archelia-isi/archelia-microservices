import fs from 'fs';

let content = fs.readFileSync('packages/b2b-database/prisma/schema.prisma', 'utf8');

content = content.replace(
  /status    CartStatus    @default\(ACTIVE\)\n  linkedOrderId String\?/,
  'status    CartStatus    @default(ACTIVE)\n  linkedOrderId String?\n  cartType  String        @default("ZUCCHETTI")'
);

fs.writeFileSync('packages/b2b-database/prisma/schema.prisma', content);
