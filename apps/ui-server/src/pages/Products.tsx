import { Search, RefreshCw, Filter, PackageOpen, MoreVertical, ImageOff } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Product {
  id: string;
  sku: string;
  title: string | null;
  brand: string | null;
  price: number | null;
  stock: number | null;
  mainImage: string | null;
  publishedOnWeb: boolean;
}

export default function Products() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const fetchProducts = async (search = '') => {
    setLoading(true);
    try {
      const url = new URL(`${API_URL}/api/admin/products`);
      url.searchParams.set('page', '1');
      url.searchParams.set('limit', '50');
      if (search) url.searchParams.set('search', search);

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts(searchTerm);
  };

  const handleSyncZucchetti = async () => {
    setIsSyncing(true);
    setStatusMsg('Invio comando in coda...');
    try {
      const res = await fetch(`${API_URL}/api/admin/trigger-sync/import-products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` }
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('Worker Zucchetti avviato in background.');
      } else {
        setStatusMsg('Errore: ' + data.error);
      }
    } catch (err: any) {
      setStatusMsg('Errore di connessione');
    } finally {
      setTimeout(() => setIsSyncing(false), 3000);
    }
  };

  return (
    <div className="animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header & Actions */}
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
        <h2 className="text-h2" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <PackageOpen size={24} color="var(--color-primary)" />
          Catalogo Prodotti
        </h2>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {statusMsg && <span style={{ color: 'var(--color-primary)', fontSize: '13px', fontWeight: 500 }}>{statusMsg}</span>}
          <button 
            className="btn-primary flex-center" 
            style={{ gap: '0.5rem', padding: '0.6rem 1.2rem', opacity: isSyncing ? 0.7 : 1 }}
            onClick={handleSyncZucchetti}
            disabled={isSyncing}
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> 
            {isSyncing ? 'In coda...' : 'Sincronizza da ERP'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ 
        display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexShrink: 0,
        background: 'var(--color-bg-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)'
      }}>
        <form onSubmit={handleSearch} style={{ flex: 1, position: 'relative' }}>
          <Search size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Cerca per SKU, Titolo o EAN..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', 
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
              background: 'var(--color-bg)', color: 'var(--color-text)'
            }}
          />
        </form>
        <button className="btn-secondary flex-center" style={{ gap: '0.5rem' }}>
          <Filter size={18} /> Filtri
        </button>
      </div>

      {/* Data Grid */}
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        {loading ? (
          <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem' }}>
            <RefreshCw size={24} className="animate-spin text-muted" />
            <span className="text-muted">Caricamento prodotti...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: '1rem', padding: '3rem' }}>
            <div style={{ padding: '1.5rem', background: 'var(--color-bg)', borderRadius: '50%' }}>
              <PackageOpen size={32} color="var(--color-text-muted)" />
            </div>
            <h3 className="text-h3">Nessun prodotto trovato</h3>
            <p className="text-body text-muted text-center" style={{ maxWidth: '400px' }}>
              Non ci sono prodotti nel database. Prova a modificare i filtri di ricerca o avvia una sincronizzazione con l'ERP Zucchetti.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--color-bg-elevated)', zIndex: 1, boxShadow: '0 1px 0 var(--color-border)' }}>
              <tr>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '13px' }}>Immagine</th>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '13px' }}>SKU</th>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '13px' }}>Titolo</th>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '13px' }}>Marca</th>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '13px' }}>Giacenza</th>
                <th style={{ padding: '1rem', color: 'var(--color-text-muted)', fontWeight: 500, fontSize: '13px' }}>Stato Web</th>
                <th style={{ padding: '1rem', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s', cursor: 'pointer' }} className="hover-bg-muted">
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {product.mainImage ? (
                        <img src={product.mainImage} alt={product.sku} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <ImageOff size={16} color="var(--color-text-muted)" />
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '13px' }}>{product.sku}</td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '14px', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {product.title || '-'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '13px' }}>
                    <span style={{ padding: '0.2rem 0.6rem', background: 'var(--color-bg)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
                      {product.brand || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '14px', fontWeight: 500, color: (product.stock || 0) > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {product.stock || 0} pz
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {product.publishedOnWeb ? (
                      <span style={{ fontSize: '12px', padding: '0.2rem 0.5rem', background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)' }}>Pubblicato</span>
                    ) : (
                      <span style={{ fontSize: '12px', padding: '0.2rem 0.5rem', background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)' }}>Bozza</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button className="icon-btn" style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)' }}>
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
