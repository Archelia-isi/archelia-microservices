import { setupPassword } from '../actions/auth';
import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { prisma } from '@archelia/b2b-database';
import Image from 'next/image';

export default async function SetupPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const session = await verifySession();
  if (!session?.userId) {
    redirect('/login');
  }

  const user = await prisma.b2BUser.findUnique({ where: { id: session.userId } });
  if (!user || (!user.mustChangePassword && !user.tempPassword)) {
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
          <h1 className="text-xl font-semibold mt-2 text-gray-800">Imposta Password Privata</h1>
          <p className="text-sm text-gray-500 mt-2">
            Per motivi di sicurezza, devi sostituire la password provvisoria con una tua password personale e privata.
          </p>
        </div>

        {searchParams.error === 'invalid' && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6 text-sm text-center">
            Le password non coincidono oppure è troppo corta (min 8 caratteri).
          </div>
        )}
        
        <form action={setupPassword} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuova Password (min 8 caratteri)</label>
            <input 
              name="password" 
              type="password" 
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conferma Nuova Password</label>
            <input 
              name="confirmPassword" 
              type="password" 
              required
              minLength={8}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit"
            className="w-full mt-2 bg-brand-hover text-white font-medium py-2.5 px-4 rounded-md hover:bg-green-700 transition-colors shadow-sm"
          >
            Salva e Accedi
          </button>
        </form>
      </div>
    </div>
  );
}
