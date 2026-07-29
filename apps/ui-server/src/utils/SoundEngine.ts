import { useSettingsStore } from '../store/useSettingsStore';

class SoundEngine {
  private audioCtx: AudioContext | null = null;

  private getContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private canPlay(): boolean {
    const { systemSoundsEnabled, systemVolume } = useSettingsStore.getState();
    return systemSoundsEnabled && systemVolume > 0;
  }

  private getVolume(): number {
    return useSettingsStore.getState().systemVolume / 100;
  }

  private playTone(frequency: number, type: OscillatorType, duration: number, volumeMod: number = 1, fadeOut: boolean = true) {
    if (!this.canPlay()) return;

    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);

      const baseVolume = this.getVolume() * volumeMod * 0.1;
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(baseVolume, ctx.currentTime + 0.01);
      
      if (fadeOut) {
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      } else {
        gainNode.gain.setValueAtTime(baseVolume, ctx.currentTime + duration - 0.01);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      }

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('AudioContext playback failed', e);
    }
  }

  private getTheme() {
    return useSettingsStore.getState().theme;
  }

  // Suono per click leggeri (tab, bottoni)
  playClick() {
    if (!useSettingsStore.getState().soundClicksEnabled) return;
    const theme = this.getTheme();
    
    switch(theme) {
      case 'retro': return this.playTone(800, 'square', 0.05, 0.3);
      case 'panic': return this.playTone(300, 'sawtooth', 0.05, 0.4);
      case 'zen': return this.playTone(400, 'sine', 0.2, 0.2, true);
      case 'matrix': return this.playTone(1200, 'square', 0.02, 0.1);
      case 'kawaii': return this.playTone(800, 'sine', 0.1, 0.3);
      case 'cartoon': return this.playTone(500, 'triangle', 0.1, 0.4);
      case 'neon': return this.playTone(200, 'sawtooth', 0.1, 0.3);
      default: return this.playTone(600, 'sine', 0.05, 0.5);
    }
  }

  // Suono per toggle/switch abilitati
  playToggleOn() {
    if (!this.canPlay() || !useSettingsStore.getState().soundClicksEnabled) return;
    const theme = this.getTheme();
    
    switch(theme) {
      case 'retro': 
        this.playTone(600, 'square', 0.05, 0.3);
        setTimeout(() => this.playTone(800, 'square', 0.05, 0.3), 50);
        break;
      case 'kawaii':
        this.playTone(700, 'sine', 0.1, 0.3);
        setTimeout(() => this.playTone(1000, 'sine', 0.15, 0.3), 80);
        break;
      case 'matrix':
        this.playTone(1500, 'square', 0.03, 0.1);
        setTimeout(() => this.playTone(1600, 'square', 0.03, 0.1), 40);
        break;
      default:
        this.playTone(400, 'sine', 0.05, 0.4);
        setTimeout(() => this.playTone(600, 'sine', 0.1, 0.5), 50);
    }
  }

  // Suono per toggle/switch disabilitati
  playToggleOff() {
    if (!this.canPlay() || !useSettingsStore.getState().soundClicksEnabled) return;
    const theme = this.getTheme();

    switch(theme) {
      case 'retro': return this.playTone(400, 'square', 0.05, 0.3);
      case 'kawaii':
        this.playTone(1000, 'sine', 0.1, 0.3);
        setTimeout(() => this.playTone(700, 'sine', 0.15, 0.3), 80);
        break;
      case 'matrix': return this.playTone(800, 'square', 0.03, 0.1);
      default: return this.playTone(300, 'sine', 0.1, 0.4);
    }
  }

  // Suono per apertura app/finestre
  playOpenApp() {
    if (!this.canPlay() || !useSettingsStore.getState().soundWindowsEnabled) return;
    const theme = this.getTheme();

    switch(theme) {
      case 'retro':
        this.playTone(400, 'square', 0.1, 0.3); 
        setTimeout(() => this.playTone(600, 'square', 0.15, 0.3), 100);
        break;
      case 'panic':
        this.playTone(200, 'sawtooth', 0.1, 0.4);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.2, 0.4), 50);
        break;
      case 'zen':
        this.playTone(300, 'sine', 0.5, 0.2, true);
        setTimeout(() => this.playTone(450, 'sine', 0.8, 0.2, true), 100);
        break;
      case 'matrix':
        this.playTone(1500, 'square', 0.03, 0.1);
        setTimeout(() => this.playTone(1800, 'square', 0.05, 0.1), 30);
        break;
      case 'kawaii':
        this.playTone(800, 'sine', 0.1, 0.2);
        setTimeout(() => this.playTone(1000, 'sine', 0.1, 0.2), 100);
        setTimeout(() => this.playTone(1200, 'sine', 0.2, 0.2), 200);
        break;
      case 'cartoon':
        this.playTone(400, 'triangle', 0.1, 0.4);
        setTimeout(() => this.playTone(800, 'triangle', 0.15, 0.4), 100);
        break;
      case 'neon':
        this.playTone(300, 'sawtooth', 0.1, 0.2);
        setTimeout(() => this.playTone(400, 'square', 0.2, 0.15), 100);
        break;
      default:
        this.playTone(523.25, 'sine', 0.1, 0.3); // C5
        setTimeout(() => this.playTone(659.25, 'sine', 0.2, 0.3), 50); // E5
    }
  }

  // Suono per chiusura app/finestre
  playCloseApp() {
    if (!this.canPlay() || !useSettingsStore.getState().soundWindowsEnabled) return;
    const theme = this.getTheme();

    switch(theme) {
      case 'retro': return this.playTone(200, 'square', 0.15, 0.3);
      case 'panic': return this.playTone(100, 'sawtooth', 0.2, 0.4);
      case 'zen': return this.playTone(200, 'sine', 0.6, 0.2, true);
      case 'matrix': return this.playTone(800, 'square', 0.05, 0.1);
      case 'kawaii': 
        this.playTone(900, 'sine', 0.1, 0.2);
        setTimeout(() => this.playTone(700, 'sine', 0.2, 0.2), 100);
        break;
      case 'cartoon':
        this.playTone(600, 'triangle', 0.1, 0.4);
        setTimeout(() => this.playTone(300, 'triangle', 0.15, 0.4), 100);
        break;
      case 'neon': return this.playTone(150, 'sawtooth', 0.2, 0.3);
      default: return this.playTone(300, 'sine', 0.15, 0.3);
    }
  }

  // Suono per notifiche o popup importanti
  playNotification() {
    if (!this.canPlay() || !useSettingsStore.getState().soundNotificationsEnabled) return;
    const theme = this.getTheme();

    switch(theme) {
      case 'retro':
        this.playTone(600, 'square', 0.1, 0.3);
        setTimeout(() => this.playTone(800, 'square', 0.2, 0.3), 100);
        break;
      case 'panic':
        this.playTone(800, 'sawtooth', 0.1, 0.4);
        setTimeout(() => this.playTone(900, 'sawtooth', 0.1, 0.4), 50);
        setTimeout(() => this.playTone(1000, 'sawtooth', 0.2, 0.4), 100);
        break;
      case 'zen':
        this.playTone(500, 'sine', 0.8, 0.3, true);
        setTimeout(() => this.playTone(600, 'sine', 1.0, 0.2, true), 200);
        break;
      case 'matrix':
        this.playTone(2000, 'square', 0.05, 0.1);
        setTimeout(() => this.playTone(2000, 'square', 0.05, 0.1), 100);
        break;
      case 'kawaii':
        this.playTone(1000, 'sine', 0.1, 0.3);
        setTimeout(() => this.playTone(1200, 'sine', 0.1, 0.3), 100);
        setTimeout(() => this.playTone(1500, 'sine', 0.3, 0.3), 200);
        break;
      case 'cartoon':
        this.playTone(800, 'triangle', 0.1, 0.4);
        setTimeout(() => this.playTone(1200, 'triangle', 0.2, 0.4), 100);
        break;
      case 'neon':
        this.playTone(600, 'square', 0.1, 0.2);
        setTimeout(() => this.playTone(800, 'square', 0.3, 0.2), 100);
        break;
      default:
        this.playTone(880, 'sine', 0.1, 0.4); // A5
        setTimeout(() => this.playTone(1108.73, 'sine', 0.3, 0.4), 100); // C#6
    }
  }

  // Suono per avvisi/errori
  playError() {
    if (!this.canPlay() || !useSettingsStore.getState().soundErrorsEnabled) return;
    const theme = this.getTheme();

    switch(theme) {
      case 'retro':
        this.playTone(150, 'square', 0.2, 0.3);
        setTimeout(() => this.playTone(100, 'square', 0.3, 0.3), 150);
        break;
      case 'panic':
        this.playTone(80, 'sawtooth', 0.3, 0.5);
        setTimeout(() => this.playTone(70, 'sawtooth', 0.4, 0.5), 200);
        break;
      case 'zen':
        this.playTone(200, 'sine', 0.5, 0.3, true);
        break;
      case 'matrix':
        this.playTone(1000, 'square', 0.1, 0.2);
        setTimeout(() => this.playTone(800, 'square', 0.1, 0.2), 100);
        break;
      case 'kawaii':
        this.playTone(500, 'sine', 0.2, 0.3);
        setTimeout(() => this.playTone(400, 'sine', 0.3, 0.3), 150);
        break;
      case 'cartoon':
        this.playTone(300, 'triangle', 0.1, 0.4);
        setTimeout(() => this.playTone(250, 'triangle', 0.1, 0.4), 100);
        setTimeout(() => this.playTone(200, 'triangle', 0.2, 0.4), 200);
        break;
      case 'neon':
        this.playTone(150, 'sawtooth', 0.3, 0.4);
        break;
      default:
        this.playTone(150, 'sawtooth', 0.1, 0.3);
        setTimeout(() => this.playTone(150, 'sawtooth', 0.2, 0.3), 120);
    }
  }
}

export const soundEngine = new SoundEngine();
