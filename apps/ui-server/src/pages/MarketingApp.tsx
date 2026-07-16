import { useState, useEffect } from 'react';
import AppSplashScreen from '../components/os/AppSplashScreen';
import Tabs from '../components/ui/Tabs';
import StickyHeader from '../components/ui/StickyHeader';
import GlassPanel from '../components/ui/GlassPanel';
import FlowBuilder from '../components/marketing/FlowBuilder';
import QueueManager from '../components/marketing/QueueManager';
import './MarketingApp.css';

export function MarketingApp() {
  const [activeTab, setActiveTab] = useState<'flows' | 'queues'>('flows');
  const [isAppReady, setIsAppReady] = useState(false);

  useEffect(() => {
    // Simuliamo il caricamento iniziale veloce
    setTimeout(() => setIsAppReady(true), 300);
  }, []);

  if (!isAppReady) {
    return <AppSplashScreen appName="Marketing" isLoading={true} icon="/icons/marketing.jpg" />;
  }

  return (
    <div className="marketing-app">
      <StickyHeader paddingY="sm" backgroundOpacity={0}>
        <div style={{ padding: '0 var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div className="marketing-title">
            <h2>📣 Control Center Automazioni</h2>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Configura i flussi in background e monitora le code di invio.</p>
          </div>
          <GlassPanel padding="sm" radius="lg" style={{ display: 'inline-block', width: 'max-content' }}>
            <Tabs
              tabs={[
                { id: 'flows', label: 'Flussi & Automazioni' },
                { id: 'queues', label: 'Gestione Code' }
              ]}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as any)}
            />
          </GlassPanel>
        </div>
      </StickyHeader>

      <div className="marketing-content">
        {activeTab === 'flows' && <FlowBuilder />}
        {activeTab === 'queues' && <QueueManager />}
      </div>
    </div>
  );
}
