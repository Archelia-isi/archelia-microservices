import { useState } from 'react';
import { Eye, CheckCircle2, RotateCcw, X } from 'lucide-react';
import './CompareRow.css';

interface Props {
  label: string;
  fieldKey: string;
  oldVal: string;
  newVal: string;
  compareData: any;
  currentTab: string;
  onApprove: (field: string, val: string) => void;
  onRegenerate: (field: string, instructions?: string) => void;
  isHtml?: boolean;
}

export default function CompareRow({ label, fieldKey, oldVal, newVal, compareData, currentTab, onApprove, onRegenerate, isHtml = false }: Props) {
  const approvedVal = compareData?.staging?.approvedPayload?.[fieldKey];
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(approvedVal || newVal);
  const [previewContent, setPreviewContent] = useState<string | null>(null);

  const isLeftSelected = approvedVal === oldVal && approvedVal !== undefined;
  const isRightSelected = approvedVal !== oldVal || approvedVal === undefined; // default to right
  const rightBoxText = approvedVal !== undefined && approvedVal !== oldVal ? approvedVal : newVal;
  const isManualEdit = approvedVal !== undefined && approvedVal !== newVal && approvedVal !== oldVal;

  const handleSaveEdit = () => {
    onApprove(fieldKey, editValue);
    setIsEditing(false);
  };

  const handleRegenerate = () => {
    const prompt = window.prompt("Istruzioni per la IA (lascia vuoto per rigenerare normalmente):");
    if (prompt !== null) {
      onRegenerate(fieldKey, prompt);
    }
  };

  const renderContent = (val: string) => {
    if (isHtml) return <div className="cr-html-preview" dangerouslySetInnerHTML={{ __html: val || '-' }} />;
    return <p className="cr-text">{val || '-'}</p>;
  };

  return (
    <>
      <tr className="compare-row">
        <td className="cr-label">{label}</td>
        
        <td className="cr-cell">
          <div className={`cr-box ${isLeftSelected ? 'selected' : ''}`}>
            <div className="cr-box-header">
              <span className="cr-box-title">
                {isLeftSelected && <CheckCircle2 size={14} className="icon-success" />}
                ORIGINALE ZUCCHETTI
              </span>
              {!isLeftSelected && currentTab === 'PENDING_TEXT' && (
                <button className="cr-btn-small" onClick={() => onApprove(fieldKey, oldVal)}>
                  Scegli Originale
                </button>
              )}
            </div>
            <div className="cr-box-content">
              {renderContent(oldVal)}
            </div>
            <div className="cr-box-footer">
              <button className="cr-btn-text" onClick={() => setPreviewContent(oldVal)}>
                <Eye size={14} /> Anteprima Web
              </button>
            </div>
          </div>
        </td>

        <td className="cr-cell">
          <div className={`cr-box ai-box ${isRightSelected ? 'selected' : ''}`}>
            <div className="cr-box-header">
              <span className={`cr-box-title ${isManualEdit ? 'manual' : 'ai'}`}>
                <CheckCircle2 size={14} className="icon-success" />
                {isManualEdit ? 'MODIFICATO MANUALMENTE' : 'GENERATO DA IA'}
              </span>
              {currentTab === 'PENDING_TEXT' && (
                <button className="cr-btn-link" onClick={() => setIsEditing(!isEditing)}>
                  Modifica Testo
                </button>
              )}
            </div>

            <div className="cr-box-content">
              {isEditing ? (
                <div className="cr-edit-area">
                  <textarea 
                    value={editValue} 
                    onChange={e => setEditValue(e.target.value)}
                    rows={5}
                    className="cr-textarea"
                  />
                  <div className="cr-edit-actions">
                    <button className="cr-btn-small cancel" onClick={() => setIsEditing(false)}>Annulla</button>
                    <button className="cr-btn-small save" onClick={handleSaveEdit}>Salva Modifiche</button>
                  </div>
                </div>
              ) : (
                <>
                  {renderContent(rightBoxText)}
                  {fieldKey === 'technicalB2BTitle' && (
                    <div className="cr-char-count">Caratteri: {rightBoxText?.length || 0} / 60</div>
                  )}
                  {fieldKey === 'seoTitle' && (
                    <div className="cr-char-count">Caratteri: {rightBoxText?.length || 0} / 60</div>
                  )}
                  {fieldKey === 'metaDescription' && (
                    <div className="cr-char-count">Caratteri: {rightBoxText?.length || 0} / 160</div>
                  )}
                </>
              )}
            </div>
                
            {currentTab === 'PENDING_TEXT' && !isEditing && (
              <div className="cr-box-footer">
                <button className="cr-btn-text" onClick={() => setPreviewContent(rightBoxText)}>
                  <Eye size={14} /> Anteprima Web
                </button>
                <div className="cr-footer-right">
                  <button className="cr-btn-regen" onClick={handleRegenerate}>
                    <RotateCcw size={14} /> Rigenera con AI
                  </button>
                  {isManualEdit && (
                    <button className="cr-btn-link cancel" onClick={() => onApprove(fieldKey, newVal)}>
                      Ripristina IA
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </td>
      </tr>

      {previewContent !== null && (
        <div className="cr-preview-modal-overlay" onClick={() => setPreviewContent(null)}>
          <div className="cr-preview-modal-content" onClick={e => e.stopPropagation()}>
            <div className="cr-preview-modal-header">
              <h3>Anteprima: {label}</h3>
              <button className="cr-preview-close" onClick={() => setPreviewContent(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="cr-preview-modal-body">
              {isHtml ? (
                <div dangerouslySetInnerHTML={{ __html: previewContent || '' }} />
              ) : (
                <p>{previewContent}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
