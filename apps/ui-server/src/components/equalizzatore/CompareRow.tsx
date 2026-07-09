import { useState } from 'react';
import { Eye, CheckCircle2, RotateCcw } from 'lucide-react';
import './CompareRow.css';

interface Props {
  label: string;
  fieldKey: string;
  oldVal: string;
  newVal: string;
  approvedVal?: string;
  onApprove: (field: string, val: string) => void;
}

export default function CompareRow({ label, fieldKey, oldVal, newVal, approvedVal, onApprove }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(approvedVal || newVal);

  const isLeftSelected = approvedVal === oldVal;
  const isRightSelected = approvedVal !== oldVal;
  const rightBoxText = isRightSelected && approvedVal !== undefined ? approvedVal : newVal;
  const isManualEdit = isRightSelected && approvedVal !== undefined && approvedVal !== newVal;

  const handleSaveEdit = () => {
    onApprove(fieldKey, editValue);
    setIsEditing(false);
  };

  return (
    <tr className="compare-row">
      <td className="cr-label">{label}</td>
      
      <td className="cr-cell">
        <div className={`cr-box ${isLeftSelected ? 'selected' : ''}`}>
          <div className="cr-box-header">
            <span className="cr-box-title">
              {isLeftSelected && <CheckCircle2 size={14} className="icon-success" />}
              ORIGINALE ZUCCHETTI
            </span>
            {!isLeftSelected && (
              <button className="cr-btn-small" onClick={() => onApprove(fieldKey, oldVal)}>
                Scegli Originale
              </button>
            )}
          </div>
          <p className="cr-text">{oldVal || '-'}</p>
          {oldVal && (
            <button className="cr-btn-text">
              <Eye size={14} /> Apri Anteprima
            </button>
          )}
        </div>
      </td>

      <td className="cr-cell">
        <div className={`cr-box ai-box ${isRightSelected ? 'selected' : ''}`}>
          <div className="cr-box-header">
            <span className={`cr-box-title ${isManualEdit ? 'manual' : 'ai'}`}>
              <CheckCircle2 size={14} className="icon-success" />
              {isManualEdit ? 'MODIFICATO MANUALMENTE' : 'GENERATO DA IA'}
            </span>
            <button className="cr-btn-link" onClick={() => setIsEditing(!isEditing)}>
              Modifica Manuale
            </button>
          </div>

          {isEditing ? (
            <div className="cr-edit-area">
              <textarea 
                value={editValue} 
                onChange={e => setEditValue(e.target.value)}
                rows={3}
                className="cr-textarea"
              />
              <div className="cr-edit-actions">
                <button className="cr-btn-small cancel" onClick={() => setIsEditing(false)}>Annulla</button>
                <button className="cr-btn-small save" onClick={handleSaveEdit}>Salva</button>
              </div>
            </div>
          ) : (
            <>
              <p className="cr-text">{rightBoxText || '-'}</p>
              {fieldKey === 'technicalB2BTitle' && (
                <div className="cr-char-count">Caratteri: {rightBoxText?.length || 0} / 40</div>
              )}
              
              <div className="cr-box-footer">
                <button className="cr-btn-text">
                  <Eye size={14} /> Apri Anteprima
                </button>
                <div className="cr-footer-right">
                  <button className="cr-btn-regen">
                    <RotateCcw size={14} /> Rigenera con AI
                  </button>
                  {isManualEdit && (
                    <button className="cr-btn-link cancel" onClick={() => onApprove(fieldKey, newVal)}>
                      Annulla Modifiche e Ripristina IA Originale
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
