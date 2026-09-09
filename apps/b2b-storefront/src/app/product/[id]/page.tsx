import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductById, searchProducts } from '@archelia/typesense/dist/search.js';
import ProductCarousel from '../../../components/ProductCarousel';
import AddToCartBox from '../../../components/AddToCartBox';
import ProductGallery from '../../../components/ProductGallery';
import { Pool } from 'pg';

import { verifySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Lazy pool creation to avoid build-time errors
let pool: Pool | null = null;
function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const session = await verifySession();
  const isAuthenticated = !!session;
  const elmarkDiscounts = session?.user?.elmarkDiscounts as Record<string, number> || {};

  const productRaw = await getProductById(params.id);

  if (!productRaw) {
    notFound();
  }
  
  const product: any = productRaw;

  // Apply B2B pricing for the main product
  if (isAuthenticated) {
    if (product.discgroup && elmarkDiscounts[product.discgroup] !== undefined) {
      const discountPerc = elmarkDiscounts[product.discgroup];
      product.price_b2b = product.price * (1 - (discountPerc / 100));
    } else if (!product.price_b2b) {
      product.price_b2b = product.price;
    }
  }

  // Fetch full image list from main database
  let dbProduct = null;
  try {
    const currentPool = getPool();
    if (currentPool) {
      const result = await currentPool.query('SELECT "imageUrls" FROM products WHERE sku = $1', [product.sku]);
      if (result.rows.length > 0) {
        dbProduct = result.rows[0];
      }
    }
  } catch (e) {
    console.error('Failed to fetch product from DB:', e);
  }

  let images: string[] = [];
  if (dbProduct?.imageUrls && Array.isArray(dbProduct.imageUrls) && dbProduct.imageUrls.length > 0) {
    images = dbProduct.imageUrls as string[];
  } else if (product.image_url) {
    images = [product.image_url];
  }

  // Fetch related products (e.g. from the same category or brand, fallback to generic search if not available)
  const searchQuery = product.category || product.brand || '*';
  let relatedProductsRes: any;
  try {
    relatedProductsRes = await searchProducts(searchQuery, { b2bMode: true });
  } catch (e) {
    console.error('Failed to fetch related products:', e);
  }
  
  // Filter out the current product from related
  const relatedProducts = (relatedProductsRes?.hits || [])
    .map((h: any) => h.document)
    .filter((p: any) => p.id !== product.id && p.sku !== product.sku)
    .map((p: any) => {
      // Apply B2B pricing to related products
      if (isAuthenticated) {
        if (p.discgroup && elmarkDiscounts[p.discgroup] !== undefined) {
          const discountPerc = elmarkDiscounts[p.discgroup];
          p.price_b2b = p.price * (1 - (discountPerc / 100));
        } else if (!p.price_b2b) {
          p.price_b2b = p.price;
        }
      }
      return p;
    })
    .slice(0, 10);

  // Parse technical description string into an array of key-value pairs
  // E.g. "Tipo: Strip LED; Potenza: 11 W/m;" -> [{key: "Tipo", value: "Strip LED"}, ...]
  const techSpecs = (product.technical_desc || '')
    .split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && s.includes(':'))
    .map((s: string) => {
      const [key, ...rest] = s.split(':');
      return { key: key.trim(), value: rest.join(':').trim() };
    });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 md:py-12">
      {/* BREADCRUMB */}
      <nav className="text-xs text-gray-500 mb-8 flex items-center gap-2 font-medium">
        <Link href="/" className="hover:text-[#00C800] transition-colors">Home</Link>
        <span>/</span>
        <Link href="/catalog" className="hover:text-[#00C800] transition-colors">Catalogo Prodotti</Link>
        <span>/</span>
        <span className="text-gray-900 font-bold truncate max-w-[200px] md:max-w-md">{product.title || product.original_name}</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* IMAGE GALLERY */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          <ProductGallery images={images} alt={product.title || product.original_name || 'Prodotto'} inStock={product.stock > 0} />
        </div>

        {/* PRODUCT INFO & BUY BOX */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded">{product.brand || product.vendor || 'IZZO'}</span>
            <span className="text-xs font-mono text-gray-400">SKU: {product.sku || product.natural_sku || 'N/D'}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-6">
            {product.title || product.original_name}
          </h1>

          {/* BUY BOX (Client Component per gestire quantità) */}
          <AddToCartBox product={product} isLoggedIn={isAuthenticated} />

          {/* Removed tech specs from here */}
        </div>
      </div>

      {/* TECHNICAL SPECS (Full Width, Compact Grid) */}
      <div className="mt-16 w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-6 border-b-2 border-gray-100 pb-3 flex items-center gap-2">
          <svg className="w-6 h-6 text-[#00C800]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          Dettagli Tecnici
        </h3>
        
        {techSpecs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {techSpecs.map((spec: { key: string, value: string }, index: number) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col justify-center hover:border-[#00C800] transition-colors shadow-sm">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">{spec.key}</span>
                <span className="text-sm font-medium text-gray-900">{spec.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200 text-gray-500">
            Scheda tecnica non disponibile per questo articolo.
          </div>
        )}
      </div>

      {/* RELATED PRODUCTS CAROUSEL */}
      <div className="mt-20 mb-12">
        <ProductCarousel title="Potrebbe interessarti anche" products={relatedProducts} viewAllLink="/catalog" />
      </div>
    </div>
  );
}
