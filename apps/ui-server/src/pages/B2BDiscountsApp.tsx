import { useState, useEffect } from 'react';
import { Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import AppSplashScreen from '../components/os/AppSplashScreen';
import { useWindowStore } from '../store/useWindowStore';
import DiscountsManagerClient from './b2bAgentSuite/DiscountsManagerClient';
import {
  getAgentDiscountManagementInitData,
  type AgentManagedClient,
  type CommercialCategoryOption,
  type CatalogFacetOption,
} from './b2bAgentSuite/actionsClient';
import type { AgentDiscountRule } from './b2bAgentSuite/discountRulesEngine';
import './b2bAgentSuite/b2b-agent-tailwind.css';

export default function B2BDiscountsApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initData, setInitData] = useState<{
    agentName: string;
    agentCode: string;
    clients: AgentManagedClient[];
    clientCategories: CommercialCategoryOption[];
    facets: {
      brands: CatalogFacetOption[];
      productGroups: CatalogFacetOption[];
      families: CatalogFacetOption[];
      categories: CatalogFacetOption[];
    };
    rules: AgentDiscountRule[];
  } | null>(null);

  const preset = useWindowStore(state => state.windows['b2b_discounts']?.appContext);

  useEffect(() => {
    let cancelled = false;
    getAgentDiscountManagementInitData()
      .then(res => {
        if (cancelled) return;
        if (res && res.success) {
          setInitData({
            agentName: res.agentName || 'Daniele Savoia',
            agentCode: res.agentCode || '003',
            clients: res.clients || [],
            clientCategories: res.clientCategories || [],
            facets: res.facets || {
              brands: [],
              productGroups: [],
              families: [],
              categories: [],
            },
            rules: res.rules || [],
          });
        } else {
          toast.error(res?.error || 'Errore caricamento Gestione Sconti B2B');
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Errore connessione API Gestione Sconti B2B');
      })
      .finally(() => {
        if (!cancelled) setIsAppReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className={!isAppReady ? 'eq-splash-active' : ''}
      style={{
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(245, 245, 247, 0.78)',
        backdropFilter: 'blur(40px)',
      }}
    >
      <AppSplashScreen
        isLoading={!isAppReady}
        appName="Sconti B2B"
        icon={<Percent size={32} color="#10b981" />}
      />
      {isAppReady && initData && (
        <div
          className="b2b-agent-suite-root"
          style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <DiscountsManagerClient
            agentName={initData.agentName}
            agentCode={initData.agentCode}
            clients={initData.clients}
            clientCategories={initData.clientCategories}
            facets={initData.facets}
            initialRules={initData.rules}
            initialPreset={preset}
          />
        </div>
      )}
    </div>
  );
}
