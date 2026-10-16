'use client';

import { useEffect } from 'react';
import { setStoreMode } from '../app/actions/storeMode';

export default function StoreModeEnforcer({ expectedMode, currentMode }: { expectedMode: 'ELMARK' | 'ZUCCHETTI', currentMode: 'ELMARK' | 'ZUCCHETTI' }) {
  useEffect(() => {
    if (expectedMode !== currentMode && typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host.includes('izzodistribuzione.it')) {
        const targetHost = expectedMode === 'ELMARK' ? 'elmark.izzodistribuzione.it' : 'www.izzodistribuzione.it';
        if (host !== targetHost) {
          window.location.replace(`https://${targetHost}${window.location.pathname}${window.location.search}`);
        }
        return;
      }

      const guardKey = `store_enforced_${window.location.pathname}_${expectedMode}`;
      if (sessionStorage.getItem(guardKey)) return;
      sessionStorage.setItem(guardKey, '1');

      setStoreMode(expectedMode).then(() => {
        window.location.reload();
      });
    }
  }, [expectedMode, currentMode]);

  return null;
}
