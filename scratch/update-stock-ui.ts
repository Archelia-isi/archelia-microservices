import fs from 'fs';

let content = fs.readFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', 'utf8');

const oldStockUi = `        <div className="text-right">
          <p className="text-xs text-gray-500 font-medium mb-1">Disponibilità Magazzino</p>
          {product.stock > 0 ? (
            <p className="text-[#00C800] font-bold">{product.stock} PZ in pronta consegna</p>
          ) : (
            <p className="text-orange-500 font-bold">In arrivo</p>
          )}
        </div>`;

const newStockUi = `        <div className="text-right">
          <p className="text-xs text-gray-500 font-medium mb-1">Disponibilità Magazzino</p>
          {(product.stock_main > 0 || (!('stock_main' in product) && product.stock > 0)) && (
            <p className="text-[#00C800] font-bold text-sm leading-tight mb-0.5">{product.stock_main ?? product.stock} PZ immediatamente disponibili</p>
          )}
          {product.stock_ek > 0 && (
            <p className="text-blue-600 font-bold text-sm leading-tight mb-0.5">{product.stock_ek} PZ disponibili entro 7 giorni</p>
          )}
          {!(product.stock_main > 0) && !(product.stock_ek > 0) && (!('stock_main' in product) && !(product.stock > 0) || ('stock_main' in product)) && (
            <p className="text-orange-500 font-bold text-sm leading-tight">In arrivo</p>
          )}
        </div>`;

content = content.replace(oldStockUi, newStockUi);

fs.writeFileSync('apps/b2b-storefront/src/components/AddToCartBox.tsx', content);
