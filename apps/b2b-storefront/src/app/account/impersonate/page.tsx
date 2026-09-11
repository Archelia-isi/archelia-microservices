import { verifySession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { getAgentCustomers } from '../../actions/agent';
import ImpersonateClientPage from './ImpersonateClientPage';

export default async function ImpersonatePage() {
  const session = await verifySession();
  if (!session || session.user.role !== 'AGENT') {
    redirect('/account');
  }

  const res = await getAgentCustomers();
  const customers = res.customers || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
      <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Impersonifica Cliente</h1>
      </div>
      <div className="p-6 flex-1">
        <ImpersonateClientPage initialCustomers={customers} />
      </div>
    </div>
  );
}
