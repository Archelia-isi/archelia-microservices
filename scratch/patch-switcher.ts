import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/StoreSwitcher.tsx', 'utf8');

content = content.replace(
  "import { setStoreMode } from '../app/actions/storeMode';",
  "import { setStoreMode } from '../app/actions/storeMode';"
);

content = content.replace(
  /const handleSwitch = async \([^}]+\};/,
  `const handleSwitch = async (mode: 'ZUCCHETTI' | 'ELMARK') => {
    setIsPending(true);
    await setStoreMode(mode);
    window.location.href = '/';
  };`
);

fs.writeFileSync('apps/b2b-storefront/src/components/StoreSwitcher.tsx', content);

// And let's remove the redirect from the server action, because we're doing window.location.href
let actionContent = fs.readFileSync('apps/b2b-storefront/src/app/actions/storeMode.ts', 'utf8');
actionContent = actionContent.replace("import { redirect } from 'next/navigation';", "");
actionContent = actionContent.replace("redirect('/');", "");
fs.writeFileSync('apps/b2b-storefront/src/app/actions/storeMode.ts', actionContent);

