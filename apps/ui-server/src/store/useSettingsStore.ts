import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'auto';
export type TaskbarPosition = 'bottom' | 'top' | 'left' | 'right';

export interface OSSettingsState {
  theme: Theme;
  accentColor: string;
  glassIntensity: number; // 10 to 60
  taskbarPosition: TaskbarPosition;
  taskbarAutoHide: boolean;
  animationsEnabled: boolean;
  focusMode: boolean;
  autoLockMinutes: number; // 0 = never
  systemVolume: number; // 0-100
  systemSoundsEnabled: boolean;

  setTheme: (theme: Theme) => void;
  setAccentColor: (color: string) => void;
  setGlassIntensity: (intensity: number) => void;
  setTaskbarPosition: (position: TaskbarPosition) => void;
  setTaskbarAutoHide: (autoHide: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setFocusMode: (enabled: boolean) => void;
  setAutoLockMinutes: (minutes: number) => void;
  setSystemVolume: (volume: number) => void;
  setSystemSoundsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<OSSettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      accentColor: '#0ea5e9', // Default primary
      glassIntensity: 40,
      taskbarPosition: 'bottom',
      taskbarAutoHide: false,
      animationsEnabled: true,
      focusMode: false,
      autoLockMinutes: 15,
      systemVolume: 80,
      systemSoundsEnabled: true,

      setTheme: (theme) => set({ theme }),
      setAccentColor: (accentColor) => set({ accentColor }),
      setGlassIntensity: (glassIntensity) => set({ glassIntensity }),
      setTaskbarPosition: (taskbarPosition) => set({ taskbarPosition }),
      setTaskbarAutoHide: (taskbarAutoHide) => set({ taskbarAutoHide }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setFocusMode: (focusMode) => set({ focusMode }),
      setAutoLockMinutes: (autoLockMinutes) => set({ autoLockMinutes }),
      setSystemVolume: (systemVolume) => set({ systemVolume }),
      setSystemSoundsEnabled: (systemSoundsEnabled) => set({ systemSoundsEnabled }),
    }),
    {
      name: 'archelia-os-settings',
    }
  )
);
