import { useState, useEffect, useRef } from 'react';
import { Search, Package, User, ShoppingCart, Loader2 } from 'lucide-react';
import GlassPanel from '../ui/GlassPanel';
import { useWindowStore } from '../../store/useWindowStore';
import './TaskbarSearchPanel.css';

interface SearchResult {
  type: 'PRODUCT' | 'ORDER' | 'CUSTOMER';
  id: string;
  title: string;
  subtitle: string;
  image?: string;
}

export default function TaskbarSearchPanel() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { openAppWithContext } = useWindowStore();

  useEffect(() => {
    // Close panel when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        // We use a timeout to let the panel render before focusing
        setTimeout(() => {
          const input = containerRef.current?.querySelector('input');
          if (input) input.focus();
        }, 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token') || '';
        // In OS we use proxy or API url logic. Let's use relative or rely on Vite proxy / local IP.
        // The API gateway is usually on the same host but port 3000, or handled by vite proxy.
        // Archelia UI uses VITE_API_URL or relative if behind proxy.
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/admin/search/global?q=${encodeURIComponent(query)}&limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'PRODUCT': return <Package size={16} />;
      case 'ORDER': return <ShoppingCart size={16} />;
      case 'CUSTOMER': return <User size={16} />;
      default: return <Search size={16} />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    
    switch (result.type) {
      case 'ORDER':
        openAppWithContext('orders', { search: result.title.replace('Ordine #', '') });
        break;
      case 'CUSTOMER':
        openAppWithContext('customers', { search: result.id });
        break;
      case 'PRODUCT':
        openAppWithContext('products', { search: result.title });
        break;
    }
  };

  return (
    <div className="taskbar-search-container" ref={containerRef}>
      <div className="taskbar-search-input-wrapper">
         <Search size={16} className="taskbar-search-icon" />
         <input 
           type="text" 
           placeholder="Cerca (Cmd+K)" 
           value={query}
           onChange={(e) => {
             setQuery(e.target.value);
             if (e.target.value) setIsOpen(true);
           }}
           onFocus={() => { if (query) setIsOpen(true); }}
           className="taskbar-search-input"
         />
      </div>

      {isOpen && (query || loading) && (
        <GlassPanel className="taskbar-search-flyout">
          {loading && <div className="taskbar-search-loading"><Loader2 className="spinner" size={24} /></div>}
          
          {!loading && results.length === 0 && (
            <div className="taskbar-search-empty">Nessun risultato trovato</div>
          )}

          {!loading && results.length > 0 && (
            <div className="taskbar-search-results">
              {results.map((r, i) => (
                <div key={i} className="taskbar-search-item" onClick={() => handleResultClick(r)}>
                  <div className="taskbar-search-item-icon">
                    {getIconForType(r.type)}
                  </div>
                  <div className="taskbar-search-item-content">
                    <div className="taskbar-search-item-title">{r.title}</div>
                    <div className="taskbar-search-item-subtitle">{r.subtitle}</div>
                  </div>
                  <div className="taskbar-search-item-type">
                    {r.type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
