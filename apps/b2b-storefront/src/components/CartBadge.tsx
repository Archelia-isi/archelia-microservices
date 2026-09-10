'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CartBadge({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const handleCartUpdate = (event: any) => {
      if (event.detail && typeof event.detail.count === 'number') {
        setCount(event.detail.count);
      } else {
        // Fallback or optimistic increment
        setCount((prev) => prev + 1);
      }
    };

    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  return (
    <Link prefetch={true} href="/cart" className="hover:text-green-400 transition-colors flex items-center gap-2">
      Carrello
      {count > 0 && (
        <span className="bg-[#00C800] text-black text-xs font-bold px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </Link>
  );
}
