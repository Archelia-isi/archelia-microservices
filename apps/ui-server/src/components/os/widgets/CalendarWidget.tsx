import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';

export default function CalendarWidget({ widget }: { widget: DesktopWidget }) {
  // MOCK: Eventi dal calendario locale o Google Calendar dell'utente
  const todayEvents = [
    { id: 1, title: 'Riunione Marketing', time: '10:00 - 11:30', location: 'Meet' },
    { id: 2, title: 'Pranzo con Fornitore', time: '13:00 - 14:00', location: 'Ristorante Roma' },
    { id: 3, title: 'Review Sviluppo App', time: '15:30 - 16:30', location: 'Ufficio' }
  ];

  const now = new Date();
  const dayName = now.toLocaleDateString('it-IT', { weekday: 'long' });
  const dayNum = now.getDate();
  const monthName = now.toLocaleDateString('it-IT', { month: 'long' });

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase' }}>
        {dayName.substring(0, 3)}
      </div>
      <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1 }}>{dayNum}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{monthName}</div>
    </div>
  );

  const renderMedium = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--color-border-glass)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--color-danger-transparent)', color: 'var(--color-danger)', padding: '4px 12px', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>{monthName.substring(0,3)}</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{dayNum}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{dayName}</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{todayEvents.length} eventi oggi</span>
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {todayEvents.slice(0, 2).map(e => (
          <div key={e.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ width: '4px', height: '100%', minHeight: '32px', background: 'var(--color-primary)', borderRadius: '2px' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{e.title}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={10} /> {e.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLarge = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
      {/* Sidebar with Date */}
      <div style={{ width: '120px', display: 'flex', flexDirection: 'column', padding: '16px', borderRight: '1px solid var(--color-border-glass)', alignItems: 'center' }}>
        <CalendarIcon size={24} style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase' }}>
          {dayName.substring(0, 3)}
        </div>
        <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1, margin: '8px 0' }}>{dayNum}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>{monthName}</div>
      </div>
      
      {/* Events List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Appuntamenti di Oggi</div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
          {todayEvents.map(e => (
            <div key={e.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ width: '4px', height: '100%', minHeight: '40px', background: 'var(--color-primary)', borderRadius: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{e.title}</span>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ fontSize: '0.85rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} /> {e.time}
                  </span>
                  <span style={{ fontSize: '0.85rem', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> {e.location}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {todayEvents.length === 0 && (
            <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '32px' }}>Nessun evento in programma per oggi</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="widget calendar-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(!widget.size || widget.size === 'small') && renderSmall()}
      {widget.size === 'medium' && renderMedium()}
      {widget.size === 'large' && renderLarge()}
    </div>
  );
}
