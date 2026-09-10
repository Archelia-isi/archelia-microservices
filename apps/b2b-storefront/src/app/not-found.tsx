import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold">404 - Pagina non trovata</h2>
      <p className="mt-4">La risorsa che stai cercando non esiste.</p>
      <Link prefetch={true} href="/" className="mt-8 text-blue-500 hover:underline">
        Torna alla Home
      </Link>
    </div>
  );
}
