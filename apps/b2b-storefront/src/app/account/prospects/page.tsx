import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getAgentPromoProspectsDashboard } from '@/app/actions/promoProspects';
import PromoProspectsClient from './PromoProspectsClient';

export const dynamic = 'force-dynamic';

export default async function AgentPromoProspectsPage() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    redirect('/account');
  }

  const data = await getAgentPromoProspectsDashboard();

  return (
    <PromoProspectsClient
      initialContacted={data.contacted || []}
      initialLoggedIn={data.loggedIn || []}
      convertedCount={data.convertedCount || 0}
    />
  );
}
