import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getAgentClientsList } from '@/app/actions/newClient';
import ClientsManager from './ClientsManager';

export const dynamic = 'force-dynamic';

export default async function AgentClientsPage() {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }
  if (session.user.role !== 'AGENT') {
    redirect('/account');
  }

  const data = await getAgentClientsList();

  return (
    <ClientsManager
      initialClients={data.clients || []}
      categories={
        data.categories || [
          { code: 'riv', label: 'RIV - Rivenditore (Sconto base 50%)', discount: 50 },
          { code: 'ist', label: 'IST - Installatore (Sconto base 40%)', discount: 40 },
          { code: 'gen', label: 'GEN - Generale (Sconto base 25%)', discount: 25 },
        ]
      }
      agentName={data.agentName || session.user.username}
      agentCode={data.agentCode || ''}
    />
  );
}
