'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { endOrderReviewSession } from '@/app/actions/agent';

export default function ReviewSessionCleanup({
  hasActiveReview,
  impersonatedClientCode,
  impersonatedClientName,
}: {
  hasActiveReview: boolean;
  impersonatedClientCode?: string;
  impersonatedClientName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const cleaningRef = useRef(false);
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDismissed(false);
  }, [impersonatedClientCode, impersonatedClientName]);

  const isLeavingReview = hasActiveReview && pathname !== '/cart';

  useEffect(() => {
    if (!isLeavingReview) {
      cleaningRef.current = false;
      return;
    }
    if (cleaningRef.current) return;
    cleaningRef.current = true;

    endOrderReviewSession().then(() => {
      router.refresh();
    });
  }, [isLeavingReview, pathname, router]);

  const handleExitImpersonation = () => {
    setDismissed(true);
    startTransition(async () => {
      const res = await endOrderReviewSession();
      if (hasActiveReview && pathname === '/cart') {
        router.push(res.returnUrl || '/account/agent-orders');
      }
      router.refresh();
    });
  };

  if (!impersonatedClientCode || isLeavingReview || dismissed) {
    return null;
  }

  return (
    <div className="w-full bg-brand-main text-black border-t border-black/10 shadow-md">
      <div className="w-full max-w-7xl mx-auto px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-black">
          <svg className="w-4 h-4 shrink-0 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>
            Stai impersonificando il cliente:{' '}
            <strong className="font-extrabold uppercase tracking-wide">
              {impersonatedClientName || impersonatedClientCode}
            </strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleExitImpersonation}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-black text-white hover:bg-gray-800 text-xs font-bold transition-colors shrink-0 disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {isPending ? 'Uscita...' : "Esci dall'impersonificazione"}
        </button>
      </div>
    </div>
  );
}
