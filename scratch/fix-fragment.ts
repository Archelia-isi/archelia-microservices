import fs from 'fs';
let content = fs.readFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', 'utf8');

content = content.replace(/return \(\n    <div className="bg-white/, 'return (\n    <>\n    <div className="bg-white');
content = content.replace(/      \)}\n  \);\n\}/, '      )}\n    </>\n  );\n}');

fs.writeFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', content);
