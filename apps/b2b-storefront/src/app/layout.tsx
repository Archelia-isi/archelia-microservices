import './globals.css';
import { Assistant } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import { verifySession } from '@/lib/session';
import { logout } from './actions/auth';
import CategoryMenu from '../components/CategoryMenu';
import { prisma } from '@archelia/b2b-database';
import { cookies } from 'next/headers';
import AgentImpersonatorClient from '../components/AgentImpersonatorClient';

const assistant = Assistant({ subsets: ['latin'] });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  const isAuthenticated = !!session;
  
  let cartItemCount = 0;
  if (session) {
    const cart = await prisma.b2BCart.findFirst({
      where: { userId: session.userId, status: 'ACTIVE' },
      include: { items: true }
    });
    if (cart) {
      cartItemCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    }
  }
  const cookieStore = cookies();
  const impersonatedClientCode = cookieStore.get('impersonatedClientCode')?.value;
  const impersonatedClientName = cookieStore.get('impersonatedClientName')?.value;

  return (
    <html lang="it">
      <body className={`${assistant.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col overflow-x-hidden`}>
        <header className="bg-black text-white shadow-md sticky top-0 z-50 border-b border-green-600">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center">
                <Image 
                  src="/logo-izzo.png" 
                  alt="Izzo Distribuzione" 
                  width={180} 
                  height={60} 
                  className="object-contain h-14 w-auto"
                  priority
                />
              </Link>
              <CategoryMenu />
            </div>

            <form action="/catalog" method="GET" className="hidden md:flex flex-1 max-w-xl mx-8 relative">
              <input 
                type="text" 
                name="q"
                placeholder="Cerca prodotti, marchi, categorie..." 
                className="w-full h-11 pl-4 pr-12 rounded-sm text-gray-900 outline-none"
              />
              <button type="submit" className="absolute right-0 top-0 h-11 w-12 bg-green-500 rounded-r-sm flex items-center justify-center text-black hover:bg-green-400 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            <nav className="flex space-x-6 items-center font-medium">
              {session?.user?.role === 'AGENT' && (
                <>
                  <Link href="/agent/orders" className="text-yellow-400 hover:text-yellow-300 font-bold transition-colors">
                    Vaglio Ordini
                  </Link>
                  <AgentImpersonatorClient 
                    currentCode={impersonatedClientCode} 
                    currentName={impersonatedClientName} 
                  />
                </>
              )}
              <Link href="/catalog" className="hover:text-green-400 transition-colors">Catalogo</Link>
              {isAuthenticated ? (
                <>
                  <Link href="/account/orders" className="hover:text-green-400 transition-colors">I miei Ordini</Link>
                  <Link href="/cart" className="hover:text-green-400 transition-colors flex items-center gap-2">
                    Carrello
                    {cartItemCount > 0 && (
                      <span className="bg-[#00C800] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                  <form action={logout}>
                    <button type="submit" className="hover:text-green-400 transition-colors">Esci</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="hover:text-green-400 transition-colors">Area Clienti</Link>
              )}
            </nav>
          </div>
        </header>
        <main className="flex-grow max-w-7xl mx-auto w-full p-4">
          {children}
        </main>
        <footer className="bg-black text-gray-400 text-center py-6 mt-12 border-t border-green-900">
          <p>&copy; {new Date().getFullYear()} Izzo Distribuzione S.r.l. - Portale B2B</p>
        </footer>
      </body>
    </html>
  );
}
