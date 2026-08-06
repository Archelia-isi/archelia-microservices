import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale/it';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Calendar as CalendarIcon, Clock, AlignLeft, PaintBucket, Plus, Trash2 } from 'lucide-react';
import StickyHeader from '../components/ui/StickyHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import TextInput from '../components/ui/TextInput';
import AppSplashScreen from '../components/os/AppSplashScreen';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');


// Locale config for date-fns
const locales = {
  'it': it,
};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export default function CalendarApp() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    color: '#007aff',
    allDay: false
  });

  const token = localStorage.getItem('token');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/calendar`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        const parsedData = data.map((e: any) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end)
        }));
        setEvents(parsedData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsAppReady(true);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSelectSlot = ({ start, end }: any) => {
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      start: format(start, "yyyy-MM-dd'T'HH:mm"),
      end: format(end, "yyyy-MM-dd'T'HH:mm"),
      color: '#007aff',
      allDay: false
    });
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      start: format(event.start, "yyyy-MM-dd'T'HH:mm"),
      end: format(event.end, "yyyy-MM-dd'T'HH:mm"),
      color: event.color || '#007aff',
      allDay: event.allDay
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedEvent) {
        await fetch(`http://localhost:3000/api/admin/calendar/${selectedEvent.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(formData)
        });
      } else {
        await fetch(`http://localhost:3000/api/admin/calendar`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      fetchEvents();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      await fetch(`http://localhost:3000/api/admin/calendar/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      setIsModalOpen(false);
      fetchEvents();
    } catch (e) {
      console.error(e);
    }
  };

  const EventComponent = ({ event }: any) => {
    return (
      <div 
        style={{ 
          backgroundColor: event.color || 'var(--color-primary)', 
          color: '#ffffff',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          height: '100%'
        }}
      >
        {event.title}
      </div>
    );
  };

  return (
    <div className={`${!isAppReady ? 'eq-splash-active' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'transparent', overflow: 'hidden', position: 'relative', boxSizing: 'border-box' }}>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Calendario Eventi" 
        icon={<CalendarIcon size={56} color="white" />} 
      />
      <div className={`eq-app-entry ${isAppReady ? 'ready' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', backgroundColor: 'var(--color-background)' }}>
      <StickyHeader paddingY="md" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CalendarIcon size={24} color="var(--color-primary)" />
          {/* REGOLE: Niente h1/h2 con il titolo dell'app! */}
        </div>
        <Button 
          variant="primary" 
          icon={<Plus size={16} />}
          onClick={() => {
            setSelectedEvent(null);
            setFormData({
              title: '',
              description: '',
              start: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
              end: format(new Date(Date.now() + 3600000), "yyyy-MM-dd'T'HH:mm"),
              color: '#007aff',
              allDay: false
            });
            setIsModalOpen(true);
          }}
        >
          Nuovo Evento
        </Button>
      </StickyHeader>

      <div style={{ flex: 1, padding: '1rem', minHeight: 0, overflow: 'hidden' }}>
        <style dangerouslySetInnerHTML={{__html: `
          .rbc-calendar {
            font-family: inherit;
            color: var(--color-text);
            min-height: 500px;
          }
          .rbc-header {
            padding: 12px 8px;
            font-weight: 600;
            color: var(--color-text-muted);
            border-bottom: 1px solid var(--color-border) !important;
            text-transform: uppercase;
            font-size: 0.75rem;
          }
          .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
            border: 1px solid var(--color-border) !important;
            border-radius: var(--radius-lg);
            background: var(--color-surface);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
          }
          .rbc-day-bg, .rbc-month-row, .rbc-time-content, .rbc-time-header {
            border-color: var(--color-border) !important;
          }
          .rbc-off-range-bg {
            background: var(--color-background);
          }
          .rbc-today {
            background: var(--color-surface-hover) !important;
          }
          .rbc-event {
            background-color: transparent !important;
            padding: 0 !important;
            border: none !important;
          }
          .rbc-show-more {
            color: var(--color-primary);
            font-weight: 600;
            background: transparent;
            font-size: 0.75rem;
          }
          .rbc-btn-group button {
            color: var(--color-text) !important;
            border-color: var(--color-border) !important;
            background: var(--color-surface) !important;
            box-shadow: none !important;
          }
          .rbc-btn-group button:hover {
            background: var(--color-background) !important;
          }
          .rbc-btn-group button.rbc-active {
            background: var(--color-primary) !important;
            color: white !important;
            border-color: var(--color-primary) !important;
          }
          .rbc-toolbar button {
            border-radius: var(--radius-md) !important;
            margin: 0 4px !important;
            transition: all 0.2s;
          }
        `}} />
        
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            culture="it"
            messages={{
              next: 'Avanti',
              previous: 'Indietro',
              today: 'Oggi',
              month: 'Mese',
              week: 'Settimana',
              day: 'Giorno',
              agenda: 'Agenda',
              date: 'Data',
              time: 'Ora',
              event: 'Evento',
              noEventsInRange: 'Nessun evento in questo periodo',
              showMore: total => '+' + total + ' altri'
            }}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            components={{
              event: EventComponent
            }}
          />
        )}
      </div>

      <Modal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedEvent ? 'Modifica Evento' : 'Nuovo Evento'}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {selectedEvent ? (
              <Button variant="danger" icon={<Trash2 size={16} />} onClick={handleDelete}>
                Elimina
              </Button>
            ) : <div />}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button onClick={() => setIsModalOpen(false)}>Annulla</Button>
              <Button variant="primary" onClick={handleSave} disabled={!formData.title}>Salva</Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
          <TextInput 
            label="Titolo"
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            placeholder="Titolo evento..."
            fullWidth
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <TextInput 
              label="Inizio"
              type="datetime-local" 
              value={formData.start}
              onChange={e => setFormData({...formData, start: e.target.value})}
              leftIcon={<Clock size={16} />}
              fullWidth
            />
            <TextInput 
              label="Fine"
              type="datetime-local" 
              value={formData.end}
              onChange={e => setFormData({...formData, end: e.target.value})}
              leftIcon={<Clock size={16} />}
              fullWidth
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              <PaintBucket size={16} /> Colore
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['#007aff', '#34c759', '#ff3b30', '#ff9500', '#af52de', '#5856d6'].map(c => (
                <button
                  key={c}
                  onClick={() => setFormData({...formData, color: c})}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    border: formData.color === c ? '2px solid var(--color-text)' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: formData.color === c ? 'scale(1.1)' : 'none',
                    boxShadow: formData.color === c ? 'var(--shadow-md)' : 'none'
                  }}
                />
              ))}
            </div>
          </div>

          <TextInput 
            label="Descrizione (Opzionale)"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            placeholder="Dettagli aggiuntivi..."
            leftIcon={<AlignLeft size={16} />}
            fullWidth
          />
        </div>
      </Modal>
      </div>
    </div>
  );
}
