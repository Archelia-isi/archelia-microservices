import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/CartBadge.tsx', 'utf8');

content = content.replace(
  /export default function CartBadge\(\{ initialCount \}: \{ initialCount: number \}\) \{/,
  "export default function CartBadge({ initialCount, elmarkCount = 0 }: { initialCount: number; elmarkCount?: number }) {"
);

content = content.replace(
  /const \[count, setCount\] = useState\(initialCount\);/,
  `const pathname = usePathname();
  const isElmark = pathname?.startsWith('/elmark');
  const [standardCount, setStandardCount] = useState(initialCount);
  const [elCountState, setElCountState] = useState(elmarkCount);
  const count = isElmark ? elCountState : standardCount;`
);

content = content.replace(
  /import \{ useState, useEffect \} from 'react';/,
  "import { useState, useEffect } from 'react';\nimport { usePathname } from 'next/navigation';"
);

// We need to fix the listener. The event listener currently just sets `count`.
// We should update the event listener to know which cart was updated.
content = content.replace(
  /const handleCartUpdate = \(e: CustomEvent<number>\) => \{/,
  "const handleCartUpdate = (e: CustomEvent<{count: number, cartType?: string} | number>) => {"
);
content = content.replace(
  /setCount\(e\.detail\);/,
  `if (typeof e.detail === 'number') {
        setStandardCount(e.detail);
      } else {
        if (e.detail.cartType === 'ELMARK') setElCountState(e.detail.count);
        else setStandardCount(e.detail.count);
      }`
);

// Fix the Link href
content = content.replace(
  /href="\/cart"/,
  `href={isElmark ? "/cart-elmark" : "/cart"}`
);

fs.writeFileSync('apps/b2b-storefront/src/components/CartBadge.tsx', content);

// And update layout.tsx to pass elmarkCount
let layout = fs.readFileSync('apps/b2b-storefront/src/app/layout.tsx', 'utf8');
layout = layout.replace(
  /const cartItemCount = await getCartCount\(\);/,
  "const cartItemCount = await getCartCount();\n  const elmarkCartCount = await getCartCount('ELMARK');"
);
layout = layout.replace(
  /<CartBadge initialCount=\{cartItemCount\} \/>/,
  "<CartBadge initialCount={cartItemCount} elmarkCount={elmarkCartCount} />"
);
fs.writeFileSync('apps/b2b-storefront/src/app/layout.tsx', layout);
