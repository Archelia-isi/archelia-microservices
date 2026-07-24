import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  inc: () => set((state) => ({ count: state.count + 1 })),
}));

try {
  useStore.subscribe((state, prevState) => {
    console.log("State:", state.count, "Prev:", prevState ? prevState.count : "UNDEFINED");
    if (state.count !== (prevState ? prevState.count : -1)) {
       console.log("Trigger save!");
    }
  });
  useStore.getState().inc();
} catch(e) {
  console.error("ERROR:", e.message);
}
