// High-fidelity Audio Engine for Wuthering Waves Convene replica
// Supports background menu BGM (wuwamenu.mp3), summon cutscene audio controls,
// rarity chord stingers, and configurable Master/Music/Summon volume sliders.

export interface AudioSettings {
  masterVolume: number; // 0.0 - 1.0
  musicVolume: number;  // 0.0 - 1.0
  summonVolume: number; // 0.0 - 1.0
}

const STORAGE_KEY = "wuwa_audio_settings_v1";

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.8,
  musicVolume: 0.6,
  summonVolume: 0.9,
};

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private bgmAudio: HTMLAudioElement | null = null;
  private settings: AudioSettings = { ...DEFAULT_SETTINGS };
  private isBgmPlaying: boolean = false;
  private isBgmDucked: boolean = false;
  private listeners: Set<(settings: AudioSettings) => void> = new Set();

  constructor() {
    this.loadSettings();
    if (typeof window !== "undefined") {
      this.initBgmAudio();
    }
  }

  private loadSettings() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = {
          masterVolume: typeof parsed.masterVolume === "number" ? parsed.masterVolume : DEFAULT_SETTINGS.masterVolume,
          musicVolume: typeof parsed.musicVolume === "number" ? parsed.musicVolume : DEFAULT_SETTINGS.musicVolume,
          summonVolume: typeof parsed.summonVolume === "number" ? parsed.summonVolume : DEFAULT_SETTINGS.summonVolume,
        };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage write errors
    }
  }

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.updateSfxGain();
        this.sfxGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  private initBgmAudio() {
    if (this.bgmAudio) return;
    this.bgmAudio = new Audio("/assets/audio/wuwamenu.mp3");
    this.bgmAudio.loop = true;
    this.bgmAudio.preload = "auto";
    this.updateBgmVolume();
  }

  private updateBgmVolume() {
    if (!this.bgmAudio) return;
    const effectiveVol = this.isBgmDucked ? 0 : this.getEffectiveMusicVolume();
    this.bgmAudio.volume = Math.max(0, Math.min(1, effectiveVol));
  }

  private updateSfxGain() {
    if (this.ctx && this.sfxGain) {
      const effectiveVol = this.getEffectiveSummonVolume();
      this.sfxGain.gain.setValueAtTime(effectiveVol * 0.75, this.ctx.currentTime);
    }
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener({ ...this.settings }));
  }

  // Volume getters
  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public getMasterVolume(): number {
    return this.settings.masterVolume;
  }

  public getMusicVolume(): number {
    return this.settings.musicVolume;
  }

  public getSummonVolume(): number {
    return this.settings.summonVolume;
  }

  public getEffectiveMusicVolume(): number {
    return this.settings.masterVolume * this.settings.musicVolume;
  }

  public getEffectiveSummonVolume(): number {
    return this.settings.masterVolume * this.settings.summonVolume;
  }

  // Volume setters
  public setMasterVolume(vol: number) {
    this.settings.masterVolume = Math.max(0, Math.min(1, vol));
    this.updateBgmVolume();
    this.updateSfxGain();
    this.saveSettings();
    this.notifyListeners();
  }

  public setMusicVolume(vol: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, vol));
    this.updateBgmVolume();
    this.saveSettings();
    this.notifyListeners();
  }

  public setSummonVolume(vol: number) {
    this.settings.summonVolume = Math.max(0, Math.min(1, vol));
    this.updateSfxGain();
    this.saveSettings();
    this.notifyListeners();
  }

  public subscribe(listener: (settings: AudioSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Legacy compat
  public setMuted(muted: boolean) {
    this.setMasterVolume(muted ? 0 : 0.8);
  }

  public getIsMuted(): boolean {
    return this.settings.masterVolume === 0;
  }

  // =========================================================================
  // BACKGROUND MUSIC (wuwamenu.mp3)
  // =========================================================================
  public startBGM() {
    if (typeof window === "undefined") return;
    this.initBgmAudio();
    if (!this.bgmAudio) return;

    this.isBgmDucked = false;
    this.updateBgmVolume();

    const playPromise = this.bgmAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isBgmPlaying = true;
        })
        .catch(() => {
          // Autoplay policy prevented immediate playback; resume on first user interaction
          const unlock = () => {
            if (this.bgmAudio && !this.isBgmDucked) {
              this.bgmAudio.play().then(() => {
                this.isBgmPlaying = true;
              }).catch(() => {});
            }
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
          };
          window.addEventListener("pointerdown", unlock, { once: true });
          window.addEventListener("keydown", unlock, { once: true });
        });
    }
  }

  public pauseBGM() {
    this.isBgmDucked = true;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }
  }

  public resumeBGM() {
    this.isBgmDucked = false;
    this.updateBgmVolume();
    if (this.bgmAudio && this.bgmAudio.paused) {
      this.bgmAudio.play().catch(() => {});
    }
  }

  public getIsBgmPlaying(): boolean {
    return this.isBgmPlaying;
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    this.isBgmDucked = false;
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
    }
  }

  // NO UI CLICK SOUNDS
  public playClick() {
    // No-op
  }

  public playTabSwitch() {
    // No-op
  }

  // =========================================================================
  // SUMMON REVEAL CHORD STINGERS
  // =========================================================================

  public playBlueStinger() {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const freqs = [587.33, 880.0, 1174.66];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);

      gain.gain.setValueAtTime(0.15, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.6);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.6);
    });
  }

  public playPurpleStinger() {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(196.0, now);
    subOsc.frequency.exponentialRampToValueAtTime(110.0, now + 0.8);
    subGain.gain.setValueAtTime(0.35, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.8);

    const freqs = [311.13, 466.16, 783.99, 1046.5];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.22, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 1.2);
    });
  }

  public playGoldStinger() {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = "triangle";
    boomOsc.frequency.setValueAtTime(146.83, now);
    boomOsc.frequency.exponentialRampToValueAtTime(32.7, now + 1.8);
    boomGain.gain.setValueAtTime(0.65, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    boomOsc.connect(boomGain);
    boomGain.connect(this.sfxGain);
    boomOsc.start(now);
    boomOsc.stop(now + 1.8);

    const freqs = [293.66, 440.0, 587.33, 739.99, 880.0, 1174.66, 1479.98];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.28, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 2.4);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 2.4);
    });
  }

  public playCardReveal(rarity: number) {
    if (rarity === 5) {
      this.playGoldStinger();
    } else if (rarity === 4) {
      this.playPurpleStinger();
    } else {
      this.playBlueStinger();
    }
  }
}

export const soundEngine = new SoundEngine();
