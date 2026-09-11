import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/CartBadge.tsx', 'utf8');

content = content.replace(
  /setCount\(initialCount\);/,
  "setStandardCount(initialCount);\n    setElCountState(elmarkCount);"
);

content = content.replace(
  /}, \[initialCount\]\);/,
  "}, [initialCount, elmarkCount]);"
);

fs.writeFileSync('apps/b2b-storefront/src/components/CartBadge.tsx', content);
