import { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import AppSplashScreen from '../components/os/AppSplashScreen';
import { useWindowStore } from '../store/useWindowStore';
import CatalogBuilderClient from './b2bAgentSuite/CatalogBuilderClient';
import {
  getAgentCatalogInitData,
  type AgentManagedClient,
  type CatalogSearchResponse,
} from './b2bAgentSuite/actionsClient';
import type { AgentDiscountRule } from './b2bAgentSuite/discountRulesEngine';
import './b2bAgentSuite/b2b-agent-tailwind.css';

export default function B2BCatalogBuilderApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initData, setInitData] = useState<{
    agentName: string;
    agentCode: string;
    clients: AgentManagedClient[];
    discountRules: AgentDiscountRule[];
    initialSearch: CatalogSearchResponse;
  } | null>(null);

  const preset = useWindowStore(state => state.windows['b2b_catalog_builder']?.appContext);

  useEffect(() => {
    let cancelled = false;
    getAgentCatalogInitData()
      .then(res => {
        if (cancelled) return;
        if (res && res.success) {
          setInitData({
            agentName: res.agentName || 'Daniele Savoia',
            agentCode: res.agentCode || '003',
            clients: res.clients || [],
            discountRules: res.discountRules || [],
            initialSearch: res.initialSearch || {
              success: true,
              totalFound: 0,
              products: [],
              facets: { brands: [], productGroups: [], families: [], categories: [] },
            },
          });
        } else {
          toast.error(res?.error || 'Errore caricamento Catalog Builder B2B');
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Errore connessione API Catalog Builder B2B');
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
      className={`b2b-agent-suite-root ${!isAppReady ? 'eq-splash-active' : ''}`}
      style={{
        flex: 1,
        minHeight: 0,
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
        appName="Catalog Builder B2B"
        icon={<BookOpen size={32} color="#10b981" />}
      />
      {isAppReady && initData && (
        <CatalogBuilderClient
          agentName={initData.agentName}
          agentCode={initData.agentCode}
          clients={initData.clients}
          discountRules={initData.discountRules}
          initialSearch={initData.initialSearch}
          initialPreset={preset}
        />
      )}
    </div>
  );
}
