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

      const baseVolume = this.getVolume() * volumeMod * 0.1; // 0.1 is base multiplier to not blow out ears
      
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

  // Suono per click leggeri (tab, bottoni)
  playClick() {
    if (!useSettingsStore.getState().soundClicksEnabled) return;
    this.playTone(600, 'sine', 0.05, 0.5);
  }

  // Suono per toggle/switch abilitati
  playToggleOn() {
    if (!this.canPlay() || !useSettingsStore.getState().soundClicksEnabled) return;
    this.playTone(400, 'sine', 0.05, 0.4);
    setTimeout(() => this.playTone(600, 'sine', 0.1, 0.5), 50);
  }

  // Suono per toggle/switch disabilitati
  playToggleOff() {
    if (!this.canPlay() || !useSettingsStore.getState().soundClicksEnabled) return;
    this.playTone(300, 'sine', 0.1, 0.4);
  }

  // Suono per apertura app/finestre
  playOpenApp() {
    if (!this.canPlay() || !useSettingsStore.getState().soundWindowsEnabled) return;
    this.playTone(523.25, 'sine', 0.1, 0.3); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.2, 0.3), 50); // E5
  }

  // Suono per chiusura app/finestre
  playCloseApp() {
    if (!useSettingsStore.getState().soundWindowsEnabled) return;
    this.playTone(300, 'sine', 0.15, 0.3);
  }

  // Suono per notifiche o popup importanti
  playNotification() {
    if (!this.canPlay() || !useSettingsStore.getState().soundNotificationsEnabled) return;
    this.playTone(880, 'sine', 0.1, 0.4); // A5
    setTimeout(() => this.playTone(1108.73, 'sine', 0.3, 0.4), 100); // C#6
  }

  // Suono per avvisi/errori
  playError() {
    if (!this.canPlay() || !useSettingsStore.getState().soundErrorsEnabled) return;
    this.playTone(150, 'sawtooth', 0.1, 0.3);
    setTimeout(() => this.playTone(150, 'sawtooth', 0.2, 0.3), 120);
  }
}

export const soundEngine = new SoundEngine();
