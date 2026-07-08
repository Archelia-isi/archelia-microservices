import { create } from 'zustand';

export interface DesktopWidget {
  id: string;
  type: 'clock' | 'weather' | 'kpi';
  x: number;
  y: number;
}

interface WidgetState {
  widgets: DesktopWidget[];
  addWidget: (type: DesktopWidget['type'], x: number, y: number) => void;
  removeWidget: (id: string) => void;
  updateWidgetPosition: (id: string, x: number, y: number) => void;
}

export const useWidgetStore = create<WidgetState>((set) => ({
  widgets: [{ id: 'default-clock', type: 'clock', x: window.innerWidth > 800 ? window.innerWidth - 450 : 50, y: 50 }],
  addWidget: (type, x, y) => set((state) => ({
    widgets: [...state.widgets, { id: `widget-${Date.now()}`, type, x, y }]
  })),
  removeWidget: (id) => set((state) => ({
    widgets: state.widgets.filter(w => w.id !== id)
  })),
  updateWidgetPosition: (id, x, y) => set((state) => ({
    widgets: state.widgets.map(w => w.id === id ? { ...w, x, y } : w)
  }))
}));
