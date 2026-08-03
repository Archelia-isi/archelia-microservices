import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StoreType = 'RETAIL' | 'B2B';

interface StoreContextState {
  currentStore: StoreType;
  setStore: (store: StoreType) => void;
}

export const useStoreContext = create<StoreContextState>()(
  persist(
    (set) => ({
      currentStore: 'RETAIL',
      setStore: (store) => set({ currentStore: store }),
    }),
    {
      name: 'store-context-storage',
    }
  )
);
