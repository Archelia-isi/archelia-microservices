import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getAgentNewClientInitData } from '@/app/actions/newClient';
import NewClientWizard from './NewClientWizard';

export const dynamic = 'force-dynamic';

export default async function NewClientPage() {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }
  if (session.user.role !== 'AGENT') {
    redirect('/account');
  }

  const initData = await getAgentNewClientInitData();

  return (
    <NewClientWizard
      agentCode={initData.agentCode || ''}
      agentName={initData.agentName || session.user.username}
      nextCodePreview={initData.nextCodePreview || 'C000165'}
      categories={
        initData.categories || [
          { code: 'riv', label: 'RIV - Rivenditore (Sconto base 50%)', discount: 50 },
          { code: 'ist', label: 'IST - Installatore (Sconto base 40%)', discount: 40 },
          { code: 'gen', label: 'GEN - Generale (Sconto base 25%)', discount: 25 },
        ]
      }
    />
  );
}
