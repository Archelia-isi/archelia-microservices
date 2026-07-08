import { create } from 'zustand';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface DesktopWidget {
  id: string;
  type: 'clock' | 'weather' | 'kpi';
  x: number;
  y: number;
  size: WidgetSize;
  config?: Record<string, any>;
}

interface WidgetState {
  widgets: DesktopWidget[];
  addWidget: (type: DesktopWidget['type'], x: number, y: number, size?: WidgetSize) => void;
  removeWidget: (id: string) => void;
  updateWidgetPosition: (id: string, x: number, y: number) => void;
  updateWidgetSize: (id: string, size: WidgetSize) => void;
  updateWidgetConfig: (id: string, config: Record<string, any>) => void;
}

export const useWidgetStore = create<WidgetState>((set) => ({
  widgets: [{ id: 'default-clock', type: 'clock', x: window.innerWidth > 800 ? window.innerWidth - 450 : 50, y: 50, size: 'medium' }],
  addWidget: (type, x, y, size = 'small') => set((state) => {
    if (state.widgets.some(w => w.type === type)) return state;
    return {
      widgets: [...state.widgets, { id: `widget-${Date.now()}`, type, x, y, size, config: {} }]
    };
  }),
  removeWidget: (id) => set((state) => ({
    widgets: state.widgets.filter(w => w.id !== id)
  })),
  updateWidgetPosition: (id, x, y) => set((state) => ({
    widgets: state.widgets.map(w => w.id === id ? { ...w, x, y } : w)
  })),
  updateWidgetSize: (id, size) => set((state) => ({
    widgets: state.widgets.map(w => w.id === id ? { ...w, size } : w)
  })),
  updateWidgetConfig: (id, config) => set((state) => ({
    widgets: state.widgets.map(w => w.id === id ? { ...w, config: { ...w.config, ...config } } : w)
  }))
}));
