import Link from 'next/link';
import { typesenseClient, PRODUCTS_COLLECTION_NAME } from '@archelia/typesense/dist/client.js';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import HeroCarousel from '../components/HeroCarousel';
import ProductCarousel from '../components/ProductCarousel';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default async function Home() {
  const cookieStore = cookies();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';
  const session = await verifySession();
  if (session?.user?.mustChangePassword) {
    redirect('/setup-password');
  }

  const randomSortOptions = storeMode === 'ELMARK'
    ? [
        'stock:desc,natural_sku:asc',
        'stock:asc,natural_sku:desc',
        'natural_sku:asc',
        'natural_sku:desc',
        'price:asc,stock:desc',
        'price:desc,stock:desc',
      ]
    : [
        'stock_main:desc,natural_sku:asc',
        'stock_main:asc,natural_sku:desc',
        'natural_sku:asc',
        'natural_sku:desc',
        'price:asc,stock_main:desc',
        'price:desc,stock_main:desc',
      ];

  const pickRandomSort = () =>
    randomSortOptions[Math.floor(Math.random() * randomSortOptions.length)];

  const filterBy = storeMode === 'ELMARK'
    ? 'catalog_source:=elmark && stock:>0'
    : 'catalog_source:=zucchetti && stock_main:>0';

  const fetchPool = async (q: string, customSort?: string) => {
    const sortBy = customSort || (q === '*' ? pickRandomSort() : `_text_match:desc,${pickRandomSort()}`);
    return typesenseClient.collections(PRODUCTS_COLLECTION_NAME).documents().search({
      q,
      query_by: 'sku_prefixes,sku,title,original_name,semantic_tags,brand,family,product_group,category,technical_desc,description',
      query_by_weights: '200,150,100,100,100,100,80,80,80,60,50',
      filter_by: filterBy,
      sort_by: sortBy,
      per_page: 250,
    });
  };

  let illumRes, battRes, eletRes, civileRes, novitaRes, promoRes;

  try {
    const novitaSort = pickRandomSort();
    const otherSorts = randomSortOptions.filter((s) => s !== novitaSort);
    const promoSort = otherSorts[Math.floor(Math.random() * otherSorts.length)] || pickRandomSort();

    const illumReq = fetchPool('illuminazione');
    const battReq = fetchPool('utensili');
    const eletReq = fetchPool('elettrico');
    const civileReq = fetchPool('serie civile');
    const novitaReq = fetchPool('*', novitaSort);
    const promoReq = fetchPool('*', promoSort);

    [illumRes, battRes, eletRes, civileRes, novitaRes, promoRes] = await Promise.all([
      illumReq,
      battReq,
      eletReq,
      civileReq,
      novitaReq,
      promoReq,
    ]);
  } catch (error) {
    console.error('Failed to fetch home page products:', error);
  }

  const isAuthenticated = !!session;

  const { getEffectiveDiscount, getExtraAgentDiscount, getEffectiveElmarkDiscounts } = await import('@/lib/discount');
  const genericDiscount = await getEffectiveDiscount();
  const extraDiscount = await getExtraAgentDiscount();
  const elmarkDiscounts = await getEffectiveElmarkDiscounts();

  const isValidStoreProduct = (p: any) => {
    if (!p) return false;
    if (storeMode === 'ELMARK') {
      return p.catalog_source === 'elmark' && Number(p.stock ?? 0) > 0;
    }
    const mainStock = Number('stock_main' in p ? p.stock_main : p.stock ?? 0);
    return p.catalog_source !== 'elmark' && mainStock > 0;
  };

  const mapPrices = (products: any[]) => {
    return products.map(cp => {
      const p = { ...cp };
      p.originalPriceB2b = Number(p.price_b2b) > 0 ? Number(p.price_b2b) : Number(p.price || 0);
      let finalPrice = p.originalPriceB2b;

      if (storeMode === 'ELMARK') {
        const dGroup = p.discgroup || '';
        const groupDisc = elmarkDiscounts[dGroup] || 0;
        if (groupDisc > 0) {
          finalPrice = finalPrice * (1 - (groupDisc / 100));
        }
      } else {
        if (genericDiscount > 0) {
          finalPrice = finalPrice * (1 - (genericDiscount / 100));
        }
        if (extraDiscount > 0) {
          finalPrice = finalPrice * (1 - (extraDiscount / 100));
        }
      }

      p.price_b2b = finalPrice;
      return p;
    });
  };

  const usedSkus = new Set<string>();

  const pickRandomProducts = (res: any, count: number) => {
    const allDocs: any[] = (res?.hits || [])
      .map((h: any) => h.document)
      .filter(isValidStoreProduct);

    const shuffled = shuffleArray(allDocs);
    const selected: any[] = [];

    for (const doc of shuffled) {
      const key = String(doc.sku || doc.id || '');
      if (!key || usedSkus.has(key)) continue;
      usedSkus.add(key);
      selected.push(doc);
      if (selected.length >= count) break;
    }

    // Fallback if pool had fewer unique items than requested
    if (selected.length < count) {
      for (const doc of shuffled) {
        if (selected.includes(doc)) continue;
        selected.push(doc);
        if (selected.length >= count) break;
      }
    }

    return mapPrices(selected);
  };

  const illumProducts = pickRandomProducts(illumRes, 4);
  const battProducts = pickRandomProducts(battRes, 4);
  const eletProducts = pickRandomProducts(eletRes, 4);
  const civileProducts = pickRandomProducts(civileRes, 4);

  const novitaProducts = pickRandomProducts(novitaRes, 12);
  const promoProducts = pickRandomProducts(promoRes, 12);

  const renderCategoryCard = (title: string, products: any[], link: string) => (
    <div className="bg-white shadow-sm flex flex-col h-full hover:shadow-md transition-shadow rounded-sm relative">
      <h3 className="font-bold text-gray-900 text-sm p-4 pb-1">{title}</h3>
      <div className="grid grid-cols-2 flex-grow p-4 pt-1 gap-1">
        {products.map((prod: any, idx: number) => (
          <Link prefetch={true} href={`/product/${prod.id || prod.sku}`} key={idx} className="bg-white flex flex-col items-center justify-start relative group cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="absolute top-0 right-0 w-5 h-5 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer">
              <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <div className="w-full aspect-square flex items-center justify-center overflow-hidden mb-1">
              {prod.image_url ? (
                <img src={prod.image_url} alt={prod.title} className="w-[85%] h-[85%] object-contain group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full bg-gray-50 rounded"></div>
              )}
            </div>
            <div className="text-[11px] font-bold text-gray-900 text-center line-clamp-1 w-full px-1" title={prod.original_name || prod.title}>{prod.original_name || prod.title || 'Prodotto'}</div>
            <div className="text-[11px] font-bold text-gray-800 font-mono text-center mt-0.5 truncate w-full px-1">{prod.sku || prod.natural_sku}</div>
          </Link>
        ))}
      </div>
      <div className="px-4 pb-4">
        <Link prefetch={true} href={link} className="text-[#3296c8] font-medium text-xs hover:underline flex items-center">
          Scopri tutto <span className="ml-1 font-bold text-[10px]">&gt;</span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="w-full flex flex-col pb-16">
      
      <HeroCarousel />

      {/* OVERLAPPING CATEGORY CARDS */}
      <section className="relative z-30 w-full px-4 -mt-[160px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {renderCategoryCard('Illuminazione', illumProducts, '/catalog?q=illuminazione')}
        {renderCategoryCard('Utensili', battProducts, '/catalog?q=utensili')}
        {renderCategoryCard('Serie Civile', civileProducts, '/catalog?q=serie+civile')}
        {renderCategoryCard('Elettricità', eletProducts, '/catalog?q=elettrico')}
      </section>

      {/* PRODUCT SLIDERS (B2B CAROUSELS) */}
      <ProductCarousel title="Scelti per te" products={novitaProducts} viewAllLink="/catalog" isLoggedIn={isAuthenticated} storeMode={storeMode} />
      
      {/* BENTO BOX NAVIGAZIONE B2B */}
      <section className="w-full px-4 mt-8 mb-12">
        <h2 className="text-xl font-bold text-gray-900 border-l-4 border-[#00C800] pl-3 mb-6">Mondi Izzo Distribuzione</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-auto md:h-[400px]">
          {/* Main big box */}
          <Link prefetch={true} href="/catalog?q=illuminazione" className="md:col-span-2 md:row-span-2 relative rounded overflow-hidden group shadow-sm">
            <img src="/slider/led.jpg" alt="Illuminazione" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h3 className="text-2xl font-bold text-white mb-2">Illuminazione e LED</h3>
              <p className="text-gray-200 text-sm mb-4 max-w-md">Tutto il necessario per progetti illuminotecnici, dai faretti ai pannelli ad alta efficienza.</p>
              <span className="inline-block px-4 py-2 bg-[#00C800] text-white font-bold text-xs rounded">Scopri il Catalogo</span>
            </div>
          </Link>
          
          {/* Small boxes */}
          <Link prefetch={true} href="/catalog?q=utensili" className="relative rounded overflow-hidden group shadow-sm md:h-auto h-[200px]">
            <img src="/slider/elettroutensili.jpg" alt="Utensili" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-lg font-bold text-white mb-1">Elettroutensili</h3>
              <span className="text-[#00C800] font-bold text-xs hover:underline">Esplora &gt;</span>
            </div>
          </Link>

          <Link prefetch={true} href="/catalog?q=antinfortunistica" className="relative rounded overflow-hidden group shadow-sm md:h-auto h-[200px]">
            <img src="/slider/antinfortunistica.jpg" alt="Antinfortunistica" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="text-lg font-bold text-white mb-1">Antinfortunistica</h3>
              <span className="text-[#00C800] font-bold text-xs hover:underline">Esplora &gt;</span>
            </div>
          </Link>
        </div>
      </section>

      <ProductCarousel title="In Promozione" products={promoProducts} viewAllLink="/catalog?q=promo" isLoggedIn={isAuthenticated} storeMode={storeMode} />

      {/* VANTAGGI B2B COMPATTI */}
      <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 px-4">
        <div className="bg-white border border-gray-100 text-gray-900 p-6 rounded shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Listini Dedicati</h3>
            <p className="text-gray-500 text-xs">Condizioni riservate al tuo account.</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 text-gray-900 p-6 rounded shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Stock Reale</h3>
            <p className="text-gray-500 text-xs">Giacenze sincronizzate col magazzino.</p>
          </div>
        </div>
        <div className="bg-white border border-gray-100 text-gray-900 p-6 rounded shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Riordino Veloce</h3>
            <p className="text-gray-500 text-xs">Inserimento massivo multi-prodotto.</p>
          </div>
        </div>
      </section>

      {/* CTA BOTTOM */}
      <section className="w-full mt-8 px-4">
        <div className="bg-green-600 rounded p-8 text-center relative overflow-hidden shadow-md">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <h2 className="text-xl font-bold text-black mb-2">Sei già un nostro cliente?</h2>
              <p className="text-green-950 max-w-xl text-xs">
                Accedi all'area riservata per consultare i tuoi listini ed effettuare nuovi ordini.
              </p>
            </div>
            <Link prefetch={true} 
              href="/login" 
              className="shrink-0 bg-black hover:bg-zinc-800 text-white font-bold py-3 px-8 rounded transition-colors text-sm"
            >
              Accedi all'Area B2B
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
