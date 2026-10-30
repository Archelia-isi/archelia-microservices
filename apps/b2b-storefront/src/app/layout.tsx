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
import PredictiveSearchBar from '@/components/PredictiveSearchBar';
import ReviewSessionCleanup from './account/ReviewSessionCleanup';
import { cookies } from 'next/headers';

const assistant = Assistant({ subsets: ['latin'] });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  const isAuthenticated = !!session;
  
  let cartItemCount = 0;
  let elmarkCartCount = 0;
    const cookieStore = cookies();
  const storeMode = (cookieStore.get('b2b_store_mode')?.value as 'ZUCCHETTI' | 'ELMARK') || 'ZUCCHETTI';

  let showElmark = false;
  if (session) {
    let targetUser = session.user;
    if (session.user.role === "AGENT" && cookies().get("impersonatedClientCode")?.value) {
      const impersonated = await prisma.b2BUser.findUnique({ where: { zucchettiCode: cookies().get("impersonatedClientCode")?.value } });
      if (impersonated) targetUser = impersonated as any;
    }
    
    // Mostriamo lo switcher Elmark se l'utente target (agente o cliente impersonato) ha Elmark sbloccato
    showElmark = Boolean(targetUser.isElmarkCustomer) || targetUser.role === 'AGENT';

    // Se sono su Elmark ma non hanno i permessi, li cacciamo su Izzo
    if (storeMode === 'ELMARK' && !showElmark) {
      const { redirect } = await import('next/navigation');
      redirect('https://www.izzodistribuzione.it');
    }

    const cart = await getCart(targetUser.id, "ACTIVE", undefined, storeMode);
    if (cart) {
      cartItemCount = cart.items.reduce((acc, item) => acc + item.quantity, 0);
    }
  } else {
    // L'utente non è loggato. Non può visualizzare Elmark.
    if (storeMode === 'ELMARK') {
      const { redirect } = await import('next/navigation');
      redirect('https://www.izzodistribuzione.it');
    }
  }

  const impersonatedClientCode = cookieStore.get('impersonatedClientCode')?.value;
  const impersonatedClientName = cookieStore.get('impersonatedClientName')?.value;
  const hasActiveReview = session?.user?.role === 'AGENT' && Boolean(cookieStore.get('reviewingOrderId')?.value);

  return (
    <html lang="it">
      <body className={`${assistant.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col overflow-x-hidden ${storeMode === 'ELMARK' ? 'theme-elmark' : ''}`}>
        <header className="bg-black text-white shadow-md sticky top-0 z-50 border-b border-brand-hover relative">
          <div className="w-full max-w-7xl mx-auto px-4 h-20 flex items-center justify-between relative">
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

            <PredictiveSearchBar storeMode={storeMode} variant="header" />

            <nav className="flex space-x-3 md:space-x-6 items-center font-medium shrink-0">
              {showElmark && <StoreSwitcher currentMode={storeMode} />}
              
              <Link prefetch={false} href="/catalog" className="hover:text-brand-hover transition-colors">Catalogo</Link>
              
              {isAuthenticated ? (
                <>
                  <Link prefetch={false} href="/account" className="hover:text-brand-hover transition-colors">Area Privata</Link>
                  <CartBadge initialCount={cartItemCount} />
                  <form action={logout}>
                    <button type="submit" className="hover:text-brand-hover transition-colors">Esci</button>
                  </form>
                </>
              ) : (
                <Link prefetch={false} href="/login" className="hover:text-brand-hover transition-colors">Area Clienti</Link>
              )}
            </nav>
          </div>
          {storeMode === 'ELMARK' && (
            <div className="hidden md:flex items-center absolute right-4 md:right-8 top-10 -translate-y-1/2 pointer-events-none">
              <Image 
                src="/logo-izzo.png" 
                alt="Izzo Distribuzione" 
                width={150} 
                height={50} 
                className="object-contain h-10 w-auto"
                priority
              />
            </div>
          )}
          {session?.user?.role === 'AGENT' && (
            <ReviewSessionCleanup
              hasActiveReview={hasActiveReview}
              impersonatedClientCode={impersonatedClientCode}
              impersonatedClientName={impersonatedClientName}
            />
          )}
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
