import './globals.css';
import { Assistant } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import { verifySession } from '@/lib/session';
import { logout } from './actions/auth';
import CategoryMenu from '../components/CategoryMenu';
import { prisma } from '@archelia/b2b-database';
import { getCart } from '@/lib/cart';
import CartBadge from '@/components/CartBadge';
import StoreSwitcher from '@/components/StoreSwitcher';
import { cookies } from 'next/headers';
import AgentImpersonatorClient from '../components/AgentImpersonatorClient';

const assistant = Assistant({ subsets: ['latin'] });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  const isAuthenticated = !!session;
  
  let cartItemCount = 0;
  let elmarkCartCount = 0;
    const cookieStore = cookies();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';

  if (session) {
    const targetUserId = session.user.role === "AGENT" && cookies().get("impersonatedClientCode")?.value
      ? (await prisma.b2BUser.findUnique({ where: { zucchettiCode: cookies().get("impersonatedClientCode")?.value } }))?.id || session.userId
      : session.userId;
    const cart = await getCart(targetUserId, "ACTIVE", undefined, storeMode);
    if (cart) {
      cartItemCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    }
  }
  const impersonatedClientCode = cookieStore.get('impersonatedClientCode')?.value;
  const impersonatedClientName = cookieStore.get('impersonatedClientName')?.value;

  return (
    <html lang="it">
      <body className={`${assistant.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col overflow-x-hidden ${storeMode === 'ELMARK' ? 'theme-elmark' : ''}`}>
        <header className="bg-black text-white shadow-md sticky top-0 z-50 border-b border-brand-hover relative">
          <div className="w-full max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-6 shrink-0">
              <Link prefetch={true} href="/" className="flex items-center pr-4 md:pr-10">
                {storeMode === 'ELMARK' ? (
                <Image 
                  src="/logo-elmark.png" 
                  alt="Elmark" 
                  width={200} 
                  height={60} 
                  className="object-contain h-[50px] md:h-[64px] w-auto origin-left"
                  priority
                />
              ) : (
                <Image 
                  src="/logo-izzo.png" 
                  alt="Izzo Distribuzione" 
                  width={240} 
                  height={80} 
                  className="object-contain h-[64px] md:h-[80px] w-auto scale-110 md:scale-125 origin-left"
                  priority
                />
              )}
              </Link>
              <CategoryMenu />
            </div>

            <form action="/catalog" method="GET" className="hidden md:flex flex-1 min-w-0 max-w-xl mx-3 md:mx-8 relative">
              <input 
                type="text" 
                name="q"
                placeholder="Cerca prodotti, marchi, categorie..." 
                className="w-full h-11 pl-4 pr-12 rounded-sm text-gray-900 outline-none"
              />
              <button type="submit" className="absolute right-0 top-0 h-11 w-12 bg-brand-main rounded-r-sm flex items-center justify-center text-black hover:bg-brand-hover transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>

            <nav className="flex space-x-3 md:space-x-6 items-center font-medium shrink-0">
              {session?.user?.isElmarkCustomer && <StoreSwitcher currentMode={storeMode} />}
              {session?.user?.role === 'AGENT' && (
                <>
                  <Link prefetch={true} href="/agent/orders" className="text-yellow-400 hover:text-yellow-300 font-bold transition-colors">
                    Vaglio Ordini
                  </Link>
                  <AgentImpersonatorClient 
                    currentCode={impersonatedClientCode} 
                    currentName={impersonatedClientName} 
                  />
                </>
              )}
              <Link prefetch={true} href="/catalog" className="hover:text-brand-hover transition-colors">Catalogo</Link>
              
              {isAuthenticated ? (
                <>
                  <Link prefetch={true} href="/account" className="hover:text-brand-hover transition-colors">Area Privata</Link>
                  <CartBadge initialCount={cartItemCount} />
                  <form action={logout}>
                    <button type="submit" className="hover:text-brand-hover transition-colors">Esci</button>
                  </form>
                </>
              ) : (
                <Link prefetch={true} href="/login" className="hover:text-brand-hover transition-colors">Area Clienti</Link>
              )}
            </nav>
          </div>
          
        </header>
        <main className="flex-grow max-w-7xl mx-auto w-full p-4">
          {children}
        </main>
        <footer className="bg-black text-gray-400 text-center py-6 mt-12 border-t border-brand-border">
          <p>&copy; {new Date().getFullYear()} Izzo Distribuzione S.r.l. - Portale B2B</p>
        </footer>
      </body>
    </html>
  );
}
