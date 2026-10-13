import Link from 'next/link';

export default function CartSuccessPage({
  searchParams
}: {
  searchParams: { type?: string; orderId?: string }
}) {
  const isSaved = searchParams.type === 'saved';
  const isPaused = searchParams.type === 'paused';
  const orderRef = searchParams.orderId ? `#${searchParams.orderId.slice(-6).toUpperCase()}` : null;

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 sm:p-12">
        {/* Icona */}
        <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner bg-opacity-10">
          {isSaved ? (
            <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            </div>
          ) : isPaused ? (
            <div className="w-20 h-20 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center border border-green-200">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        {/* Titolo e Testo */}
        <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
          {isSaved
            ? 'Ordine Salvato con Successo!'
            : isPaused
            ? 'Preventivo Messo in Pausa!'
            : 'Ordine Inviato con Successo!'}
        </h1>

        <p className="text-gray-600 text-base max-w-md mx-auto mb-6">
          {isSaved
            ? 'Il tuo ordine è stato salvato tra le tue bozze. Potrai modificarlo, aggiungere altri prodotti o inviarlo all\'agente in qualsiasi momento.'
            : isPaused
            ? 'Il preventivo è stato archiviato in pausa e sarà consultabile nella sezione Preventivi.'
            : 'Il tuo ordine è stato trasmesso all\'agente per la revisione. Riceverai un riscontro non appena sarà confermato.'}
        </p>

        {orderRef && (
          <div className="inline-block bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 font-mono mb-8">
            Riferimento Ordine: <span className="font-bold text-gray-900">{orderRef}</span>
          </div>
        )}

        {/* Pulsanti Azione */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            prefetch={true}
            href={
              isSaved
                ? '/account/saved-orders'
                : isPaused
                ? '/account/quotes'
                : '/account/sent-orders'
            }
            className="px-6 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
          >
            {isSaved
              ? 'Vai a Ordini Salvati'
              : isPaused
              ? 'Vai ai Preventivi'
              : 'Vai a Ordini Inviati'}
          </Link>

          <Link
            prefetch={true}
            href="/catalog"
            className="px-6 py-3 bg-gray-100 text-gray-800 font-bold rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
          >
            Continua gli Acquisti
          </Link>
        </div>
      </div>
    </div>
  );
}
