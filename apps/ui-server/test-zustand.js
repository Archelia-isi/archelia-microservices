const { createStore } = require('zustand/vanilla');

const store = createStore((set) => ({
  count: 0,
  inc: () => set((state) => ({ count: state.count + 1 })),
}));

try {
  store.subscribe((state, prevState) => {
    console.log("State:", state.count, "Prev:", prevState ? prevState.count : "UNDEFINED");
    if (state.count !== prevState.count) {
       console.log("Trigger save!");
    }
  });
  store.getState().inc();
} catch(e) {
  console.error("ERROR:", e.message);
}
