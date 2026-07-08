import { useWidgetStore } from '../store/useWidgetStore';

export default function WidgetGallery() {
  const { addWidget, widgets } = useWidgetStore();

  const handleAdd = (type: any) => {
    addWidget(type, window.innerWidth / 2 - 150, window.innerHeight / 2 - 100);
  };

  const isAdded = (type: string) => widgets.some(w => w.type === type);

  return (
    <div style={{ padding: '32px', height: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ marginBottom: '24px', fontWeight: 600, color: '#1d1d1f' }}>Galleria Widget</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* Orologio */}
        <div 
          onClick={() => !isAdded('clock') && handleAdd('clock')} 
          style={{ 
            opacity: isAdded('clock') ? 0.5 : 1, 
            cursor: isAdded('clock') ? 'default' : 'pointer', 
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
            padding: '24px', 
            borderRadius: '16px', 
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 200, margin: '0 0 10px 0', letterSpacing: '-0.05em', color: '#1d1d1f' }}>
            10:41
          </h1>
          <h3 style={{ margin: 0, color: '#1d1d1f' }}>Orologio</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#6e6e73' }}>{isAdded('clock') ? 'Già sul desktop' : 'Clicca per aggiungere'}</p>
        </div>

        {/* Meteo */}
        <div 
          onClick={() => !isAdded('weather') && handleAdd('weather')} 
          style={{ 
            opacity: isAdded('weather') ? 0.5 : 1, 
            cursor: isAdded('weather') ? 'default' : 'pointer', 
            background: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)', 
            padding: '24px', 
            borderRadius: '16px', 
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>🌤 Roma</h2>
          <h1 style={{ fontSize: '2.5rem', margin: '5px 0', fontWeight: 300 }}>24°C</h1>
          <h3 style={{ margin: '10px 0 0 0' }}>Meteo</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', opacity: 0.8 }}>{isAdded('weather') ? 'Già sul desktop' : 'Clicca per aggiungere'}</p>
        </div>

        {/* KPI */}
        <div 
          onClick={() => !isAdded('kpi') && handleAdd('kpi')} 
          style={{ 
            opacity: isAdded('kpi') ? 0.5 : 1, 
            cursor: isAdded('kpi') ? 'default' : 'pointer', 
            background: 'white', 
            padding: '24px', 
            borderRadius: '16px', 
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            border: '1px solid rgba(0,0,0,0.05)'
          }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#6e6e73' }}>Ordini Oggi</p>
          <h1 style={{ fontSize: '2.5rem', margin: '5px 0', color: '#1d1d1f' }}>124</h1>
          <p style={{ margin: 0, color: '#32B351', fontWeight: 600 }}>+12%</p>
          <h3 style={{ margin: '15px 0 0 0', color: '#1d1d1f' }}>Statistiche</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#6e6e73' }}>{isAdded('kpi') ? 'Già sul desktop' : 'Clicca per aggiungere'}</p>
        </div>

      </div>
    </div>
  );
}
