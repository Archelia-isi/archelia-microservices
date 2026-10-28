import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getAgentDiscountManagementInitData } from '@/app/actions/discountRules';
import DiscountsManagerClient from './DiscountsManagerClient';

export const dynamic = 'force-dynamic';

export default async function AgentDiscountsPage() {
  const session = await verifySession();
  if (!session) {
    redirect('/login');
  }
  if (session.user.role !== 'AGENT') {
    redirect('/account');
  }

  const initData = await getAgentDiscountManagementInitData();

  return (
    <DiscountsManagerClient
      agentName={initData.agentName}
      agentCode={initData.agentCode}
      clients={initData.clients}
      facets={initData.facets}
      initialRules={initData.rules}
    />
  );
}
