'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateZucchettiDocRefAction } from '@/app/actions/orders';

export default function ZucchettiDocRefEditor({
  orderId,
  docType,
  currentRef,
  canEdit,
}: {
  orderId: string;
  docType: string;
  currentRef: string;
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
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs sm:text-sm font-bold text-gray-900 bg-white px-2.5 py-1 rounded border border-gray-300 shadow-sm">
        {displayRef}
      </span>

      {canEdit && !isEditing && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-300 px-2.5 py-1 rounded transition-colors"
        >
          Imposta N. Fattura/Ordine (es. 120/ST)
        </button>
      )}

      {canEdit && isEditing && (
        <div className="flex items-center gap-1.5 bg-white p-1 rounded border border-gray-300 shadow-sm">
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="es. 120/ST"
            className="text-xs px-2 py-1 border border-gray-200 rounded outline-none focus:border-brand-main w-32 font-mono"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !inputVal.trim()}
            className="text-xs font-bold bg-brand-main text-white px-2.5 py-1 rounded hover:bg-brand-hover disabled:opacity-50"
          >
            {saving ? '...' : 'Salva'}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setInputVal('');
            }}
            className="text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1"
          >
            Annulla
          </button>
        </div>
      )}
    </div>
  );
}
