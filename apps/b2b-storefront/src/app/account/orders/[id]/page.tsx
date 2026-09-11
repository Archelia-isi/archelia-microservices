import { verifySession } from '@/lib/session';
import { prisma } from '@archelia/b2b-database';
import { redirect } from 'next/navigation';
import { getProductById } from '@archelia/typesense/dist/search.js';
import Link from 'next/link';
import Image from 'next/image';
import AcceptDraftButton from '../AcceptDraftButton';

export default async function OrderDetailsPage({ params }: { params: { id: string } }) {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }

  const order = await prisma.b2BOrder.findUnique({
    where: { id: params.id },
    include: { items: true }
  });

  if (!order || order.userId !== session.userId) {
    redirect('/account/orders');
  }

  const isDraft = order.status === 'DRAFT';
  const isPending = order.status === 'PENDING_AGENT_REVIEW';
  const isApproved = order.status === 'APPROVED';

  let statusColor = 'bg-gray-100 text-gray-800';
  let statusText = 'Sconosciuto';

  if (isDraft) {
    statusColor = 'bg-blue-100 text-blue-800 border-blue-200';
    statusText = 'Preventivo in Pausa';
  } else if (isPending) {
    statusColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
    statusText = 'In attesa di revisione';
  } else if (isApproved) {
    statusColor = 'bg-green-100 text-green-800 border-green-200';
    statusText = 'Approvato';
  }

  const { getEffectiveDiscount } = await import('@/lib/discount');
  const genericDiscount = await getEffectiveDiscount();

  const populatedItems = await Promise.all(order.items.map(async (item) => {
    const p = await getProductById(item.sku) as any;
    
    let basePrice = item.originalPrice;
    if (p) {
      basePrice = Number(p.price_b2b || 0);
      if (genericDiscount > 0) {
        basePrice = basePrice * (1 - (genericDiscount / 100));
      }
    }

    return {
      ...item,
      basePrice,
      product: p ? {
        title: (p.original_name || p.title) + ' - ' + p.sku,
        imageUrl: p.image_url || '/placeholder.png',
        sku: p.sku
      } : null
    };
  }));

  return (
    <div>
      <div className="mb-6">
        <Link prefetch={true} href="/account/orders" className="text-gray-500 hover:text-gray-800 transition-colors flex items-center gap-1">
          &larr; Torna agli Ordini
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              Dettagli Ordine #{order.id.slice(-6).toUpperCase()}
              <span className={`px-2 py-1 rounded text-xs font-semibold border ${statusColor} text-base`}>
                {statusText}
              </span>
            </h1>
            <p className="text-gray-500 mt-1">
              Data: {order.createdAt.toLocaleDateString('it-IT')} {order.createdAt.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {isDraft && (
            <div className="flex-shrink-0">
              <AcceptDraftButton orderId={order.id} />
            </div>
          )}
        </div>

        <div className="p-0">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 bg-gray-50 font-medium text-sm text-gray-500">
            <div className="col-span-6">Prodotto</div>
            <div className="col-span-2 text-center">Quantità</div>
            <div className="col-span-2 text-right">Prezzo Scontato</div>
            <div className="col-span-2 text-right">Totale</div>
          </div>

          <div className="divide-y divide-gray-100">
            {populatedItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 items-center">
                <div className="col-span-6 flex items-center gap-4">
                  <div className="w-16 h-16 bg-white border border-gray-200 rounded p-1 flex-shrink-0">
                    <img src={item.product?.imageUrl || '/placeholder.png'} alt={item.product?.title || item.sku} className="object-contain w-full h-full" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 line-clamp-2 leading-tight">
                      {item.product?.title || 'Prodotto Sconosciuto'}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">CODICE PRODOTTO: <span className="font-mono">{item.sku}</span></div>
                  </div>
                </div>

                <div className="col-span-2 text-center font-medium">
                  {item.quantity} pz.
                </div>

                <div className="col-span-2 text-right flex flex-col items-end">
                  {item.originalPrice > (item.basePrice || item.finalPrice) && (
                    <div className="flex items-center justify-end gap-1 mb-0.5">
                      <span className="text-[10px] text-gray-400 line-through">
                        € {item.originalPrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[10px] font-bold bg-red-100 text-red-600 px-1 rounded">
                        -{Math.round((1 - ((item.basePrice || item.finalPrice) / item.originalPrice)) * 100)}%
                      </span>
                    </div>
                  )}
                  
                  {item.basePrice > item.finalPrice && (
                    <div className="flex items-center justify-end gap-1 mb-0.5">
                      <span className="text-[11px] text-gray-500 line-through">
                        € {item.basePrice.toFixed(2).replace('.', ',')}
                      </span>
                      <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-1 rounded">
                        -{Math.round((1 - (item.finalPrice / item.basePrice)) * 100)}% Extra
                      </span>
                    </div>
                  )}

                  <div className="font-bold text-sm text-gray-900">
                    € {item.finalPrice.toFixed(2).replace('.', ',')}
                  </div>
                </div>

                <div className="col-span-2 text-right font-bold text-brand-main">
                  € {(item.finalPrice * item.quantity).toFixed(2).replace('.', ',')}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
          <div className="text-right w-full max-w-xs">
            <div className="flex justify-between items-center mb-2 text-gray-600">
              <span>Totale Imponibile:</span>
              <span>€ {order.totalAmount.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-center mb-4 text-gray-600">
              <span>IVA (22%):</span>
              <span>€ {order.totalIva.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-300">
              <span className="text-lg font-bold">Totale Ordine:</span>
              <span className="text-2xl font-bold text-gray-900">
                € {(order.totalAmount + order.totalIva).toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
