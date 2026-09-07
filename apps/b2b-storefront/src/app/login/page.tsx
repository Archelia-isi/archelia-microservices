import { login } from '../actions/auth';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const session = await verifySession();
  if (session) {
    redirect('/catalog');
  }

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-900 tracking-wide">IZZO DISTRIBUZIONE</h1>
          <p className="text-sm text-gray-500 mt-2">Accedi alla tua area riservata per visualizzare il catalogo e i listini personalizzati.</p>
        </div>
        
        <form action={login} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email aziendale</label>
            <input 
              name="email" 
              type="email" 
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
              placeholder="email@azienda.it"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <a href="#" className="text-xs text-blue-600 hover:text-blue-800">Password dimenticata?</a>
            </div>
            <input 
              name="password" 
              type="password" 
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full mt-2 bg-blue-800 text-white font-medium py-2.5 px-4 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            Accedi
          </button>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-500 border-t border-gray-100 pt-6">
          Non hai un account B2B? <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">Richiedi accesso</a>
        </div>
      </div>
    </div>
  );
}
