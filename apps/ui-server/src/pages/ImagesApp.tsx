import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { UploadCloud, RefreshCw, Image as ImageIcon, BarChart2, FolderDown } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import AppSplashScreen from '../components/os/AppSplashScreen';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import './ImagesApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');
const API_BASE = `${API_URL}/api/admin`;
type TabType = 'upload' | 'report' | 'gallery';

interface ImageReport {
  summary: {
    totalProducts: number;
    productsWithImages: number;
    productsWithoutImages: number;
    totalImageCodes: number;
    imagesWithoutProduct: number;
  };
  productsWithoutImages: { sku: string; shortCode: string }[];
  imagesWithoutProduct: { code: string; imageCount: number }[];
}

export default function ImagesApp() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMapping, setIsMapping] = useState(false);
  const [mapStats, setMapStats] = useState<{ articoli: number; immagini: number } | null>(null);

  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<ImageReport | null>(null);

  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'report' && !reportData) fetchReport();
    if (tab === 'gallery' && galleryImages.length === 0) fetchGallery();
  };

  const fetchReport = async () => {
    setIsLoadingReport(true);
    try {
      const res = await fetch(`${API_BASE}/image-report`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore fetch report');
      setReportData(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const fetchGallery = async () => {
    setIsLoadingGallery(true);
    try {
      const res = await fetch(`${API_BASE}/cloudinary-images`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore fetch galleria');
      setGalleryImages(data.existingFiles);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoadingGallery(false);
    }
  };

  const handleRefreshMap = async () => {
    setIsMapping(true);
    const loadingToast = toast.loading('Rigenerazione mappa in corso...');
    try {
      const res = await fetch(`${API_BASE}/refresh-image-map`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore rigenerazione mappa');
      setMapStats({ articoli: data.articoli, immagini: data.immagini });
      toast.success(`Mappa aggiornata: ${data.articoli} articoli, ${data.immagini} immagini`, { id: loadingToast });
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast });
    } finally {
      setIsMapping(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUpload(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleUpload(e.target.files);
    }
  };

  const handleUpload = async (files: FileList) => {
    setIsUploading(true);
    setUploadProgress(0);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('regenerateMap', 'true');

    const loadingToast = toast.loading(`Upload di ${files.length} file in corso...`);
    try {
      const res = await fetch(`${API_BASE}/upload-images`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore upload');
      
      toast.success(`Caricamento completato: ${data.uploaded} file. Errori: ${data.errors}`, { id: loadingToast });
      if (data.mapRegenerated) {
        setMapStats(data.mapStats);
      }
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast });
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`images-app ${!isAppReady ? 'eq-splash-active' : ''}`}>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Immagini & Asset" 
        icon={<ImageIcon size={56} />} 
      />
      {/* Main App Container */}
      <div className={`equalizzatore-app eq-app-entry ${isAppReady ? 'ready' : ''}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="eq-main-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Dynamic Header & Tabs merged */}
        <StickyHeader paddingY="md" backgroundOpacity={0} style={{ borderBottom: 'none' }}>
          <GlassPanel padding="sm" radius="lg" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Tabs 
              activeTab={activeTab}
              onChange={(id) => handleTabChange(id as TabType)}
              tabs={[
                { id: 'upload', label: 'Upload Cartella', icon: <UploadCloud size={14}/> },
                { id: 'report', label: 'Report', icon: <BarChart2 size={14}/> },
                { id: 'gallery', label: 'Galleria', icon: <ImageIcon size={14}/> },
              ]}
            />
          </GlassPanel>
        </StickyHeader>

        <div className="images-app-content" style={{ flex: 1, overflowY: 'auto' }}>

          {activeTab === 'upload' && (
            <div className="images-upload-container">
              <div className="images-upload-blob images-upload-blob-1"></div>
              <div className="images-upload-blob images-upload-blob-2"></div>
              
              <div 
                className={`images-upload-area ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="images-upload-icon-wrapper">
                  <FolderDown size={48} strokeWidth={2} />
                </div>
                <div className="images-upload-texts">
                  <h3 className="images-upload-title">Trascina le immagini qui</h3>
                  <p className="images-upload-subtitle">oppure clicca per selezionare dal tuo computer</p>
                </div>
                
                {isUploading && (
                  <div className="images-progress-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '8px' }}>
                      <span>Caricamento in corso...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="images-progress-bar">
                      <div className="images-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                )}
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  multiple 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  onChange={handleFileInput}
                  {...({ webkitdirectory: "true", directory: "true" } as any)}
                />
              </div>

              {/* Mappa JSON spostata in Upload Cartella */}
              <div className="images-action-card">
                <div className="images-action-text">
                  <h3>Rigenerazione Mappa Immagini JSON</h3>
                  <p>
                    Forza la ricostruzione della mappa leggendo direttamente i file da Cloudinary. 
                    Viene eseguito in automatico ad ogni upload riuscito.
                  </p>
                </div>
                <Button variant="primary" onClick={handleRefreshMap} disabled={isMapping}>
                  <RefreshCw size={16} className={isMapping ? 'spin' : ''} /> {isMapping ? 'Rigenerazione...' : 'Forza Mappa'}
                </Button>
              </div>
              
              {mapStats && (
                <div className="images-stats" style={{ width: '100%', maxWidth: '800px', marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-md)' }}>
                  <div className="images-stat-item" style={{ flex: 1, padding: 'var(--spacing-md)', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-xl)', backdropFilter: 'blur(20px)' }}>
                    <span className="images-stat-label" style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Articoli mappati</span>
                    <span className="images-stat-value" style={{ display: 'block', fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>{mapStats.articoli}</span>
                  </div>
                  <div className="images-stat-item" style={{ flex: 1, padding: 'var(--spacing-md)', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-xl)', backdropFilter: 'blur(20px)' }}>
                      <span className="images-stat-label" style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Immagini totali su Cloudinary</span>
                      <span className="images-stat-value" style={{ display: 'block', fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>{mapStats.immagini}</span>
                    </div>
                  </div>
                )}
            </div>
          )}

          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
              {isLoadingReport ? (
                <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Caricamento report...</div>
              ) : reportData ? (
                <>
                  <GlassPanel>
                    <div className="images-stats">
                      <div className="images-stat-item">
                        <span className="images-stat-label">Prodotti Totali</span>
                        <span className="images-stat-value">{reportData.summary.totalProducts}</span>
                      </div>
                      <div className="images-stat-item">
                        <span className="images-stat-label">Prodotti Senza Foto</span>
                        <span className="images-stat-value" style={{ color: 'var(--color-error)' }}>{reportData.summary.productsWithoutImages}</span>
                      </div>
                      <div className="images-stat-item">
                        <span className="images-stat-label">Foto Senza Prodotto</span>
                        <span className="images-stat-value" style={{ color: 'var(--color-warning)' }}>{reportData.summary.imagesWithoutProduct}</span>
                      </div>
                    </div>
                  </GlassPanel>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
                    <GlassPanel>
                      <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Prodotti Senza Foto <Badge variant="danger">{reportData.productsWithoutImages.length}</Badge></h3>
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="images-table">
                          <thead>
                            <tr>
                              <th>SKU</th>
                              <th>Short Code</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.productsWithoutImages.slice(0, 100).map((p, i) => (
                              <tr key={i}>
                                <td>{p.sku}</td>
                                <td>{p.shortCode}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {reportData.productsWithoutImages.length > 100 && (
                          <div style={{ padding: 'var(--spacing-sm)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                            ... e altri {reportData.productsWithoutImages.length - 100} risultati
                          </div>
                        )}
                      </div>
                    </GlassPanel>
                    
                    <GlassPanel>
                      <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Foto Orfane <Badge variant="warning">{reportData.imagesWithoutProduct.length}</Badge></h3>
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="images-table">
                          <thead>
                            <tr>
                              <th>Cloudinary Code</th>
                              <th>Num. Immagini</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.imagesWithoutProduct.slice(0, 100).map((img, i) => (
                              <tr key={i}>
                                <td>{img.code}</td>
                                <td>{img.imageCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {reportData.imagesWithoutProduct.length > 100 && (
                          <div style={{ padding: 'var(--spacing-sm)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                            ... e altri {reportData.imagesWithoutProduct.length - 100} risultati
                          </div>
                        )}
                      </div>
                    </GlassPanel>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {activeTab === 'gallery' && (
            <GlassPanel>
              {isLoadingGallery ? (
                <div style={{ padding: 'var(--spacing-3xl)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-lg)' }}>Caricamento galleria da Cloudinary... (potrebbe richiedere qualche secondo)</div>
              ) : (
                <>
                  <div className="images-gallery-grid">
                    {galleryImages.slice((page - 1) * 100, page * 100).map((file, i) => (
                      <div key={i} className="images-gallery-item">
                        <img src={`https://res.cloudinary.com/dikvomlhu/image/upload/w_300,f_webp,q_auto/prodotti/${encodeURIComponent(file)}`} alt={file} loading="lazy" />
                        <div className="images-gallery-label" style={{ wordBreak: 'break-all' }}>{file}</div>
                      </div>
                    ))}
                  </div>
                  {galleryImages.length > 100 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-md)', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-lg)' }}>
                      <Button variant="secondary" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Precedente</Button>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        Pagina {page} di {Math.ceil(galleryImages.length / 100)} ({galleryImages.length} foto)
                      </span>
                      <Button variant="primary" onClick={() => setPage(Math.min(Math.ceil(galleryImages.length / 100), page + 1))} disabled={page >= Math.ceil(galleryImages.length / 100)}>Successiva</Button>
                    </div>
                  )}
                </>
              )}
            </GlassPanel>
          )}

        </div>
        </div>
      </div>
    </div>
  );
}
