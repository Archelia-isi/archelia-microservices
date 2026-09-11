import fs from 'fs';

function fixCartItemClientProps(path: string) {
  let content = fs.readFileSync(path, 'utf8');
  
  content = content.replace(
    /export default function CartItemClient\(\{ item, isAgent \}: \{ item: any, isAgent\?: boolean \}\) \{/,
    "export default function CartItemClient({ item, isAgent, cartType = 'ZUCCHETTI' }: { item: any, isAgent?: boolean, cartType?: 'ZUCCHETTI' | 'ELMARK' }) {"
  );
  
  fs.writeFileSync(path, content);
}

fixCartItemClientProps('apps/b2b-storefront/src/app/cart/CartItemClient.tsx');
fixCartItemClientProps('apps/b2b-storefront/src/app/cart-elmark/CartItemClient.tsx');
