import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Plus, Trash2, StickyNote, Bold, Italic, List, ListOrdered, Save } from 'lucide-react';
import StickyHeader from '../components/ui/StickyHeader';
import Button from '../components/ui/Button';

export default function NotesApp() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#ffeb3b');

  const token = localStorage.getItem('token');
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] text-[var(--color-text)]',
      },
    },
  });

  const fetchNotes = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/admin/notes', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleSelectNote = (note: any) => {
    setSelectedNote(note);
    setTitle(note.title);
    setColor(note.color || '#ffeb3b');
    editor?.commands.setContent(note.content || '');
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setTitle('');
    setColor('#ffeb3b');
    editor?.commands.setContent('');
  };

  const handleSave = async () => {
    if (!title) return;
    try {
      const payload = {
        title,
        content: editor?.getHTML(),
        color,
        isPinned: false
      };

      if (selectedNote) {
        await fetch(`http://localhost:3000/api/admin/notes/${selectedNote.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });
      } else {
        const res = await fetch(`http://localhost:3000/api/admin/notes`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json();
          setSelectedNote(data);
        }
      }
      fetchNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!selectedNote) return;
    try {
      await fetch(`http://localhost:3000/api/admin/notes/${selectedNote?.id}`, {
        method: 'DELETE',
        headers: authHeaders
      });
      handleNewNote();
      fetchNotes();
    } catch (e) {
      console.error(e);
    }
  };

  const colors = [
    { label: 'Giallo', value: '#ffeb3b' },
    { label: 'Verde', value: '#a5d6a7' },
    { label: 'Azzurro', value: '#90caf9' },
    { label: 'Rosa', value: '#f48fb1' },
    { label: 'Viola', value: '#ce93d8' }
  ];

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', backgroundColor: 'var(--color-background)' }}>
      
      {/* SIDEBAR */}
      <div style={{ 
        width: '280px', 
        borderRight: '1px solid var(--color-border-glass)', 
        backgroundColor: 'rgba(var(--color-surface-rgb), 0.5)',
        backdropFilter: 'blur(40px)',
        display: 'flex', 
        flexDirection: 'column',
        zIndex: 10
      }}>
        <StickyHeader paddingY="md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-text-main)' }}>
            <StickyNote size={18} color="var(--color-primary)" />
            Le Mie Note
          </div>
          <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={handleNewNote} />
        </StickyHeader>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Caricamento...</div>
          ) : notes.length === 0 ? (
            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Nessuna nota</div>
          ) : (
            notes.map(note => (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: selectedNote?.id === note.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                  backgroundColor: selectedNote?.id === note.id ? 'var(--color-surface-hover)' : 'transparent',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                onMouseLeave={e => {
                  if (selectedNote?.id !== note.id) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: note.color || '#ffeb3b', flexShrink: 0 }} />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--color-text)' }}>
                    {note.title}
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingLeft: '14px' }}>
                  {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* EDITOR */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Editor Toolbar Header */}
        <StickyHeader paddingY="md" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem',
          borderBottom: '1px solid var(--color-border-glass)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <input 
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titolo nota..."
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                flex: 1,
                color: 'var(--color-text)',
              }}
            />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.25rem', marginRight: '1rem' }}>
                {colors.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: c.value,
                      border: color === c.value ? '2px solid var(--color-text)' : '2px solid transparent',
                      transition: 'transform 0.2s',
                      transform: color === c.value ? 'scale(1.1)' : 'none',
                      cursor: 'pointer'
                    }}
                    title={c.label}
                  />
                ))}
              </div>
              
              {selectedNote && (
                <Button variant="danger" icon={<Trash2 size={16} />} onClick={handleDelete} title="Elimina" />
              )}
              
              <Button 
                variant="primary" 
                icon={<Save size={16} />} 
                onClick={handleSave} 
                disabled={!title}
              >
                Salva
              </Button>
            </div>
          </div>
          
          {/* Format Toolbar */}
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <Button 
              size="sm" 
              variant={editor?.isActive('bold') ? 'primary' : 'secondary'} 
              icon={<Bold size={14} />} 
              onClick={() => editor?.chain().focus().toggleBold().run()} 
            />
            <Button 
              size="sm" 
              variant={editor?.isActive('italic') ? 'primary' : 'secondary'} 
              icon={<Italic size={14} />} 
              onClick={() => editor?.chain().focus().toggleItalic().run()} 
            />
            <div style={{ width: '1px', backgroundColor: 'var(--color-border)', margin: '0 0.5rem' }} />
            <Button 
              size="sm" 
              variant={editor?.isActive('bulletList') ? 'primary' : 'secondary'} 
              icon={<List size={14} />} 
              onClick={() => editor?.chain().focus().toggleBulletList().run()} 
            />
            <Button 
              size="sm" 
              variant={editor?.isActive('orderedList') ? 'primary' : 'secondary'} 
              icon={<ListOrdered size={14} />} 
              onClick={() => editor?.chain().focus().toggleOrderedList().run()} 
            />
          </div>
        </StickyHeader>

        {/* Editor Content Container (simulating the sticky note color tint) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', position: 'relative' }}>
          <div 
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: color,
              opacity: 0.04,
              pointerEvents: 'none'
            }}
          />
          <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
            {/* Custom Prose styling override for Theme support */}
            <style dangerouslySetInnerHTML={{__html: `
              .ProseMirror p.is-editor-empty:first-child::before {
                content: attr(data-placeholder);
                float: left;
                color: var(--color-text-muted);
                pointer-events: none;
                height: 0;
              }
              .ProseMirror {
                font-size: 1.05rem;
                line-height: 1.7;
              }
              .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6 {
                color: var(--color-text);
              }
              .ProseMirror ul, .ProseMirror ol {
                color: var(--color-text);
                padding-left: 1.5rem;
              }
              .ProseMirror li p {
                margin: 0;
              }
            `}} />
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
