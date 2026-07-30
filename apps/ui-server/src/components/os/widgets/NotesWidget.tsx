import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Notebook, FileText, ChevronRight } from 'lucide-react';

export default function NotesWidget({ widget }: { widget: DesktopWidget }) {
  // MOCK: Note dall'app Note
  const recentNotes = [
    { id: 1, title: 'Idee Nuova Collezione', preview: 'Appunti sui nuovi tessuti e pattern...', date: 'Oggi' },
    { id: 2, title: 'Meeting Zucchetti', preview: 'Punti da discutere per integrazione ERP...', date: 'Ieri' },
    { id: 3, title: 'To-Do List Settimana', preview: '1. Controllare ordini\n2. Aggiornare Shopify...', date: 'Lun' },
    { id: 4, title: 'Bozza Email Fornitori', preview: 'Gentile fornitore, le scriviamo per...', date: 'Ven' }
  ];

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', justifyContent: 'center', alignItems: 'center' }}>
      <Notebook size={32} style={{ color: 'var(--color-warning)', marginBottom: '8px' }} />
      <div style={{ fontSize: '2rem', fontWeight: 300, lineHeight: 1 }}>{recentNotes.length}</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>NOTE RECENTI</div>
    </div>
  );

  const renderMedium = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Notebook size={18} style={{ color: 'var(--color-warning)' }} />
        <span style={{ fontSize: '1rem', fontWeight: 600 }}>Note Rapide</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recentNotes.slice(0, 3).map(note => (
          <div key={note.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ background: 'var(--color-warning-transparent)', color: 'var(--color-warning)', padding: '8px', borderRadius: '8px' }}>
              <FileText size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note.title}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{note.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLarge = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Notebook size={20} style={{ color: 'var(--color-warning)' }} />
          <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Tutte le Note</span>
        </div>
        <button style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
          Apri App <ChevronRight size={16} />
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', flex: 1, overflowY: 'auto', alignContent: 'start', paddingRight: '8px' }}>
        {recentNotes.map(note => (
          <div key={note.id} style={{ background: 'var(--color-surface-solid)', padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', cursor: 'pointer', border: '1px solid var(--color-border)' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{note.title}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {note.preview}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: 'auto', fontWeight: 500 }}>
              {note.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="widget notes-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(!widget.size || widget.size === 'small') && renderSmall()}
      {widget.size === 'medium' && renderMedium()}
      {widget.size === 'large' && renderLarge()}
    </div>
  );
}
