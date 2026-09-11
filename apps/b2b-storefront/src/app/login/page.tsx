import { login } from '../actions/auth';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import Image from 'next/image';

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const session = await verifySession();
  if (session) {
    redirect('/catalog');
  }

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8 flex flex-col items-center">
          <Image 
            src="/logo-izzo.png" 
            alt="Izzo Distribuzione" 
            width={220} 
            height={80} 
            className="object-contain h-16 w-auto mb-4"
          />
          <p className="text-sm text-gray-500 mt-2">Accedi alla tua area riservata per visualizzare il catalogo e i listini personalizzati.</p>
        </div>

        {searchParams.error === 'invalid' && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6 text-sm text-center">
            Credenziali non valide. Riprova.
          </div>
        )}
        {searchParams.error === 'missing' && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md mb-6 text-sm text-center">
            Compila tutti i campi.
          </div>
        )}
        
        <form action={login} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username o Email aziendale</label>
            <input 
              name="identifier" 
              type="text" 
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all shadow-sm"
              placeholder="cliente.prova o email@azienda.it"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <a href="#" className="text-xs text-brand-hover hover:text-brand-hover">Password dimenticata?</a>
            </div>
            <input 
              name="password" 
              type="password" 
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full mt-2 bg-brand-hover text-white font-medium py-2.5 px-4 rounded-md hover:bg-green-700 transition-colors shadow-sm"
          >
            Accedi
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-500 border-t border-gray-100 pt-6">
          Non hai un account B2B? <a href="#" className="text-brand-hover hover:text-brand-hover font-medium">Richiedi accesso</a>
        </div>
      </div>
    </div>
  );
}
