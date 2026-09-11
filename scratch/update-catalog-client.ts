import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/CatalogClient.tsx', 'utf8');

const oldRegex = /<div key=\{product\.id\} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow relative">[\s\S]*?<\/div>\n              \);/g;

const newCard = `<div key={product.id} className="w-full bg-white border border-gray-100 rounded shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
            <div className="absolute top-2 right-2 z-10 text-[10px] font-bold bg-[#00C800] text-white px-2 py-0.5 rounded shadow-sm">
              B2B
            </div>
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
              {(product.stock_main > 0 || (!('stock_main' in product) && product.stock > 0)) && (
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-[#00C800]/10 text-[#00C800] border border-[#00C800]/20 shadow-sm backdrop-blur-sm">
                  2GG: {product.stock_main ?? product.stock}
                </div>
              )}
              {product.stock_ek > 0 && (
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 shadow-sm backdrop-blur-sm">
                  7GG: {product.stock_ek}
                </div>
              )}
              {!(product.stock_main > 0) && !(product.stock_ek > 0) && (!('stock_main' in product) && !(product.stock > 0) || ('stock_main' in product)) && (
                <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-orange-100 text-orange-600 border border-orange-200 shadow-sm backdrop-blur-sm">
                  Esaurito
                </div>
              )}
            </div>
            
            <Link prefetch={true} href={\`/product/\${product.id || product.sku}\`} className="w-full aspect-square p-4 flex items-center justify-center bg-white relative">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-400">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              )}
            </Link>
            <div className="p-4 pt-2 flex flex-col flex-grow border-t border-gray-50">
              <span className="text-[10px] uppercase text-gray-500 tracking-wider font-semibold mb-1 truncate">{product.vendor || 'IZZO'}</span>
              <h3 className="text-sm font-medium text-gray-900 leading-tight mb-2 line-clamp-2 min-h-[40px]">
                <Link prefetch={true} href={\`/product/\${product.id || product.sku}\`} className="hover:text-[#00C800] transition-colors">
                  {product.original_name || product.title}
                </Link>
              </h3>
              <div className="text-[10px] text-gray-500 mb-3 uppercase tracking-wide truncate">
                CODICE PRODOTTO: <span className="font-mono">{product.sku || product.natural_sku || 'N/D'}</span>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                {isAuthenticated && (
                  <div className="flex flex-col">
                    {product.originalPriceB2b && product.price_b2b < product.originalPriceB2b && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-gray-400 line-through">
                          € {Number(product.originalPriceB2b).toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                          -{Math.round((1 - (product.price_b2b / product.originalPriceB2b)) * 100)}%
                        </span>
                      </div>
                    )}
                    <div className="text-base font-bold text-gray-900 leading-none">
                      € {Number(product.price_b2b || 0).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                )}
                {!isAuthenticated && (
                  <div className="w-full text-center mt-2">
                    <Link prefetch={true} href="/login" className="text-xs font-bold uppercase tracking-wider text-[#00C800] hover:text-green-700 block w-full bg-[#00C800]/10 rounded py-2 transition-colors">
                      Accedi
                    </Link>
                  </div>
                )}
                {isAuthenticated && <AddToCartButton product={product} isLoggedIn={isAuthenticated} />}
              </div>
            </div>
          </div>
              );`;

if (!content.match(oldRegex)) {
  console.log("Regex didn't match anything!");
} else {
  content = content.replace(oldRegex, newCard);
  fs.writeFileSync('apps/b2b-storefront/src/components/CatalogClient.tsx', content);
  console.log("Success");
}
