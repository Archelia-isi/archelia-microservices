import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getAgentPromoProspectsDashboard, PromoProspectDashboardItem } from '@/app/actions/promoProspects';
import PromoProspectsClient from './PromoProspectsClient';

export const dynamic = 'force-dynamic';

export default async function AgentPromoProspectsPage() {
  const session = await verifySession();
  if (!session || (session.user.role !== 'AGENT' && session.user.role !== 'ADMIN')) {
    redirect('/account');
  }

  let contacted: PromoProspectDashboardItem[] = [];
  let loggedIn: PromoProspectDashboardItem[] = [];
  let convertedCount = 0;

  try {
    const data = await getAgentPromoProspectsDashboard();
    contacted = data.contacted || [];
    loggedIn = data.loggedIn || [];
    convertedCount = data.convertedCount || 0;
  } catch (err) {
    console.error('[AgentPromoProspectsPage] Error loading prospects dashboard:', err);
  }

  return (
    <PromoProspectsClient
      initialContacted={contacted}
      initialLoggedIn={loggedIn}
      convertedCount={convertedCount}
    />
  );
}
