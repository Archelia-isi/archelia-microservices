import { useState, useEffect } from 'react';
import { type DesktopWidget } from '../../../store/useWidgetStore';
import { Newspaper, ExternalLink } from 'lucide-react';

export default function NewsWidget({ widget }: { widget: DesktopWidget }) {
  const [news, setNews] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const rssUrl = widget.config?.rssUrl || 'https://www.ansa.it/sito/ansait_rss.xml';

  useEffect(() => {
    async function fetchNews() {
      try {
        setError(null);
        // Utilizziamo api.rss2json.com come proxy pubblico per evitare problemi di CORS
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
        const data = await res.json();
        
        if (data.status === 'ok') {
          setNews(data.items);
        } else {
          setError('Errore caricamento feed');
        }
      } catch (err) {
        console.error('News fetch error:', err);
        setError('Errore di rete');
      }
    }
    
    fetchNews();
    const interval = setInterval(fetchNews, 10 * 60 * 1000); // 10 min
    return () => clearInterval(interval);
  }, [rssUrl]);

  if (error) return <div className="widget flex-center" style={{ color: 'var(--color-danger)' }}>{error}</div>;
  if (news.length === 0) return <div className="widget flex-center">Caricamento News...</div>;

  const renderSmall = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Newspaper size={16} />
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>ULTIMA ORA</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {news[0].title}
      </div>
      <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 'auto' }}>
        {new Date(news[0].pubDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
      </div>
    </div>
  );

  const renderMedium = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <Newspaper size={16} />
        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>NEWS TOP</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {news.slice(0, 2).map((item, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', borderBottom: i < 2 ? '1px solid var(--color-border-glass)' : 'none', paddingBottom: i < 2 ? '8px' : '0' }}>
            <a href={item.link} target="_blank" rel="noreferrer" style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 600, fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {item.title}
            </a>
            <span style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>
              {new Date(item.pubDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLarge = () => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Newspaper size={18} />
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>RASSEGNA STAMPA</span>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
        {news.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
            {item.thumbnail && (
              <div style={{ width: '80px', height: '60px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.3, marginBottom: '4px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.description.replace(/<[^>]*>?/gm, '')}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {new Date(item.pubDate).toLocaleString()} <ExternalLink size={10} />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );

  return (
    <div className="widget news-widget" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {(!widget.size || widget.size === 'small') && renderSmall()}
      {widget.size === 'medium' && renderMedium()}
      {widget.size === 'large' && renderLarge()}
    </div>
  );
}
