'use client';

import { useState, useEffect } from 'react';

export default function QuantityInput({ 
  initialQuantity, 
  onUpdate 
}: { 
  initialQuantity: number, 
  onUpdate: (qty: number) => void 
}) {
  const [value, setValue] = useState(String(initialQuantity));

  useEffect(() => {
    setValue(String(initialQuantity));
  }, [initialQuantity]);

  const commitChange = (valStr: string) => {
    let qty = parseInt(valStr, 10);
    if (isNaN(qty) || qty < 1) {
      qty = 1;
      setValue('1');
    }
    if (qty !== initialQuantity) {
      onUpdate(qty);
    } else {
      setValue(String(initialQuantity));
    }
  };

  return (
    <div className="flex items-center border border-gray-300 rounded overflow-hidden">
      <button 
        onClick={() => {
          const v = Math.max(1, parseInt(value) - 1);
          setValue(String(v));
          commitChange(String(v));
        }}
        className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border-r border-gray-300 transition-colors"
      >
        -
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => commitChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="w-16 py-1 text-center font-bold outline-none focus:bg-blue-50 focus:ring-inset focus:ring-1 focus:ring-brand-main appearance-none"
        min="1"
      />
      <button 
        onClick={() => {
          const v = (parseInt(value) || 0) + 1;
          setValue(String(v));
          commitChange(String(v));
        }}
        className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border-l border-gray-300 transition-colors"
      >
        +
      </button>
      <style jsx>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>
    </div>
  );
}
