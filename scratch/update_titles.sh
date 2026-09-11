#!/bin/bash
# product/[id]/page.tsx
sed -i '' 's/{product.title || product.original_name}/{product.original_name || product.title} - {product.sku || product.natural_sku}/g' apps/b2b-storefront/src/app/product/\[id\]/page.tsx
sed -i '' 's/alt={product.title || product.original_name || '"'Prodotto'"'}/alt={product.original_name || product.title || '"'Prodotto'"'}/g' apps/b2b-storefront/src/app/product/\[id\]/page.tsx

# CatalogClient.tsx
sed -i '' 's/title={product.title || product.original_name}/title={`${product.original_name || product.title} - ${product.sku || product.natural_sku}`}/g' apps/b2b-storefront/src/components/CatalogClient.tsx
sed -i '' 's/{product.title || product.original_name}/{product.original_name || product.title} - {product.sku || product.natural_sku}/g' apps/b2b-storefront/src/components/CatalogClient.tsx

# ProductCarousel.tsx
sed -i '' 's/{prod.title || prod.original_name}/{prod.original_name || prod.title} - {prod.sku || prod.natural_sku}/g' apps/b2b-storefront/src/components/ProductCarousel.tsx

# page.tsx (Homepage)
sed -i '' 's/title={prod.title || prod.original_name}/title={`${prod.original_name || prod.title} - ${prod.sku || prod.natural_sku}`}/g' apps/b2b-storefront/src/app/page.tsx
sed -i '' 's/{prod.title || prod.original_name || '"'Prodotto'"'}/{prod.original_name || prod.title || '"'Prodotto'"'} - {prod.sku || prod.natural_sku}/g' apps/b2b-storefront/src/app/page.tsx

# account/orders/[id]/page.tsx
sed -i '' "s/title: p.title || p.original_name,/title: (p.original_name || p.title) + ' - ' + p.sku,/g" apps/b2b-storefront/src/app/account/orders/\[id\]/page.tsx
sed -i '' 's/{item.product?.title || '"'Prodotto Sconosciuto'"'}/{item.product?.originalName || item.product?.title || '"'Prodotto Sconosciuto'"'} - {item.sku}/g' apps/b2b-storefront/src/app/account/orders/\[id\]/page.tsx

# cart/page.tsx
sed -i '' "s/title: p.title || p.original_name,/title: (p.original_name || p.title) + ' - ' + p.sku,/g" apps/b2b-storefront/src/app/cart/page.tsx

