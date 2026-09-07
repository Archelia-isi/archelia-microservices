import './globals.css';
import { Assistant } from 'next/font/google';
import Link from 'next/link';

const assistant = Assistant({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className={`${assistant.className} bg-gray-50 text-gray-900 min-h-screen flex flex-col`}>
        <header className="bg-blue-800 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/catalog" className="text-2xl font-bold tracking-wider">IZZO DISTRIBUZIONE</Link>
            <nav className="flex space-x-6 items-center">
              <Link href="/catalog" className="hover:text-blue-200">Catalogo</Link>
              <Link href="/cart" className="hover:text-blue-200">Carrello</Link>
              <Link href="/login" className="hover:text-blue-200">Area Clienti</Link>
            </nav>
          </div>
        </header>
        <main className="flex-grow max-w-7xl mx-auto w-full p-4">
          {children}
        </main>
        <footer className="bg-gray-800 text-white text-center py-6 mt-12">
          <p>&copy; {new Date().getFullYear()} Izzo Distribuzione S.r.l. - Portale B2B</p>
        </footer>
      </body>
    </html>
  );
}
