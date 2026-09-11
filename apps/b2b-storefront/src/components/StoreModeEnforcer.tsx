'use client';

import { useEffect } from 'react';
import { setStoreMode } from '../app/actions/storeMode';

export default function StoreModeEnforcer({ expectedMode, currentMode }: { expectedMode: 'ELMARK' | 'ZUCCHETTI', currentMode: 'ELMARK' | 'ZUCCHETTI' }) {
  useEffect(() => {
    if (expectedMode !== currentMode) {
      // Mismatch detected (usually due to browser back navigation).
      // We fix the cookie and force a hard reload to clean the layout.
      setStoreMode(expectedMode).then(() => {
        window.location.reload();
      });
    }
  }, [expectedMode, currentMode]);

  return null;
}
