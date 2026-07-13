import { useState } from 'react';
import { ChevronDown, Image as ImageIcon, Lock, Edit2, AlertTriangle } from 'lucide-react';
import type { StagingItem } from '../../pages/EqualizzatoreApp';
import CompareRow from './CompareRow';
import Badge from '../ui/Badge';
import './ReviewAccordion.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Props {
  item: StagingItem;
  onRefresh: () => void;
  taxonomy: {groups: any[], families: any[], categories: any[]};
  currentTab: string;
}

export default function ReviewAccordion({ item, onRefresh, taxonomy, currentTab }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [compareData, setCompareData] = useState<any>(null);
  const [duplicateOptions, setDuplicateOptions] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>('');
  
  const [editNom, setEditNom] = useState(false);
  const [nomData, setNomData] = useState({ groupCode: '', familyCode: '', categoryCode: '' });

  const isLocked = item.lockedBy && item.lockedBy !== 'ADMIN';

  const handleExpand = async () => {
    if (isOpen) {
      setIsOpen(false);
      await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/unlock`, { method: 'POST' });
      return;
    }
    
    if (isLocked) return; // cannot open

    try {
      const lockRes = await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/lock`, { method: 'POST' });
      if (!lockRes.ok) {
        alert("Prodotto bloccato da un altro utente!");
        onRefresh();
        return;
      }
      
      setIsOpen(true);
      const res = await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/compare`);
      const data = await res.json();
      if (data.success) {
        setCompareData(data);
      }

      if (currentTab === 'PENDING_DUPLICATE_CHECK') {
        const dupRes = await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/duplicate-options`);
        const dupData = await dupRes.json();
        if (dupData.success) {
          setDuplicateOptions(dupData.data);
          if (dupData.data.length > 0) setSelectedSku(dupData.data[0].sku);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const approveField = async (fieldKey: string, value: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/approve-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: fieldKey, value })
      });
      const data = await res.json();
      if (data.success) {
        setCompareData((prev: any) => ({
          ...prev, 
          staging: { ...prev.staging, approvedPayload: data.approvedPayload }
        }));
      }
    } catch (e) {
      console.error(e);
      alert('Errore salvataggio field');
    }
  };

  const regenerateField = async (fieldKey: string, instructions?: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/regenerate-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: fieldKey, instructions })
      });
      const data = await res.json();
      if (data.success) {
        approveField(fieldKey, data.newValue);
      } else {
        alert("Errore rigenerazione: " + data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const regenerateAll = async () => {
    if(!confirm("Rigenerare interamente il prodotto?")) return;
    try {
      await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/regenerate-all`, { method: 'POST' });
      alert("Rigenerazione totale avviata!");
      setIsOpen(false);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const approveText = async () => {
    try {
      await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/approve-text`, { method: 'POST' });
      setIsOpen(false);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const approveNomenclature = async () => {
    try {
      const payload = editNom ? nomData : {};
      const res = await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/approve-nomenclature`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if(data.success) {
        setIsOpen(false);
        onRefresh();
      } else {
        alert("Errore: " + data.error);
      }
    } catch (e) { console.error(e); }
  };

  const resolveDuplicate = async () => {
    try {
      const payloadToKeep = compareData?.staging?.approvedPayload || {};
      const res = await fetch(`${API_URL}/api/admin/equalizzatore/staging/${item.id}/resolve-sku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chosenSku: selectedSku, approvedPayload: payloadToKeep })
      });
      const data = await res.json();
      if(data.success) {
        setIsOpen(false);
        onRefresh();
      } else {
        alert("Errore: " + data.error);
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div className={`review-accordion ${isOpen ? 'open' : ''} ${isLocked ? 'locked' : ''}`}>
      {isLocked && (
        <div className="ra-lock-banner">
          <Lock size={14} /> Prodotto in lavorazione da: {item.lockedBy}
        </div>
      )}
      <div className="ra-header" onClick={handleExpand}>
        <div className="ra-title">
          <span className="ra-sku">{item.displaySku || item.sourceId}</span>
          <Badge variant={
            item.pipelineStatus.includes('PENDING') ? 'warning' :
            item.pipelineStatus === 'COMPLETED' ? 'success' : 'neutral'
          }>
            {item.pipelineStatus.replace('PENDING_', '').replace('_', ' ')}
          </Badge>
        </div>
        <div className="ra-toggle">
          {isOpen ? <span className="close-text">Chiudi Prodotto</span> : <span>Espandi <ChevronDown size={14} /></span>}
        </div>
      </div>

      {isOpen && compareData && (
        <div className="ra-body">
          <div className="ra-top-info">
            <div className="ra-image-box">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.sourceId} />
              ) : (
                <div className="ra-no-image">
                  <ImageIcon size={48} />
                  <span>Nessuna Immagine</span>
                </div>
              )}
            </div>
            
            <div className="ra-details-col">
              {/* Duplicate Resolving Block */}
              {currentTab === 'PENDING_DUPLICATE_CHECK' && (
                <div className="ra-duplicate-box">
                  <h4><AlertTriangle size={16} /> Risoluzione Duplicati SKU</h4>
                  <p>Sono state trovate varianti. Scegli lo SKU corretto con cui procedere.</p>
                  <select value={selectedSku} onChange={e => setSelectedSku(e.target.value)} className="ra-select">
                    {duplicateOptions.map(o => (
                      <option key={o.sku} value={o.sku}>{o.sku} - {o.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nomenclature Block (Always visible) */}
              <div className="ra-taxonomy-box">
                <div className="ra-tax-header">
                  <h4>Nomenclatura Assegnata</h4>
                  {currentTab === 'PENDING_NOMENCLATURE' && !editNom && (
                    <button className="ra-edit-btn" onClick={() => {
                      setEditNom(true);
                      setNomData({
                        groupCode: compareData.staging.phase1Payload?.productGroup || '',
                        familyCode: compareData.staging.phase1Payload?.family || '',
                        categoryCode: compareData.staging.phase1Payload?.category || ''
                      });
                    }}>
                      <Edit2 size={14} /> Modifica
                    </button>
                  )}
                </div>
                
                {editNom ? (
                  <div className="ra-tax-edit">
                    <select value={nomData.groupCode} onChange={e => setNomData({...nomData, groupCode: e.target.value})}>
                      <option value="">-- Seleziona Gruppo --</option>
                      {taxonomy.groups.map(g => <option key={g.code} value={g.code}>{g.name}</option>)}
                    </select>
                    <select value={nomData.familyCode} onChange={e => setNomData({...nomData, familyCode: e.target.value})}>
                      <option value="">-- Seleziona Famiglia --</option>
                      {taxonomy.families.map(f => <option key={f.code} value={f.code}>{f.name}</option>)}
                    </select>
                    <select value={nomData.categoryCode} onChange={e => setNomData({...nomData, categoryCode: e.target.value})}>
                      <option value="">-- Seleziona Categoria --</option>
                      {taxonomy.categories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                    <div className="ra-tax-actions">
                      <button onClick={() => setEditNom(false)} className="cancel">Annulla</button>
                      <button onClick={approveNomenclature} className="save">Salva Nomenclatura</button>
                    </div>
                  </div>
                ) : (
                  <div className="ra-tags">
                    <div className="ra-tag">
                      <span className="label">GRUPPO:</span>
                      <span className="val">{compareData.staging.phase1Payload?.productGroupName || compareData.staging.phase1Payload?.productGroup || '-'}</span>
                    </div>
                    <div className="ra-tag">
                      <span className="label">FAMIGLIA:</span>
                      <span className="val">{compareData.staging.phase1Payload?.familyName || compareData.staging.phase1Payload?.family || '-'}</span>
                    </div>
                    <div className="ra-tag">
                      <span className="label">CATEGORIA:</span>
                      <span className="val">{compareData.staging.phase1Payload?.categoryName || compareData.staging.phase1Payload?.category || '-'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="ra-table-container">
            <table className="ra-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Campo Testuale</th>
                  <th style={{ width: '25%' }}>Dato Originale</th>
                  <th style={{ width: '55%' }}>Proposta IA / Approvato</th>
                </tr>
              </thead>
              <tbody>
                <CompareRow 
                  label="Titolo Tecnico B2B" fieldKey="technicalB2BTitle"
                  oldVal={compareData.original?.title || compareData.original?.ardesart || ''}
                  newVal={compareData.staging.phase3Payload?.technicalB2BTitle || ''}
                  compareData={compareData} currentTab={currentTab}
                  onApprove={approveField} onRegenerate={regenerateField}
                />
                <CompareRow 
                  label="Descrizione Tecnica" fieldKey="technicalDetails"
                  oldVal={compareData.original?.technicalDesc || compareData.original?.ardessup || ''}
                  newVal={typeof compareData.staging.phase1Payload?.technicalDetails === 'object' ? Object.entries(compareData.staging.phase1Payload.technicalDetails).map(([k,v]) => `${k}: ${v}`).join('; ') : (compareData.staging.phase1Payload?.technicalDetails || '')}
                  compareData={compareData} currentTab={currentTab}
                  onApprove={approveField} onRegenerate={regenerateField}
                />
                <CompareRow 
                  label="Titolo SEO" fieldKey="seoTitle"
                  oldVal={compareData.original?.seoTitle || ''}
                  newVal={compareData.staging.phase3Payload?.seoTitle || ''}
                  compareData={compareData} currentTab={currentTab}
                  onApprove={approveField} onRegenerate={regenerateField}
                />
                <CompareRow 
                  label="Meta Description" fieldKey="metaDescription"
                  oldVal={compareData.original?.metaDescription || ''}
                  newVal={compareData.staging.phase3Payload?.metaDescription || ''}
                  compareData={compareData} currentTab={currentTab}
                  onApprove={approveField} onRegenerate={regenerateField}
                />
                <CompareRow 
                  label="Meta Keywords" fieldKey="metaKeywords"
                  oldVal={compareData.original?.keywords || ''}
                  newVal={Array.isArray(compareData.staging.phase3Payload?.metaKeywords) ? compareData.staging.phase3Payload.metaKeywords.join(', ') : (compareData.staging.phase3Payload?.metaKeywords || '')}
                  compareData={compareData} currentTab={currentTab}
                  onApprove={approveField} onRegenerate={regenerateField}
                />
                <CompareRow 
                  label="Descrizione Commerciale" fieldKey="commercialDescHtml"
                  oldVal={compareData.original?.commercialDescHtml || ''}
                  newVal={compareData.staging.phase3Payload?.commercialDescHtml || ''}
                  compareData={compareData} currentTab={currentTab}
                  onApprove={approveField} onRegenerate={regenerateField}
                  isHtml={true}
                />
              </tbody>
            </table>
          </div>

          <div className="ra-footer-actions">
            <button onClick={handleExpand} className="ra-btn-ghost">Chiudi Pannello</button>
            <button onClick={regenerateAll} className="ra-btn-secondary">Rigenera Globale</button>
            
            {currentTab === 'PENDING_TEXT' && (
              <button onClick={approveText} className="ra-btn-primary">
                Approva Testi &rarr;
              </button>
            )}
            
            {currentTab === 'PENDING_NOMENCLATURE' && !editNom && (
              <button onClick={approveNomenclature} className="ra-btn-primary">
                Conferma Nomenclatura &rarr;
              </button>
            )}

            {currentTab === 'PENDING_DUPLICATE_CHECK' && (
              <button onClick={resolveDuplicate} className="ra-btn-warning">
                Risolvi SKU Selezionato &rarr;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
