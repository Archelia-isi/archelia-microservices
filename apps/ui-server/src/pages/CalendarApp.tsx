import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale/it';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Plus, X, Trash2, Calendar as CalendarIcon, Clock, AlignLeft, PaintBucket } from 'lucide-react';

// Locale config for date-fns
const locales = {
  'it': it,
}
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
      const res = await fetch('http://localhost:3000/api/admin/calendar', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        // Convert strings to Date objects
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
        // Update
        await fetch(`http://localhost:3000/api/admin/calendar/${selectedEvent.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(formData)
        });
      } else {
        // Create
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

  // Custom Event component to use theme colors
  const EventComponent = ({ event }: any) => {
    return (
      <div 
        className="px-1 h-full rounded text-sm font-medium overflow-hidden" 
        style={{ 
          backgroundColor: event.color || 'var(--color-primary)', 
          color: '#ffffff'
        }}
      >
        {event.title}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--color-background)] text-[var(--color-text)]">
      {/* HEADER */}
      <div className="sticky top-0 z-10 p-4 border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl flex items-center justify-between">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-[var(--color-primary)]" />
          Calendario Aziendale
        </h1>
        <button 
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
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Nuovo Evento
        </button>
      </div>

      {/* CALENDAR VIEW */}
      <div className="flex-1 p-4 overflow-hidden relative">
        {/* Custom CSS overrides for react-big-calendar to match our theme */}
        <style dangerouslySetInnerHTML={{__html: `
          .rbc-calendar {
            font-family: inherit;
          }
          .rbc-header {
            padding: 12px 8px;
            font-weight: 600;
            color: var(--color-text-muted);
            border-bottom: 1px solid var(--color-border);
            text-transform: uppercase;
            font-size: 0.75rem;
          }
          .rbc-month-view, .rbc-time-view, .rbc-agenda-view {
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            background: var(--color-surface);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
          }
          .rbc-day-bg, .rbc-month-row, .rbc-time-content, .rbc-time-header {
            border-color: var(--color-border);
          }
          .rbc-off-range-bg {
            background: var(--color-background);
          }
          .rbc-today {
            background: rgba(var(--color-primary-rgb, 0, 122, 255), 0.05);
          }
          .rbc-event {
            background-color: transparent;
            padding: 0;
            border: none;
          }
          .rbc-btn-group button {
            color: var(--color-text);
            border-color: var(--color-border);
            background: var(--color-surface);
          }
          .rbc-btn-group button:hover {
            background: var(--color-background);
          }
          .rbc-btn-group button.rbc-active {
            background: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
          }
          .rbc-toolbar button {
            border-radius: var(--radius-md);
            margin: 0 4px;
            transition: all 0.2s;
          }
        `}} />
        
        {loading ? (
          <div className="flex items-center justify-center h-full">
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
              noEventsInRange: 'Nessun evento in questo periodo'
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

      {/* EVENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] w-full max-w-md rounded-2xl shadow-2xl border border-[var(--color-border)] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] bg-[var(--color-background)]">
              <h2 className="text-lg font-semibold">{selectedEvent ? 'Modifica Evento' : 'Nuovo Evento'}</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-[var(--color-border)] rounded-full transition-colors text-[var(--color-text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">Titolo</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="Titolo evento..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Inizio</label>
                  <input 
                    type="datetime-local" 
                    value={formData.start}
                    onChange={e => setFormData({...formData, start: e.target.value})}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Fine</label>
                  <input 
                    type="datetime-local" 
                    value={formData.end}
                    onChange={e => setFormData({...formData, end: e.target.value})}
                    className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1 flex items-center gap-1"><PaintBucket className="w-3 h-3"/> Colore</label>
                <div className="flex gap-2">
                  {['#007aff', '#34c759', '#ff3b30', '#ff9500', '#af52de', '#5856d6'].map(c => (
                    <button
                      key={c}
                      onClick={() => setFormData({...formData, color: c})}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${formData.color === c ? 'scale-125 border-white shadow-md' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1 flex items-center gap-1"><AlignLeft className="w-3 h-3"/> Descrizione</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] min-h-[80px] resize-none text-sm"
                  placeholder="Dettagli opzionali..."
                />
              </div>
            </div>

            <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-background)] flex items-center justify-between">
              {selectedEvent ? (
                <button 
                  onClick={handleDelete}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Elimina"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 hover:bg-[var(--color-border)] rounded-lg transition-colors text-sm font-medium"
                >
                  Annulla
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!formData.title}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
