
import { useState, useEffect } from 'react';
import { Settings2, Play, CloudUpload } from 'lucide-react';
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

  return (
    <>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Centro Marketing" 
        icon={<Settings2 size={56} />} 
      />
      
      <div className={`marketing-app marketing-app-entry ${isAppReady ? 'ready' : ''}`}>
        <div className="marketing-main-container">
          
          <StickyHeader paddingY="sm" backgroundOpacity={0}>
            <div style={{ padding: '0 var(--spacing-2xl)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              
              <GlassPanel padding="sm" radius="lg" style={{ display: 'inline-block', width: 'max-content' }}>
                <Tabs
                  tabs={[
                    { id: 'flows', label: 'Flussi & Automazioni', icon: <Play size={14}/> },
                    { id: 'queues', label: 'Gestione Code', icon: <CloudUpload size={14}/> }
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
      </div>
    </>
  );
}
