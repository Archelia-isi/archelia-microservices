import { create } from 'zustand';
import React from 'react';

export interface WindowApp {
  id: string;
  title: string;
  component: React.ReactNode;
  icon: React.ReactNode;
  isOpen: boolean;
  isPinned: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  width: number | string;
  height: number | string;
  zIndex: number;
  color: string;
}

interface WindowState {
  windows: Record<string, WindowApp>;
  activeWindowId: string | null;
  wallpaper: string;
  registerApp: (app: Omit<WindowApp, 'isOpen' | 'isPinned' | 'isMinimized' | 'isMaximized' | 'zIndex'>) => void;
  openWindow: (id: string) => void;
  togglePinApp: (id: string) => void;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximize: (id: string) => void;
  focusWindow: (id: string) => void;
  updatePosition: (id: string, x: number, y: number) => void;
  updateSize: (id: string, width: number | string, height: number | string) => void;
  setWallpaper: (url: string) => void;
}

let highestZIndex = 100;

export const useWindowStore = create<WindowState>((set) => ({
  windows: {},
  activeWindowId: null,
  wallpaper: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2940&auto=format&fit=crop', // Apple style abstract default
  
  registerApp: (app) => set((state) => ({
    windows: {
      ...state.windows,
      [app.id]: {
        ...app,
        isOpen: false,
        isPinned: true, // Di default le app principali sono pinnate
        isMinimized: false,
        isMaximized: true,
        zIndex: 0,
      }
    }
  })),

  openWindow: (id) => set((state) => {
    const win = state.windows[id];
    if (!win) return state;
    highestZIndex++;
    return {
      windows: {
        ...state.windows,
        [id]: {
          ...win,
          isOpen: true,
          isMinimized: false,
          zIndex: highestZIndex
        }
      },
      activeWindowId: id
    };
  }),

  closeWindow: (id) => set((state) => {
    const win = state.windows[id];
    if (!win) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, isOpen: false, isMinimized: false, isMaximized: false }
      },
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
    };
  }),

  togglePinApp: (id) => set((state) => {
    const win = state.windows[id];
    if (!win) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, isPinned: !win.isPinned }
      }
    };
  }),

  minimizeWindow: (id) => set((state) => {
    const win = state.windows[id];
    if (!win) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, isMinimized: true }
      },
      activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
    };
  }),

  toggleMaximize: (id) => set((state) => {
    const win = state.windows[id];
    if (!win) return state;
    highestZIndex++;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, isMaximized: !win.isMaximized, zIndex: highestZIndex }
      },
      activeWindowId: id
    };
  }),

  focusWindow: (id) => set((state) => {
    const win = state.windows[id];
    if (!win || state.activeWindowId === id) return state;
    highestZIndex++;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, isMinimized: false, zIndex: highestZIndex }
      },
      activeWindowId: id
    };
  }),

  updatePosition: (id, x, y) => set((state) => {
    const win = state.windows[id];
    if (!win || win.isMaximized) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, x, y }
      }
    };
  }),

  updateSize: (id, width, height) => set((state) => {
    const win = state.windows[id];
    if (!win || win.isMaximized) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, width, height }
      }
    };
  }),

  setWallpaper: (url) => set({ wallpaper: url })
}));
