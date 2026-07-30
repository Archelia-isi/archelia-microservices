import { create } from 'zustand';
import React from 'react';
import { soundEngine } from '../utils/SoundEngine';

export interface WindowApp {
  id: string;
  title: string;
  component: React.ReactNode;
  icon: React.ReactNode;
  iconPath?: string;
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
  desktopX?: number;
  desktopY?: number;
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
  updateDesktopPosition: (id: string, x: number, y: number) => void;
  updateSize: (id: string, width: number | string, height: number | string) => void;
  setWallpaper: (url: string) => void;
  changeAppIcon: (id: string, iconPath: string) => void;
  isChatbotOpen: boolean;
  toggleChatbot: () => void;
  editingIconAppId: string | null;
  setEditingIconAppId: (id: string | null) => void;
  toggleDesktopApp: (id: string) => void;
  isWidgetManagerOpen: boolean;
  toggleWidgetManager: () => void;
}

let highestZIndex = 100;

export const useWindowStore = create<WindowState>((set) => ({
  windows: {},
  activeWindowId: null,
  isChatbotOpen: false,
  isWidgetManagerOpen: false,
  toggleWidgetManager: () => set((state) => ({ isWidgetManagerOpen: !state.isWidgetManagerOpen })),
  editingIconAppId: null,
  setEditingIconAppId: (id) => set({ editingIconAppId: id }),
  toggleDesktopApp: (id) => set((state) => {
    const win = state.windows[id];
    if (!win) return state;
    const isCurrentlyOnDesktop = win.desktopX !== undefined && win.desktopY !== undefined;
    return {
      windows: {
        ...state.windows,
        [id]: {
          ...win,
          desktopX: isCurrentlyOnDesktop ? undefined : 20,
          desktopY: isCurrentlyOnDesktop ? undefined : 20
        }
      }
    };
  }),
  toggleChatbot: () => set((state) => ({ isChatbotOpen: !state.isChatbotOpen })),
  wallpaper: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2940&auto=format&fit=crop', // Apple style abstract default
  
  registerApp: (app) => set((state) => ({
    windows: {
      ...state.windows,
      [app.id]: {
        ...app,
        isOpen: false,
        isPinned: false, // Nessuna app è pinnata di default
        isMinimized: false,
        isMaximized: true,
        zIndex: 0,
      }
    }
  })),

  openWindow: (id) => {
    soundEngine.playOpenApp();
    set((state) => {
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
    });
  },

  closeWindow: (id) => {
    soundEngine.playCloseApp();
    set((state) => {
      const win = state.windows[id];
      if (!win) return state;
      return {
        windows: {
          ...state.windows,
          [id]: { ...win, isOpen: false, isMinimized: false }
        },
        activeWindowId: state.activeWindowId === id ? null : state.activeWindowId
      };
    });
  },

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

  updateDesktopPosition: (id, x, y) => set((state) => {
    const win = state.windows[id];
    if (!win) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, desktopX: x, desktopY: y }
      }
    };
  }),

  changeAppIcon: (id, iconPath) => set((state) => {
    const win = state.windows[id];
    if (!win) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...win, iconPath }
      }
    };
  }),

  setWallpaper: (url) => set({ wallpaper: url })
}));

