import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Activity, Server, Cpu, HardDrive } from 'lucide-react';

export default function MonitorWidget({ widget }: { widget: DesktopWidget }) {
  const [stats, setStats] = useState({
    cpu: 0,
    ram: 0,
    disk: 0,
    activeTasks: 0,
    networkPing: 0
  });

  useEffect(() => {
    // MOCK: In futuro chiederà dati reali al backend /api/admin/system
    const updateStats = () => {
      setStats({
        cpu: Math.floor(Math.random() * 40) + 10,
        ram: Math.floor(Math.random() * 30) + 40,
        disk: 65,
        activeTasks: Math.floor(Math.random() * 10) + 20,
        networkPing: Math.floor(Math.random() * 30) + 10
      });
    };
    updateStats();
    const intId = setInterval(updateStats, 2000);
    return () => clearInterval(intId);
  }, []);

  const getStatusColor = (val: number) => {
    if (val > 85) return 'var(--color-danger)';
    if (val > 65) return 'var(--color-warning)';
    return 'var(--color-success)';
  };

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', justifyContent: 'center', alignItems: 'center' }}>
      <Activity size={32} style={{ color: getStatusColor(Math.max(stats.cpu, stats.ram)), marginBottom: '8px' }} />
      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Sistema</div>
      <div style={{ fontSize: '0.75rem', opacity: 0.7, textAlign: 'center', marginTop: '4px' }}>
        CPU: {stats.cpu}% <br/> RAM: {stats.ram}%
      </div>
    </div>
  );

  const renderMedium = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Server size={18} style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontSize: '1rem', fontWeight: 600 }}>Stato Server</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span><Cpu size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> CPU</span>
            <span style={{ fontWeight: 600, color: getStatusColor(stats.cpu) }}>{stats.cpu}%</span>
          </div>
          <div style={{ height: '6px', width: '100%', background: 'var(--color-surface-solid)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.cpu}%`, background: getStatusColor(stats.cpu), transition: 'width 0.5s ease' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span><HardDrive size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> RAM</span>
            <span style={{ fontWeight: 600, color: getStatusColor(stats.ram) }}>{stats.ram}%</span>
          </div>
          <div style={{ height: '6px', width: '100%', background: 'var(--color-surface-solid)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${stats.ram}%`, background: getStatusColor(stats.ram), transition: 'width 0.5s ease' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
           <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Task Attivi: <span style={{ fontWeight: 600 }}>{stats.activeTasks}</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
           <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Ping DB: <span style={{ fontWeight: 600, color: stats.networkPing > 100 ? 'var(--color-warning)' : 'var(--color-success)' }}>{stats.networkPing}ms</span></div>
        </div>
      </div>
    </div>
  );

  const renderLarge = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={20} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Archelia Server Monitor</span>
        </div>
        <div style={{ padding: '4px 8px', background: 'var(--color-success-transparent)', color: 'var(--color-success)', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
          ONLINE
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Resource Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span><Cpu size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Processore (CPU)</span>
              <span style={{ fontWeight: 600, color: getStatusColor(stats.cpu) }}>{stats.cpu}%</span>
            </div>
            <div style={{ height: '8px', width: '100%', background: 'var(--color-surface-solid)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.cpu}%`, background: getStatusColor(stats.cpu), transition: 'width 0.5s ease' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span><HardDrive size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> Memoria (RAM)</span>
              <span style={{ fontWeight: 600, color: getStatusColor(stats.ram) }}>{stats.ram}%</span>
            </div>
            <div style={{ height: '8px', width: '100%', background: 'var(--color-surface-solid)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.ram}%`, background: getStatusColor(stats.ram), transition: 'width 0.5s ease' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Spazio Disco</span>
              <span style={{ fontWeight: 600, color: getStatusColor(stats.disk) }}>{stats.disk}%</span>
            </div>
            <div style={{ height: '8px', width: '100%', background: 'var(--color-surface-solid)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.disk}%`, background: getStatusColor(stats.disk) }} />
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignContent: 'start' }}>
          <div style={{ background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Worker Attivi</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>5</span>
          </div>
          <div style={{ background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Code BullMQ</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>{stats.activeTasks}</span>
          </div>
          <div style={{ background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>DB Latency</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: stats.networkPing > 100 ? 'var(--color-warning)' : 'inherit' }}>{stats.networkPing}ms</span>
          </div>
          <div style={{ background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Redis Status</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--color-success)', marginTop: '4px' }}>Connesso</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="widget monitor-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(!widget.size || widget.size === 'small') && renderSmall()}
      {widget.size === 'medium' && renderMedium()}
      {widget.size === 'large' && renderLarge()}
    </div>
  );
}
