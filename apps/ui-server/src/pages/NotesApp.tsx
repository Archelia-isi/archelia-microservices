import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Plus, Trash2, StickyNote, Bold, Italic, List, ListOrdered, Save } from 'lucide-react';

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
      await fetch(`http://localhost:3000/api/admin/notes/${selectedNote.id}`, {
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
    <div className="flex h-full w-full bg-[var(--color-background)] text-[var(--color-text)]">
      {/* SIDEBAR */}
      <div className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col">
        <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <h1 className="font-bold flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-[var(--color-primary)]" />
            Note
          </h1>
          <button 
            onClick={handleNewNote}
            className="p-1.5 bg-[var(--color-primary)] text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">Caricamento...</div>
          ) : notes.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">Nessuna nota</div>
          ) : (
            notes.map(note => (
              <button
                key={note.id}
                onClick={() => handleSelectNote(note)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedNote?.id === note.id 
                    ? 'border-[var(--color-primary)] shadow-sm bg-[var(--color-background)]' 
                    : 'border-transparent hover:bg-[var(--color-background)]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: note.color || '#ffeb3b' }} />
                  <div className="font-medium text-sm truncate">{note.title}</div>
                </div>
                <div className="text-xs text-[var(--color-text-muted)] truncate">
                  {new Date(note.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* EDITOR */}
      <div className="flex-1 flex flex-col relative bg-[var(--color-background)]">
        <div className="p-4 border-b border-[var(--color-border)] flex flex-col gap-4 bg-[var(--color-surface)] z-10">
          <div className="flex items-center justify-between">
            <input 
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titolo nota..."
              className="text-2xl font-bold bg-transparent border-none outline-none flex-1 text-[var(--color-text)] placeholder-[var(--color-text-muted)]"
            />
            
            <div className="flex items-center gap-2">
              <div className="flex gap-1 mr-4">
                {colors.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c.value ? 'scale-110 border-[var(--color-primary)] shadow-sm' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
              
              {selectedNote && (
                <button 
                  onClick={handleDelete}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Elimina"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              
              <button 
                onClick={handleSave}
                disabled={!title}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Salva
              </button>
            </div>
          </div>
          
          {/* Editor Toolbar */}
          <div className="flex gap-1">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition-colors ${editor?.isActive('bold') ? 'bg-[var(--color-border)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background)]'}`}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition-colors ${editor?.isActive('italic') ? 'bg-[var(--color-border)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background)]'}`}
            >
              <Italic className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-[var(--color-border)] mx-1 self-center" />
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded transition-colors ${editor?.isActive('bulletList') ? 'bg-[var(--color-border)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background)]'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded transition-colors ${editor?.isActive('orderedList') ? 'bg-[var(--color-border)] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-background)]'}`}
            >
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor Content Container (simulating the sticky note color tint) */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{ backgroundColor: color }}
          />
          <div className="max-w-3xl mx-auto relative z-10">
            {/* Custom Prose styling override for Theme support */}
            <style dangerouslySetInnerHTML={{__html: `
              .ProseMirror p.is-editor-empty:first-child::before {
                content: attr(data-placeholder);
                float: left;
                color: var(--color-text-muted);
                pointer-events: none;
                height: 0;
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
