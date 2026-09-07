import './globals.css';
import { Assistant } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import { verifySession } from '@/lib/session';
import { logout } from './actions/auth';

const assistant = Assistant({ subsets: ['latin'] });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  const isAuthenticated = !!session;

  return (
    <html lang="it">
      <body className={`${assistant.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col overflow-x-hidden`}>
        <header className="bg-black text-white shadow-md sticky top-0 z-50 border-b border-green-600">
          <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
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
            <nav className="flex space-x-6 items-center font-medium">
              <Link href="/catalog" className="hover:text-green-400 transition-colors">Catalogo</Link>
              {isAuthenticated ? (
                <>
                  <Link href="/cart" className="hover:text-green-400 transition-colors">Carrello</Link>
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
