import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { UploadCloud, RefreshCw, Image as ImageIcon, BarChart2, FolderDown } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import AppSplashScreen from '../components/os/AppSplashScreen';
import './ImagesApp.css';

const API_BASE = '/api/admin';

type TabType = 'upload' | 'map' | 'report' | 'gallery';

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
      {!isAppReady && <AppSplashScreen appName="Immagini & Asset" icon={<ImageIcon size={32} />} isLoading={true} />}
      
      {isAppReady && (
        <div className="images-app-content">
          <div className="images-tabs">
            <button className={`images-tab-btn ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => handleTabChange('upload')}>
              <UploadCloud size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Upload Cartella
            </button>
            <button className={`images-tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => handleTabChange('map')}>
              <RefreshCw size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Mappa JSON
            </button>
            <button className={`images-tab-btn ${activeTab === 'report' ? 'active' : ''}`} onClick={() => handleTabChange('report')}>
              <BarChart2 size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Report
            </button>
            <button className={`images-tab-btn ${activeTab === 'gallery' ? 'active' : ''}`} onClick={() => handleTabChange('gallery')}>
              <ImageIcon size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Galleria
            </button>
          </div>

          {activeTab === 'upload' && (
            <GlassPanel>
              <div 
                className={`images-upload-area ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <FolderDown size={48} className="images-upload-icon" />
                <p>Trascina qui le immagini o clicca per selezionarle</p>
                {isUploading && (
                  <div style={{ marginTop: '1rem', width: '100%', maxWidth: '300px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Caricamento in corso...</div>
                    <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--color-primary)', width: `${uploadProgress}%`, transition: 'width 0.3s' }}></div>
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
            </GlassPanel>
          )}

          {activeTab === 'map' && (
            <GlassPanel>
              <div className="images-controls">
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>Rigenerazione Mappa Immagini</h3>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                    Forza la ricostruzione del file JSON `mappa_immagini.json` leggendo direttamente i file presenti su Cloudinary.
                  </p>
                </div>
                <Button variant="primary" onClick={handleRefreshMap} disabled={isMapping}>
                  <RefreshCw size={16} /> {isMapping ? 'Rigenerazione...' : 'Rigenera Ora'}
                </Button>
              </div>
              {mapStats && (
                <div className="images-stats" style={{ marginTop: 'var(--spacing-xl)' }}>
                  <div className="images-stat-item">
                    <span className="images-stat-label">Articoli mappati</span>
                    <span className="images-stat-value">{mapStats.articoli}</span>
                  </div>
                  <div className="images-stat-item">
                    <span className="images-stat-label">Immagini totali</span>
                    <span className="images-stat-value">{mapStats.immagini}</span>
                  </div>
                </div>
              )}
            </GlassPanel>
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
                <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Caricamento galleria da Cloudinary...</div>
              ) : (
                <div className="images-gallery-grid">
                  {galleryImages.slice(0, 50).map((file, i) => (
                    <div key={i} className="images-gallery-item">
                      <img src={`https://res.cloudinary.com/dikvomlhu/image/upload/w_200,f_webp,q_auto/prodotti/${encodeURIComponent(file)}`} alt={file} loading="lazy" />
                      <div className="images-gallery-label">{file}</div>
                    </div>
                  ))}
                </div>
              )}
              {galleryImages.length > 50 && (
                <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  Mostrati 50 di {galleryImages.length} file totali
                </div>
              )}
            </GlassPanel>
          )}

        </div>
      )}
    </div>
  );
}
