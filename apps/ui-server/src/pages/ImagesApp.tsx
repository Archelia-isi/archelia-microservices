import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import './ImagesApp.css';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api-gateway-production-2ec6.up.railway.app' : 'http://localhost:3000');

export default function ImagesApp() {
  const [activeTab, setActiveTab] = useState<'upload' | 'report'>('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  const loadReport = async () => {
    setIsLoadingReport(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/image-report`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      toast.error('Errore caricamento report: ' + err.message);
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'report' && !reportData) {
      loadReport();
    }
  }, [activeTab]);

  const refreshMap = async () => {
    try {
      toast.loading('Rigenerazione mappa...', { id: 'refresh-map' });
      const res = await fetch(`${API_URL}/api/admin/refresh-image-map`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`Mappa rigenerata! ${data.articoli} articoli, ${data.immagini} immagini.`, { id: 'refresh-map' });
      if (activeTab === 'report') loadReport();
    } catch (err: any) {
      toast.error('Errore refresh mappa: ' + err.message, { id: 'refresh-map' });
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    
    const formData = new FormData();
    acceptedFiles.forEach(f => formData.append('files', f));
    formData.append('regenerateMap', 'true');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/upload-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Errore di sistema');
      
      toast.success(`Caricate ${result.uploaded} foto con successo. Errori: ${result.errors}`);
      if (result.mapRegenerated) {
        toast.success(`Mappa auto-rigenerata: ${result.mapStats?.articoli} articoli`);
      }
    } catch (err: any) {
      toast.error('Errore caricamento: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } });

  return (
    <div className="images-app-container">
      <div className="images-header">
        <div>
          <h1 className="images-title">Immagini & Asset</h1>
          <p className="images-subtitle">Gestione Cloudinary, Upload Massivo e Rigenerazione Mappa</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={refreshMap}>
            <i className="fa-solid fa-rotate"></i> Rigenera Mappa Immagini
          </button>
        </div>
      </div>

      <div className="images-tabs">
        <div className={`images-tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
          <i className="fa-solid fa-cloud-arrow-up"></i> Upload
        </div>
        <div className={`images-tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
          <i className="fa-solid fa-chart-pie"></i> Report Discrepanze
        </div>
      </div>

      <div className="images-content" style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'upload' && (
          <div className="upload-section">
            <div 
              {...getRootProps()} 
              className={`upload-area ${isDragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
            >
              <input {...getInputProps()} disabled={isUploading} />
              
              {isUploading ? (
                <>
                  <div className="loader-apple" style={{ width: 40, height: 40 }}></div>
                  <div className="upload-text">Caricamento in corso...</div>
                  <div className="upload-subtext">Attendere prego, il processo con Sharp può richiedere tempo per i file di grandi dimensioni.</div>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up upload-icon"></i>
                  <div className="upload-text">Trascina le immagini qui o clicca per selezionare</div>
                  <div className="upload-subtext">I file &gt; 9MB verranno ridimensionati e ottimizzati automaticamente. Al termine la mappa immagini verrà rigenerata in automatico.</div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="report-section">
            {isLoadingReport ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <div className="loader-apple"></div>
              </div>
            ) : reportData ? (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-label">Prodotti Totali</span>
                    <span className="stat-value">{reportData.summary.totalProducts}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Prodotti CON foto</span>
                    <span className="stat-value" style={{ color: 'var(--color-success)' }}>{reportData.summary.productsWithImages}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Prodotti SENZA foto</span>
                    <span className="stat-value" style={{ color: 'var(--color-danger)' }}>{reportData.summary.productsWithoutImages}</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-label">Codici Immagine Orfani</span>
                    <span className="stat-value" style={{ color: 'var(--color-warning)' }}>{reportData.summary.imagesWithoutProduct}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                  <div>
                    <h3 style={{ marginBottom: '1rem' }}>Prodotti senza foto</h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="data-table">
                        <thead><tr><th>SKU</th><th>Short Code (Atteso)</th></tr></thead>
                        <tbody>
                          {reportData.productsWithoutImages.map((p: any) => (
                            <tr key={p.sku}>
                              <td>{p.sku}</td>
                              <td>{p.shortCode}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h3 style={{ marginBottom: '1rem' }}>Foto orfane (Non associate a Prodotti)</h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <table className="data-table">
                        <thead><tr><th>Short Code Cloudinary</th><th>Numero Foto</th></tr></thead>
                        <tbody>
                          {reportData.imagesWithoutProduct.map((i: any) => (
                            <tr key={i.code}>
                              <td>{i.code}</td>
                              <td>{i.imageCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div>Nessun dato disponibile</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
