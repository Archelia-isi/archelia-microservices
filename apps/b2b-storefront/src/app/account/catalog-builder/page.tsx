import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getAgentCatalogInitData } from '@/app/actions/catalogBuilder';
import CatalogBuilderClient from './CatalogBuilderClient';

export const dynamic = 'force-dynamic';

export default async function AgentCatalogBuilderPage() {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }
  if (session.user.role !== 'AGENT') {
    redirect('/account');
  }

  const initData = await getAgentCatalogInitData();

  return (
    <CatalogBuilderClient
      agentName={initData.agentName || session.user.username}
      agentCode={initData.agentCode || ''}
      clients={initData.clients || []}
      initialSearch={
        initData.initialSearch || {
          success: true,
          totalFound: 0,
          products: [],
          facets: { brands: [], productGroups: [], families: [], categories: [] },
        }
      }
    />
  );
}
