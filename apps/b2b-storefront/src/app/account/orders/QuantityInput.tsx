'use client';

import { useState, useEffect, useRef } from 'react';

export default function QuantityInput({ 
  initialQuantity, 
  maxStock,
  onUpdate 
}: { 
  initialQuantity: number, 
  maxStock?: number,
  onUpdate: (qty: number) => void 
}) {
  const [value, setValue] = useState(String(initialQuantity));
  const [stockWarning, setStockWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerStockWarning = (msg: string) => {
    setStockWarning(msg);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    warningTimerRef.current = setTimeout(() => {
      setStockWarning(null);
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setValue(String(initialQuantity));
  }, [initialQuantity]);

  const parsedQty = parseInt(value, 10);
  const isOverStock = maxStock !== undefined && !isNaN(parsedQty) && parsedQty > maxStock;

  const commitChange = (valStr: string) => {
    let qty = parseInt(valStr, 10);
    if (isNaN(qty) || qty < 1) {
      qty = 1;
      setValue('1');
    }
    if (maxStock !== undefined && qty > maxStock) {
      triggerStockWarning(
        maxStock <= 0
          ? 'Giacenza superata (0 pz disp.)'
          : `Giacenza superata (max ${maxStock} pz)`
      );
      return;
    }
    if (qty !== initialQuantity) {
      onUpdate(qty);
    } else {
      setValue(String(initialQuantity));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value;
    setValue(valStr);
    const p = parseInt(valStr, 10);
    if (maxStock !== undefined && !isNaN(p) && p > maxStock) {
      triggerStockWarning(
        maxStock <= 0
          ? 'Giacenza superata (0 pz disp.)'
          : `Giacenza superata (max ${maxStock} pz)`
      );
    } else {
      setStockWarning(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center border rounded overflow-hidden transition-colors ${isOverStock ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}>
        <button 
          type="button"
          onClick={() => {
            const v = Math.max(1, (parseInt(value) || 1) - 1);
            setValue(String(v));
            if (maxStock === undefined || v <= maxStock) {
              setStockWarning(null);
              commitChange(String(v));
            }
          }}
          className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border-r border-gray-300 transition-colors"
        >
          -
        </button>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          onBlur={(e) => commitChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          className={`w-16 py-1 text-center font-bold outline-none appearance-none transition-colors ${
            isOverStock
              ? 'text-red-600 bg-red-50 focus:ring-inset focus:ring-1 focus:ring-red-500'
              : 'text-gray-900 bg-white focus:bg-blue-50 focus:ring-inset focus:ring-1 focus:ring-brand-main'
          }`}
          min="1"
        />
        <button 
          type="button"
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
      {stockWarning && (
        <span className="text-[10px] leading-tight font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded text-center animate-pulse">
          {stockWarning}
        </span>
      )}
    </div>
  );
}
