import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', 'utf8');

const modalReplacement = `            <div className="p-5">
              <h3 className="text-red-600 font-bold text-lg mb-4 text-center">Impossibile Aggiungere</h3>
              <p className="text-sm text-gray-600 mb-6 text-center">{errorMessage}</p>

              <div className="flex items-center gap-4 mb-6">
                <div className="relative w-20 h-20 bg-gray-50 border border-gray-100 rounded flex-shrink-0">
                  <img 
                    src={product.image_url || '/placeholder.png'} 
                    alt={product.title} 
                    className="object-contain w-full h-full p-1"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-900 leading-tight mb-1 line-clamp-2">{product.original_name || product.title}</h4>
                  {hasDiscount ? (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 line-through">€ {product.originalPriceB2b.toFixed(2)}</span>
                        <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">-{discountPercentage}%</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900 leading-none">€ {product.price_b2b?.toFixed(2)}</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">€ {product.price_b2b?.toFixed(2)}</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 h-12">
                <div className="flex items-center justify-between border border-gray-300 rounded w-28 bg-white">
                  <button type="button" onClick={decreaseQuantity} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors rounded-l">-</button>
                  <span className="text-base font-bold select-none">{quantity}</span>
                  <button type="button" onClick={increaseQuantity} className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-black transition-colors rounded-r">+</button>
                </div>
                <button 
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isPending}
                  className="flex-1 bg-black text-white hover:bg-[#00C800] transition-colors font-bold text-sm rounded shadow-md"
                >
                  Aggiungi
                </button>
              </div>
            </div>`;

content = content.replace(/<div className="p-5">\s*<h3.*?Impossibile Aggiungere<\/h3>\s*<p.*?>\{errorMessage\}<\/p>\s*<\/div>/s, modalReplacement);

fs.writeFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', content);
