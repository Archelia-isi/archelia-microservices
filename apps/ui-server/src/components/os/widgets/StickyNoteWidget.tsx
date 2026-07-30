
import { type DesktopWidget, useWidgetStore } from '../../../store/useWidgetStore';

const COLORS = [
  '#fff0b3', // Giallo
  '#ffd6e0', // Rosa
  '#c7f0d2', // Verde
  '#d6eaff', // Blu
];

export default function StickyNoteWidget({ widget }: { widget: DesktopWidget }) {
  const { updateWidgetConfig } = useWidgetStore();
  
  // Default config has 4 notes
  const notes = widget.config?.notes || [
    { id: '1', text: '', color: COLORS[0] },
    { id: '2', text: '', color: COLORS[1] },
    { id: '3', text: '', color: COLORS[2] },
    { id: '4', text: '', color: COLORS[3] },
  ];

  const updateNote = (id: string, text: string) => {
    const newNotes = notes.map((n: any) => n.id === id ? { ...n, text } : n);
    updateWidgetConfig(widget.id, { notes: newNotes });
  };

  const changeColor = (id: string, color: string) => {
    const newNotes = notes.map((n: any) => n.id === id ? { ...n, color } : n);
    updateWidgetConfig(widget.id, { notes: newNotes });
  };

  const renderNote = (note: any) => (
    <div key={note.id} style={{ 
      background: note.color, 
      width: '100%', height: '100%', 
      display: 'flex', flexDirection: 'column', 
      borderRadius: '2px', // Post-it look usually has sharper edges
      boxShadow: '2px 4px 10px rgba(0,0,0,0.1)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ height: '20px', background: 'rgba(0,0,0,0.05)', display: 'flex', gap: '4px', padding: '0 8px', alignItems: 'center' }}>
        {COLORS.map(c => (
          <div 
            key={c}
            onClick={() => changeColor(note.id, c)}
            style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }}
          />
        ))}
      </div>
      <textarea
        value={note.text}
        onChange={e => updateNote(note.id, e.target.value)}
        placeholder="Scrivi qui..."
        style={{
          flex: 1, border: 'none', background: 'transparent', resize: 'none',
          padding: '12px', fontSize: '1rem', color: '#333', outline: 'none',
          fontFamily: "'Comic Sans MS', 'Chalkboard SE', 'Marker Felt', sans-serif" // Un tocco "handwritten"
        }}
      />
    </div>
  );

  return (
    <div className="widget sticky-note-widget" style={{ width: '100%', height: '100%', padding: '12px', background: 'transparent' }}>
      {(!widget.size || widget.size === 'small') && (
        renderNote(notes[0])
      )}
      
      {widget.size === 'medium' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', height: '100%' }}>
          {renderNote(notes[0])}
          {renderNote(notes[1])}
        </div>
      )}
      
      {widget.size === 'large' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '12px', height: '100%' }}>
          {renderNote(notes[0])}
          {renderNote(notes[1])}
          {renderNote(notes[2])}
          {renderNote(notes[3])}
        </div>
      )}
    </div>
  );
}
