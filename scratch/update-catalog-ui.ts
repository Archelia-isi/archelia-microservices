import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/CatalogClient.tsx', 'utf8');

const oldStockUi = `                      <div className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[#00C800]/10 text-[#00C800]">
                        Disp: {product.stock || 0}
                      </div>`;

const newStockUi = `                      <div className="flex flex-col gap-0.5 items-end">
                        {(product.stock_main > 0 || (!('stock_main' in product) && product.stock > 0)) && (
                          <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-[#00C800]/10 text-[#00C800]">
                            Pronta: {product.stock_main ?? product.stock}
                          </div>
                        )}
                        {product.stock_ek > 0 && (
                          <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-blue-100 text-blue-700">
                            7gg: {product.stock_ek}
                          </div>
                        )}
                        {!(product.stock_main > 0) && !(product.stock_ek > 0) && (!('stock_main' in product) && !(product.stock > 0) || ('stock_main' in product)) && (
                          <div className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-orange-100 text-orange-600">
                            Esaurito
                          </div>
                        )}
                      </div>`;

content = content.replace(oldStockUi, newStockUi);

// Update isOutOfStock logic
content = content.replace(/const isOutOfStock = \(product\.stock \|\| 0\) <= 0;/, "const totalStock = (product.stock_main || 0) + (product.stock_ek || 0) || product.stock || 0;\n              const isOutOfStock = totalStock <= 0;");

fs.writeFileSync('apps/b2b-storefront/src/components/CatalogClient.tsx', content);
