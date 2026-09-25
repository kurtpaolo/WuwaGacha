// High-fidelity Audio Engine for Wuthering Waves Convene replica
// Supports background menu BGM (anime_adventures_theme.mp3), summon cutscene audio controls,
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
  private bgmSource: MediaElementAudioSourceNode | null = null;
  private bgmGain: GainNode | null = null;
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
      this.ctx.resume().catch(() => {});
    }
  }

  private ensureContextRunning() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      this.initContext();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  private setupBgmAudioGraph() {
    if (typeof window === "undefined" || !this.bgmAudio) return;
    this.initContext();
    if (!this.ctx || this.bgmSource) return;

    try {
      this.bgmGain = this.ctx.createGain();
      const effectiveVol = this.isBgmDucked ? 0 : this.getEffectiveMusicVolume();
      this.bgmGain.gain.setValueAtTime(effectiveVol <= 0.001 ? 0 : effectiveVol, this.ctx.currentTime);

      this.bgmSource = this.ctx.createMediaElementSource(this.bgmAudio);
      this.bgmSource.connect(this.bgmGain);
      this.bgmGain.connect(this.ctx.destination);
    } catch {
      // createMediaElementSource may fail if already connected or on restricted cross-origin
    }
  }

  private initBgmAudio() {
    if (this.bgmAudio) return;
    this.bgmAudio = new Audio("/assets/audio/anime_adventures_theme.mp3");
    this.bgmAudio.loop = true;
    this.bgmAudio.preload = "auto";
    (this.bgmAudio as any).playsInline = true;
    this.updateBgmVolume();
  }

  private updateBgmVolume() {
    if (!this.bgmAudio) return;
    const effectiveVol = this.isBgmDucked ? 0 : this.getEffectiveMusicVolume();
    const isZero = effectiveVol <= 0.001;

    // Standard DOM volume assignment
    this.bgmAudio.volume = Math.max(0, Math.min(1, effectiveVol));

    // CRITICAL FIX FOR MOBILE (iOS Safari / Mobile WebKit):
    // iOS Safari deliberately makes HTMLMediaElement.volume READ-ONLY and ignores volume assignments.
    // Setting muted = true is universally supported and immediately silences audio on mobile.
    this.bgmAudio.muted = isZero;

    // Web Audio Gain Node (provides genuine proportional volume scaling on iOS Safari)
    if (this.bgmGain && this.ctx) {
      try {
        this.bgmGain.gain.setValueAtTime(isZero ? 0 : effectiveVol, this.ctx.currentTime);
      } catch {
        // Fallback for edge cases
      }
    }

    // Direct pause/play guard for complete mobile hardware silence when volume is 0
    if (isZero) {
      if (!this.bgmAudio.paused) {
        this.bgmAudio.pause();
      }
    } else {
      if (this.isBgmPlaying && !this.isBgmDucked && this.bgmAudio.paused) {
        this.bgmAudio.play().catch(() => {});
      }
    }
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
    this.ensureContextRunning();
    this.setupBgmAudioGraph();
    this.updateBgmVolume();
    this.updateSfxGain();
    this.saveSettings();
    this.notifyListeners();
  }

  public setMusicVolume(vol: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, vol));
    this.ensureContextRunning();
    this.setupBgmAudioGraph();
    this.updateBgmVolume();
    this.saveSettings();
    this.notifyListeners();
  }

  public setSummonVolume(vol: number) {
    this.settings.summonVolume = Math.max(0, Math.min(1, vol));
    this.ensureContextRunning();
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
  // BACKGROUND MUSIC (anime_adventures_theme.mp3)
  // =========================================================================
  public startBGM() {
    if (typeof window === "undefined") return;
    this.initBgmAudio();
    if (!this.bgmAudio) return;

    this.isBgmPlaying = true;
    this.isBgmDucked = false;
    this.updateBgmVolume();

    // If volume is 0 or muted, do not start audible playback
    if (this.getEffectiveMusicVolume() <= 0.001) {
      this.bgmAudio.pause();
      return;
    }

    const playPromise = this.bgmAudio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isBgmPlaying = true;
        })
        .catch(() => {
          // Autoplay policy prevented immediate playback; resume on first user interaction
          const unlock = () => {
            this.ensureContextRunning();
            this.setupBgmAudioGraph();
            if (this.bgmAudio && !this.isBgmDucked && this.getEffectiveMusicVolume() > 0.001) {
              this.bgmAudio.play().then(() => {
                this.isBgmPlaying = true;
              }).catch(() => {});
            }
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("touchstart", unlock);
            window.removeEventListener("keydown", unlock);
          };
          window.addEventListener("pointerdown", unlock, { once: true, passive: true });
          window.addEventListener("touchstart", unlock, { once: true, passive: true });
          window.addEventListener("keydown", unlock, { once: true, passive: true });
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
    if (this.bgmAudio && this.bgmAudio.paused && this.getEffectiveMusicVolume() > 0.001) {
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

  // =========================================================================
  // COMBAT & LIBERATION SFX PUNCHES (SYNTHESIZED WEB AUDIO API)
  // =========================================================================

  /**
   * Visceral physical punch impact with punch transient, noise crunch, and sub-thump.
   */
  public playHitPunch(options?: { isCrit?: boolean; isHeavy?: boolean }) {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const isCrit = options?.isCrit ?? false;
    const isHeavy = options?.isHeavy ?? false;
    const volScale = isHeavy ? 1.3 : isCrit ? 1.15 : 0.9;

    // 1. Sub-thump body
    const thumpOsc = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thumpOsc.type = "sine";
    thumpOsc.frequency.setValueAtTime(isCrit ? 180 : 140, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(35, now + 0.14);
    thumpGain.gain.setValueAtTime(0.45 * volScale, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.sfxGain);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.16);

    // 2. Impact crack noise burst (white noise buffer)
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(isCrit ? 2200 : 1400, now);
      noiseFilter.Q.setValueAtTime(2.2, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3 * volScale, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.sfxGain);
      noiseSource.start(now);
      noiseSource.stop(now + 0.08);
    } catch {
      // Ignore noise buffer creation errors on older environments
    }

    // 3. Critical strike metallic / glass chime crackle
    if (isCrit) {
      const critOsc = this.ctx.createOscillator();
      const critGain = this.ctx.createGain();
      critOsc.type = "triangle";
      critOsc.frequency.setValueAtTime(880, now);
      critOsc.frequency.exponentialRampToValueAtTime(1320, now + 0.04);
      critOsc.frequency.exponentialRampToValueAtTime(440, now + 0.18);
      critGain.gain.setValueAtTime(0.25 * volScale, now);
      critGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      critOsc.connect(critGain);
      critGain.connect(this.sfxGain);
      critOsc.start(now);
      critOsc.stop(now + 0.2);
    }
  }

  /**
   * Elemental flavor impact audio (Glacio, Fusion, Electro, Aero, Spectro, Havoc).
   */
  public playElementalHit(element: string, isSuper: boolean = false) {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const mult = isSuper ? 1.3 : 1.0;

    switch (element) {
      case "Glacio": {
        // Crystalline ice shatter: series of 3 high-pitch crystalline tones
        [1760, 2637, 3520].forEach((freq, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.015);
          osc.frequency.exponentialRampToValueAtTime(freq * 0.8, now + i * 0.015 + 0.15);
          gain.gain.setValueAtTime(0.18 * mult, now + i * 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.015 + 0.18);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now + i * 0.015);
          osc.stop(now + i * 0.015 + 0.18);
        });
        break;
      }
      case "Fusion": {
        // Fiery explosive rumble & thermal blast
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);
        gain.gain.setValueAtTime(0.3 * mult, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.28);
        break;
      }
      case "Electro": {
        // Rapid high-voltage spark zap
        [330, 880, 1320, 660].forEach((freq, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(freq, now + i * 0.02);
          gain.gain.setValueAtTime(0.12 * mult, now + i * 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.02 + 0.06);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now + i * 0.02);
          osc.stop(now + i * 0.02 + 0.06);
        });
        break;
      }
      case "Aero": {
        // Sonic wind blade scythe whoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.18);
        gain.gain.setValueAtTime(0.26 * mult, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case "Spectro": {
        // Celestial luminous harmonic chime
        [587.33, 880.0, 1479.98].forEach((freq, i) => {
          if (!this.ctx || !this.sfxGain) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.03);
          gain.gain.setValueAtTime(0.2 * mult, now + i * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.03 + 0.35);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now + i * 0.03);
          osc.stop(now + i * 0.03 + 0.35);
        });
        break;
      }
      case "Havoc": {
        // Abyssal gravity void distortion crunch
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc1.type = "triangle";
        osc2.type = "sawtooth";
        osc1.frequency.setValueAtTime(95, now);
        osc1.frequency.exponentialRampToValueAtTime(32, now + 0.3);
        osc2.frequency.setValueAtTime(102, now); // Detuned for dissonance
        osc2.frequency.exponentialRampToValueAtTime(36, now + 0.3);
        gain.gain.setValueAtTime(0.32 * mult, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.sfxGain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.32);
        osc2.stop(now + 0.32);
        break;
      }
    }
  }

  /**
   * Dramatic Resonance Liberation activation cinematic sound:
   * - Energy charge sweep up -> time-stop whoosh -> explosive bass release!
   */
  public playLiberationActivation(element: string = "Spectro") {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // 1. Rising Energy Charge Whine (0s - 0.4s)
    const chargeOsc = this.ctx.createOscillator();
    const chargeGain = this.ctx.createGain();
    chargeOsc.type = "sine";
    chargeOsc.frequency.setValueAtTime(70, now);
    chargeOsc.frequency.exponentialRampToValueAtTime(480, now + 0.4);
    chargeGain.gain.setValueAtTime(0.1, now);
    chargeGain.gain.exponentialRampToValueAtTime(0.5, now + 0.35);
    chargeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    chargeOsc.connect(chargeGain);
    chargeGain.connect(this.sfxGain);
    chargeOsc.start(now);
    chargeOsc.stop(now + 0.45);

    // 2. High-pitch resonant shimmer
    const shimmerOsc = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmerOsc.type = "triangle";
    shimmerOsc.frequency.setValueAtTime(600, now);
    shimmerOsc.frequency.exponentialRampToValueAtTime(1800, now + 0.38);
    shimmerGain.gain.setValueAtTime(0.08, now);
    shimmerGain.gain.exponentialRampToValueAtTime(0.35, now + 0.35);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(this.sfxGain);
    shimmerOsc.start(now);
    shimmerOsc.stop(now + 0.45);

    // 3. Explosive Sub-Bass Drop (at 0.4s)
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = "triangle";
    boomOsc.frequency.setValueAtTime(200, now + 0.4);
    boomOsc.frequency.exponentialRampToValueAtTime(32, now + 1.2);
    boomGain.gain.setValueAtTime(0.7, now + 0.4);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    boomOsc.connect(boomGain);
    boomGain.connect(this.sfxGain);
    boomOsc.start(now + 0.4);
    boomOsc.stop(now + 1.2);

    // 4. Element specific resonance stinger at detonation
    setTimeout(() => {
      this.playElementalHit(element, true);
    }, 400);
  }

  /**
   * Victorious Persona-style "1 MORE!" brass/synth fanfare.
   */
  public playOneMoreStinger() {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Triumphant Eb Major arpeggio + fanfare
    const freqs = [311.13, 392.0, 466.16, 622.25];
    freqs.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0.32, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.7);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.7);
    });
  }

  /**
   * Resonator Grit shield deflection clang when enduring a fatal hit with 1 HP.
   */
  public playResonatorGrit() {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Metallic clang
    [540, 890, 1420].forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.3);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  /**
   * Swift airy whoosh when an attack misses or is agilely dodged.
   */
  public playMissWhoosh() {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.2);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Crisp anime blade slash whoosh when a Resonator approaches and strikes.
   */
  public playSlashWhoosh(element?: string) {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Filtered noise blade slice
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.16);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(element === "Glacio" ? 3200 : element === "Fusion" ? 1400 : 2200, now);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      noise.start(now);
      noise.stop(now + 0.15);
    } catch {
      // Fallback sine if buffer fails
    }

    // High velocity whistle sweep
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(element === "Electro" ? 1200 : 780, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);

    oscGain.gain.setValueAtTime(0.18, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  /**
   * Restorative ascending harmonic chime when a Resonator receives healing.
   */
  public playHealChime() {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.05);

      gain.gain.setValueAtTime(0.18, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.45);
    });
  }

  /**
   * Sparkling golden chime when Astrites or currency rewards are won/claimed.
   */
  public playAstriteGain() {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1174.66, 1479.98]; // D5, F#5, A5, D6, F#6
    notes.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      gain.gain.setValueAtTime(0.2, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.35);
    });
  }

  /**
   * Warning buzzer/chime when Astrites are insufficient to place a wager.
   */
  public playInsufficient() {
    if (this.getEffectiveSummonVolume() <= 0) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const tones = [220, 185]; // Low rejection double tone
    tones.forEach((freq, i) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.09);

      gain.gain.setValueAtTime(0.25, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.16);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.16);
    });
  }
}

export const soundEngine = new SoundEngine();
