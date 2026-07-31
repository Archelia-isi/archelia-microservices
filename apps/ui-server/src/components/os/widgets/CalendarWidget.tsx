import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');


export default function CalendarWidget({ widget }: { widget: DesktopWidget }) {
  const [events, setEvents] = useState<any[]>([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/calendar`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter only today's events
          const today = data.filter((e: any) => isToday(parseISO(e.start)));
          setEvents(today);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchEvents();
  }, [token]);

  const todayEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    time: `${format(parseISO(e.start), 'HH:mm')} - ${format(parseISO(e.end), 'HH:mm')}`,
    location: e.description || '',
    color: e.color
  }));

  const now = new Date();
  const dayName = now.toLocaleDateString('it-IT', { weekday: 'long' });
  const dayNum = now.getDate();
  const monthName = now.toLocaleDateString('it-IT', { month: 'long' });

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase' }}>
        {dayName.substring(0, 3)}
      </div>
      <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1 }}>{dayNum}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{monthName}</div>
    </div>
  );

  const renderMedium = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--color-border-glass)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--color-danger-transparent)', color: 'var(--color-danger)', padding: '4px 12px', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>{monthName.substring(0,3)}</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{dayNum}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{dayName}</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{todayEvents.length} eventi oggi</span>
        </div>
      </div>
      
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {todayEvents.slice(0, 2).map(e => (
          <div key={e.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
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
      <div style={{ width: '120px', display: 'flex', flexDirection: 'column', padding: '12px', borderRight: '1px solid var(--color-border-glass)', alignItems: 'center' }}>
        <CalendarIcon size={24} style={{ color: 'var(--color-primary)', marginBottom: '16px' }} />
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-danger)', textTransform: 'uppercase' }}>
          {dayName.substring(0, 3)}
        </div>
        <div style={{ fontSize: '3rem', fontWeight: 300, lineHeight: 1, margin: '8px 0' }}>{dayNum}</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>{monthName}</div>
      </div>
      
      {/* Events List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>Appuntamenti di Oggi</div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
          {todayEvents.map(e => (
            <div key={e.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'var(--color-surface-solid)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ width: '4px', height: '100%', minHeight: '40px', background: 'var(--color-primary)', borderRadius: '2px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{e.title}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
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
