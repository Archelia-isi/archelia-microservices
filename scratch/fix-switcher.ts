import fs from 'fs';

// 1. Fix StoreSwitcher text
let switcher = fs.readFileSync('apps/b2b-storefront/src/components/StoreSwitcher.tsx', 'utf8');
switcher = switcher.replace(
  "<span>{currentMode === 'ZUCCHETTI' ? 'Izzo Distribuzione' : 'Catalogo Elmark'}</span>",
  "<span>Scegli Negozio</span>"
);
// Also increase z-index on the overlay to make sure it's above other elements but below the dropdown
// The dropdown is z-50, overlay is z-40. It's fine.
fs.writeFileSync('apps/b2b-storefront/src/components/StoreSwitcher.tsx', switcher);

// 2. Fix nav overflow
let layout = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');
layout = layout.replace(
  'shrink-0 overflow-x-auto">',
  'shrink-0">'
);
fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', layout);
