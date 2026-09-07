import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductById } from '@archelia/typesense/dist/search.js';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const productRaw = await getProductById(params.id);

  if (!productRaw) {
    notFound();
  }
  
  const product: any = productRaw;

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
        {/* PRODUCT IMAGE GALLERY (Left) */}
        <div className="w-full lg:w-1/2 flex flex-col gap-4">
          <div className="w-full aspect-square bg-white border border-gray-100 rounded-lg p-8 shadow-sm flex items-center justify-center relative overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <span className="bg-[#00C800] text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">B2B</span>
              {product.stock > 0 && (
                <span className="bg-gray-900 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C800]"></div> In Stock
                </span>
              )}
            </div>
            
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.title} 
                className="w-full h-full object-contain hover:scale-110 transition-transform duration-500 cursor-zoom-in"
              />
            ) : (
              <div className="w-32 h-32 text-gray-200">
                <svg fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
              </div>
            )}
          </div>
        </div>

        {/* PRODUCT INFO (Right) */}
        <div className="w-full lg:w-1/2 flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded">{product.brand || product.vendor || 'IZZO'}</span>
            <span className="text-xs font-mono text-gray-400">SKU: {product.sku || product.natural_sku || 'N/D'}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-6">
            {product.title || product.original_name}
          </h1>

          {/* BUY BOX (B2B Style) */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <div className="flex items-end justify-between mb-6 pb-6 border-b border-gray-200">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Prezzo Riservato B2B</p>
                <div className="text-3xl font-bold text-gray-900">
                  {/* Per un portale B2B, in genere i prezzi sono offuscati se non loggati.
                      Ma per ora mostriamo il prezzo o un placeholder. */}
                  {product.price ? `€ ${product.price.toFixed(2)}` : 'Accesso Richiesto'}
                  <span className="text-xs text-gray-500 font-normal ml-2">/ {product.unit || 'PZ'}</span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs text-gray-500 font-medium mb-1">Disponibilità Magazzino</p>
                {product.stock > 0 ? (
                  <p className="text-[#00C800] font-bold">{product.stock} PZ in pronta consegna</p>
                ) : (
                  <p className="text-orange-500 font-bold">In arrivo</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex items-center w-full sm:w-32 bg-white border border-gray-300 rounded">
                <button className="w-10 h-12 flex items-center justify-center text-gray-500 hover:text-black transition-colors">-</button>
                <input 
                  type="number" 
                  defaultValue={1} 
                  min={1} 
                  className="w-full h-12 text-center font-bold text-gray-900 border-x border-gray-300 focus:outline-none focus:border-[#00C800] focus:ring-1 focus:ring-[#00C800]"
                />
                <button className="w-10 h-12 flex items-center justify-center text-gray-500 hover:text-black transition-colors">+</button>
              </div>
              <button className="flex-1 bg-black text-white hover:bg-[#00C800] transition-colors font-bold text-sm h-12 rounded flex items-center justify-center gap-2 shadow-lg shadow-black/10">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                Aggiungi all'Ordine
              </button>
            </div>
          </div>

          {/* TECHNICAL SPECS ONLY (NO COMMERCIAL DESCRIPTION) */}
          <div className="mt-2">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00C800]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Specifiche Tecniche
            </h3>
            
            {techSpecs.length > 0 ? (
              <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden text-sm">
                {techSpecs.map((spec: { key: string, value: string }, index: number) => (
                  <div key={index} className={`flex border-b border-gray-100 last:border-0 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className="w-1/3 py-3 px-4 font-bold text-gray-700 border-r border-gray-100">{spec.key}</div>
                    <div className="w-2/3 py-3 px-4 text-gray-900">{spec.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Scheda tecnica non disponibile per questo articolo.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
