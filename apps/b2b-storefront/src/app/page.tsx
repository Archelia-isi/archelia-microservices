import { Button } from '@archelia/ui-storefront';
import { prisma } from '@archelia/b2b-database';

export default async function Home() {
  const usersCount = await prisma.b2BUser.count().catch(() => 0);
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Archelia B2B Storefront</h1>
      <p className="text-gray-600 mb-8">Il nuovo e-commerce nativo è in costruzione.</p>
      
      <div className="flex gap-4 items-center">
        <Button>Esplora Prodotti</Button>
      </div>

      <div className="mt-12 text-sm text-gray-400">
        Database connesso. Utenti B2B registrati: {usersCount}
      </div>
    </main>
  );
}
