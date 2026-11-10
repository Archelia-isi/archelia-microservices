'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateZucchettiDocRefAction } from '@/app/actions/orders';

export default function ZucchettiDocRefEditor({
  orderId,
  docType,
  currentRef,
  dateFormatted,
  canEdit,
}: {
  orderId: string;
  docType: string;
  currentRef: string;
  dateFormatted: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [displayRef, setDisplayRef] = useState(currentRef);

  const handleSave = async () => {
    if (!inputVal.trim()) return;
    setSaving(true);
    try {
      const res = await updateZucchettiDocRefAction(orderId, docType, inputVal.trim());
      if (res.success && res.formattedRef) {
        setDisplayRef(res.formattedRef);
        setIsEditing(false);
        setInputVal('');
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between w-full gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-sm text-gray-900">
          Riferimento in fattura: <span className="font-mono">{docType} n. {displayRef} {dateFormatted}</span>
        </span>

        {canEdit && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            title="Imposta numero documento Zucchetti (es. 13/OIC o 63/ST)"
            className="text-xs text-gray-500 hover:text-gray-900 bg-white/80 hover:bg-white border border-gray-300 px-2 py-0.5 rounded transition-colors"
          >
            Modifica n.
          </button>
        )}

        {canEdit && isEditing && (
          <div className="flex items-center gap-1.5 bg-white p-1 rounded border border-gray-300 shadow-sm">
            <input
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder={docType === 'ORDIC' ? 'es. 13/OIC' : 'es. 63/ST'}
              className="text-xs px-2 py-1 border border-gray-200 rounded outline-none focus:border-brand-main w-28 font-mono"
            />
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !inputVal.trim()}
              className="text-xs font-bold bg-brand-main text-white px-2 py-1 rounded hover:bg-brand-hover disabled:opacity-50"
            >
              {saving ? '...' : 'Salva'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setInputVal('');
              }}
              className="text-xs text-gray-500 hover:text-gray-700 px-1 py-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
