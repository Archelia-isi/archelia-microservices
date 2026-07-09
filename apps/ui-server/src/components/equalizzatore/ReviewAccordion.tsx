import { useState } from 'react';
import { ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import type { StagingItem } from '../../pages/EqualizzatoreApp';
import CompareRow from './CompareRow';
import './ReviewAccordion.css';

interface Props {
  item: StagingItem;
  onRefresh: () => void;
}

export default function ReviewAccordion({ item, onRefresh }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const approveField = async (fieldKey: string, value: string) => {
    try {
      const currentApproved = item.approvedPayload || {};
      const newApproved = { ...currentApproved, [fieldKey]: value };

      await fetch(`http://localhost:3000/api/admin/equalizzatore/staging/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedPayload: newApproved })
      });
      onRefresh();
    } catch (e) {
      console.error(e);
      alert('Errore salvataggio field');
    }
  };

  return (
    <div className={`review-accordion ${isOpen ? 'open' : ''}`}>
      <div className="ra-header" onClick={() => setIsOpen(!isOpen)}>
        <div className="ra-title">
          <h3>{item.sourceId}</h3>
          <span className={`status-badge ${item.pipelineStatus.toLowerCase()}`}>
            AI: {item.pipelineStatus}
          </span>
        </div>
        <div className="ra-toggle">
          <span>Espandi</span>
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && (
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
            
            <div className="ra-taxonomy-box">
              <h4>Nomenclatura Assegnata</h4>
              <div className="ra-tags">
                <div className="ra-tag">
                  <span className="label">GRUPPO:</span>
                  <span className="val">{item.phase1Payload?.productGroup || '-'}</span>
                </div>
                <div className="ra-tag">
                  <span className="label">FAMIGLIA:</span>
                  <span className="val">{item.phase1Payload?.family || '-'}</span>
                </div>
                <div className="ra-tag">
                  <span className="label">CATEGORIA:</span>
                  <span className="val">{item.phase1Payload?.category || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="ra-table-container">
            <table className="ra-table">
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Campo Testuale</th>
                  <th style={{ width: '30%' }}>Dato Originale</th>
                  <th style={{ width: '50%' }}>Proposta IA</th>
                </tr>
              </thead>
              <tbody>
                <CompareRow 
                  label="Titolo Tecnico B2B"
                  fieldKey="technicalB2BTitle"
                  oldVal={item.originalRawData?.ardesart || ''}
                  newVal={item.phase3Payload?.technicalB2BTitle || ''}
                  approvedVal={item.approvedPayload?.technicalB2BTitle}
                  onApprove={approveField}
                />
                <CompareRow 
                  label="Descrizione Tecnica"
                  fieldKey="technicalDescription"
                  oldVal={item.originalRawData?.ardessup || ''}
                  newVal={item.phase3Payload?.technicalDescription || ''}
                  approvedVal={item.approvedPayload?.technicalDescription}
                  onApprove={approveField}
                />
                <CompareRow 
                  label="Titolo SEO"
                  fieldKey="seoTitle"
                  oldVal={''}
                  newVal={item.phase3Payload?.seoTitle || ''}
                  approvedVal={item.approvedPayload?.seoTitle}
                  onApprove={approveField}
                />
                <CompareRow 
                  label="Meta Description"
                  fieldKey="metaDescription"
                  oldVal={''}
                  newVal={item.phase3Payload?.metaDescription || ''}
                  approvedVal={item.approvedPayload?.metaDescription}
                  onApprove={approveField}
                />
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
