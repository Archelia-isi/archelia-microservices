'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { endOrderReviewSession } from '@/app/actions/agent';

export default function ReviewSessionCleanup({ hasActiveReview }: { hasActiveReview: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!hasActiveReview) return;
    endOrderReviewSession().then(() => {
      router.refresh();
    });
  }, [hasActiveReview, router]);

  return null;
}
