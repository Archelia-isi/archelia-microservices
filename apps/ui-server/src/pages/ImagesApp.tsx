import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { UploadCloud, RefreshCw, Image as ImageIcon, BarChart2 } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import AppSplashScreen from '../components/os/AppSplashScreen';
import StickyHeader from '../components/ui/StickyHeader';
import Tabs from '../components/ui/Tabs';
import Dropzone from '../components/ui/Dropzone';
import ActionCard from '../components/ui/ActionCard';
import ProgressBar from '../components/ui/ProgressBar';

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
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [page, setPage] = useState(1);

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
      setSelectedFiles(null);
    }
  };

  return (
    <div className={`${!isAppReady ? 'eq-splash-active' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', background: 'transparent', overflow: 'hidden', position: 'relative', boxSizing: 'border-box' }}>
      <AppSplashScreen 
        isLoading={!isAppReady} 
        appName="Immagini & Asset" 
        icon={<ImageIcon size={56} />} 
      />
      {/* Main App Container */}
      <div className={`equalizzatore-app eq-app-entry ${isAppReady ? 'ready' : ''}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="eq-main-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Dynamic Header & Tabs merged */}
        <StickyHeader paddingY="sm" backgroundOpacity={0} style={{ borderBottom: 'none' }}>
          <div style={{ padding: '0 var(--spacing-2xl)' }}>
            <GlassPanel padding="sm" radius="lg" style={{ display: 'inline-block' }}>
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
          </div>
        </StickyHeader>

        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-xl)', display: 'flex', flexDirection: 'column' }}>

          {activeTab === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: 'var(--spacing-3xl) var(--spacing-2xl)' }}>
              
              <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--spacing-2xl)', width: '100%', margin: '0', alignItems: 'stretch' }}>
                
                <GlassPanel style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--color-text-main)' }}>📁 Upload Cartella</h2>
                  </div>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: '15px' }}>
                    Seleziona una cartella — verranno caricate solo le immagini non presenti su Cloudinary
                  </p>

                  <Dropzone
                    onFilesSelected={(files) => setSelectedFiles(files)}
                    accept="image/*"
                    multiple
                    directoryMode
                    style={{ 
                      flex: 1, 
                      margin: 'var(--spacing-md) 0', 
                      padding: 'var(--spacing-2xl)', 
                      minHeight: '150px',
                      border: '2px dashed var(--color-border)',
                      background: 'transparent',
                      boxShadow: 'none',
                      borderRadius: 'var(--radius-xl)'
                    }}
                    subtitle={
                      <span style={{ fontSize: '16px', color: 'var(--color-text-secondary)' }}>
                        Clicca per <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>selezionare una cartella</span>
                      </span>
                    }
                  />

                  {selectedFiles && !isUploading && (
                     <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                        {selectedFiles.length} immagini selezionate pronte per il caricamento.
                     </div>
                  )}

                  {isUploading && (
                    <div style={{ width: '100%', marginTop: 'var(--spacing-xl)' }}>
                      <ProgressBar 
                        progress={uploadProgress} 
                        isActive={true} 
                        message="Caricamento in corso..." 
                        maxWidth="100%" 
                      />
                    </div>
                  )}
                  
                  <div style={{ marginTop: 'auto', paddingTop: 'var(--spacing-md)' }}>
                    <Button 
                      variant="primary" 
                      onClick={() => handleUpload(selectedFiles!)} 
                      disabled={!selectedFiles || isUploading}
                    >
                      Carica su Cloudinary
                    </Button>
                  </div>
                </GlassPanel>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  <ActionCard
                    className="images-action-card-wrapper"
                    title="Rigenerazione Mappa Immagini JSON"
                    description="Forza la ricostruzione della mappa leggendo direttamente i file da Cloudinary. Viene eseguito in automatico ad ogni upload riuscito."
                    action={
                      <Button variant="primary" onClick={handleRefreshMap} disabled={isMapping}>
                        <RefreshCw size={16} className={isMapping ? 'spin' : ''} /> {isMapping ? 'Rigenerazione...' : 'Forza Mappa'}
                      </Button>
                    }
                  />
                  
                  {mapStats && (
                    <div style={{ width: '100%', display: 'flex', gap: 'var(--spacing-md)' }}>
                      <div style={{ flex: 1, padding: 'var(--spacing-md)', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-xl)' }}>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Articoli mappati</span>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>{mapStats.articoli}</span>
                      </div>
                      <div style={{ flex: 1, padding: 'var(--spacing-md)', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-xl)' }}>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Immagini totali</span>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>{mapStats.immagini}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'report' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
              {isLoadingReport ? (
                <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Caricamento report...</div>
              ) : reportData ? (
                <>
                  <GlassPanel>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                      <div style={{ flex: 1, padding: 'var(--spacing-md)' }}>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Prodotti Totali</span>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>{reportData.summary.totalProducts}</span>
                      </div>
                      <div style={{ flex: 1, padding: 'var(--spacing-md)' }}>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Prodotti Senza Foto</span>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--color-error)' }}>{reportData.summary.productsWithoutImages}</span>
                      </div>
                      <div style={{ flex: 1, padding: 'var(--spacing-md)' }}>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Foto Senza Prodotto</span>
                        <span style={{ display: 'block', fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--color-warning)' }}>{reportData.summary.imagesWithoutProduct}</span>
                      </div>
                    </div>
                  </GlassPanel>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
                    <GlassPanel>
                      <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Prodotti Senza Foto <Badge variant="danger">{reportData.productsWithoutImages.length}</Badge></h3>
                      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)' }}>SKU</th>
                              <th style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)' }}>Short Code</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.productsWithoutImages.slice(0, 100).map((p, i) => (
                              <tr key={i}>
                                <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{p.sku}</td>
                                <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{p.shortCode}</td>
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
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr>
                              <th style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)' }}>Cloudinary Code</th>
                              <th style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid var(--color-border)' }}>Num. Immagini</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.imagesWithoutProduct.slice(0, 100).map((img, i) => (
                              <tr key={i}>
                                <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{img.code}</td>
                                <td style={{ padding: 'var(--spacing-sm)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{img.imageCount}</td>
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)' }}>
                    {galleryImages.slice((page - 1) * 100, page * 100).map((file, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', aspectRatio: '1', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                        <img style={{ width: '100%', height: '100%', objectFit: 'cover' }} src={`https://res.cloudinary.com/dikvomlhu/image/upload/w_300,f_webp,q_auto/prodotti/${encodeURIComponent(file)}`} alt={file} loading="lazy" />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', color: 'white', padding: 'var(--spacing-xl) var(--spacing-md) var(--spacing-md)', fontSize: 'var(--font-size-sm)', fontWeight: 500, textAlign: 'center', wordBreak: 'break-all' }}>{file}</div>
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
