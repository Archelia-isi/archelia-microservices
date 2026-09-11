import fs from 'fs';

// AddToCartBox.tsx
let addToCartBox = fs.readFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', 'utf8');
addToCartBox = addToCartBox.replace(
  /export default function AddToCartBox\(\{ sku, initialStock, stockEk \}: \{ sku: string; initialStock: number; stockEk\?: number \}\) \{/,
  "export default function AddToCartBox({ sku, initialStock, stockEk, cartType = 'ZUCCHETTI' }: { sku: string; initialStock: number; stockEk?: number; cartType?: 'ZUCCHETTI'|'ELMARK' }) {"
);
addToCartBox = addToCartBox.replace(
  /const res = await addToCart\(sku, quantityToAdd\);/,
  "const res = await addToCart(sku, quantityToAdd, cartType);"
);
fs.writeFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', addToCartBox);

// CatalogClient.tsx
let catalogClient = fs.readFileSync('apps/b2b-storefront/src/components/CatalogClient.tsx', 'utf8');
catalogClient = catalogClient.replace(
  /interface CatalogClientProps \{/,
  "interface CatalogClientProps {\n  cartType?: 'ZUCCHETTI' | 'ELMARK';"
);
catalogClient = catalogClient.replace(
  /AddToCartBox sku=\{product\.sku\}/g,
  "AddToCartBox cartType={cartType} sku={product.sku}"
);
fs.writeFileSync('apps/b2b-storefront/src/components/CatalogClient.tsx', catalogClient);

// ProductCarousel.tsx
let carousel = fs.readFileSync('apps/b2b-storefront/src/components/ProductCarousel.tsx', 'utf8');
carousel = carousel.replace(
  /export default function ProductCarousel\(\{ title, products, linkUrl, linkText \}: ProductCarouselProps\) \{/,
  "export default function ProductCarousel({ title, products, linkUrl, linkText, cartType = 'ZUCCHETTI' }: ProductCarouselProps & { cartType?: 'ZUCCHETTI' | 'ELMARK' }) {"
);
carousel = carousel.replace(
  /AddToCartBox sku=\{product\.sku\}/g,
  "AddToCartBox cartType={cartType} sku={product.sku}"
);
fs.writeFileSync('apps/b2b-storefront/src/components/ProductCarousel.tsx', carousel);
