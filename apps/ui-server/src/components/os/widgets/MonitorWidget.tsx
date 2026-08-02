import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Activity, Server, Cpu, HardDrive } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');


export default function MonitorWidget({ widget }: { widget: DesktopWidget }) {
  const [stats, setStats] = useState({
    cpu: 0,
    ram: 0,
    disk: 0,
    activeTasks: 0,
    networkPing: 0,
    activeWorkers: 0,
    redisStatus: 'Connesso'
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    let intId: any;
    
    const fetchSystemStats = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const { server, latencyMs } = data;
          
          setStats(prev => ({
            ...prev,
            cpu: Math.min(100, Math.round(server.cpuLoad)), 
            ram: Math.min(100, Math.round((server.memory / 4096) * 100)), // Assuming 4GB total for display
            disk: server.disk ?? 65, 
            activeTasks: server.bullMqJobs ?? 0,
            networkPing: latencyMs || 12,
            activeWorkers: server.activeWorkers ?? 0,
            redisStatus: server.redisStatus ?? 'Sconosciuto'
          }));
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchSystemStats();
    intId = setInterval(fetchSystemStats, 10000); // Fetch every 10s
    return () => clearInterval(intId);
  }, [token]);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={18} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '1.1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Server Monitor</span>
        </div>
        <div style={{ padding: '4px 6px', background: 'var(--color-success-transparent)', color: 'var(--color-success)', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
          ONLINE
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Resource Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span><Cpu size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> CPU</span>
              <span style={{ fontWeight: 600, color: getStatusColor(stats.cpu) }}>{stats.cpu}%</span>
            </div>
            <div style={{ height: '5px', width: '100%', background: 'var(--color-surface-solid)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.cpu}%`, background: getStatusColor(stats.cpu), transition: 'width 0.5s ease' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span><HardDrive size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }}/> RAM</span>
              <span style={{ fontWeight: 600, color: getStatusColor(stats.ram) }}>{stats.ram}%</span>
            </div>
            <div style={{ height: '5px', width: '100%', background: 'var(--color-surface-solid)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.ram}%`, background: getStatusColor(stats.ram), transition: 'width 0.5s ease' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span>Disco</span>
              <span style={{ fontWeight: 600, color: getStatusColor(stats.disk) }}>{stats.disk}%</span>
            </div>
            <div style={{ height: '5px', width: '100%', background: 'var(--color-surface-solid)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${stats.disk}%`, background: getStatusColor(stats.disk) }} />
            </div>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', flex: 1, minHeight: 0 }}>
          <div style={{ background: 'var(--color-surface-solid)', padding: '6px 8px', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Worker Attivi</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{stats.activeWorkers}</span>
          </div>
          <div style={{ background: 'var(--color-surface-solid)', padding: '6px 8px', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Code BullMQ</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{stats.activeTasks}</span>
          </div>
          <div style={{ background: 'var(--color-surface-solid)', padding: '6px 8px', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>DB Latency</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: stats.networkPing > 100 ? 'var(--color-warning)' : 'inherit' }}>{stats.networkPing}ms</span>
          </div>
          <div style={{ background: 'var(--color-surface-solid)', padding: '6px 8px', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Redis Status</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 600, color: stats.redisStatus === 'Connesso' ? 'var(--color-success)' : 'var(--color-danger)' }}>{stats.redisStatus}</span>
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
