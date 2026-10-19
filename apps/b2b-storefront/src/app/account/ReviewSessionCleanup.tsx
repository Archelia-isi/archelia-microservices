'use client';

import { useEffect, useRef } from 'react';
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

  if (!impersonatedClientCode || isLeavingReview) {
    return null;
  }

  return (
    <div className="hidden md:flex items-center absolute left-4 top-1/2 -translate-y-1/2 gap-2 px-3 py-1.5 rounded-sm bg-brand-main text-black shadow-lg text-xs font-bold z-50">
      <span className="truncate max-w-[200px]">{impersonatedClientName}</span>
    </div>
  );
}
