// High-fidelity Audio Engine for Wuthering Waves Convene replica
// STRICT REQUIREMENT: ZERO UI CLICK/HOVER/MODAL NOISES.
// Audio triggers ONLY during summons:
// 1. Official meteor launch sequence audio (embedded in video)
// 2. Rarity chord stingers (3★ Blue, 4★ Purple, 5★ Gold)
// 3. 5-Star character reveal intro voice lines / SFX

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialize on first user gesture
  }

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
        this.sfxGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.sfxGain) {
      const now = this.ctx.currentTime;
      this.sfxGain.gain.setValueAtTime(muted ? 0 : 0.75, now);
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // NO UI SOUNDS PER CRITICAL REQUIREMENT 1
  public playClick() {
    // No-op: UI clicks strictly disabled
  }

  public playTabSwitch() {
    // No-op: UI hover/switch strictly disabled
  }

  public startAmbientBGM() {
    // No-op: Ambient UI BGM disabled per requirement 1
  }

  public stopAmbientBGM() {
    // No-op
  }

  // =========================================================================
  // SUMMON-ONLY AUDIO STIMULI (Kuro Games Official Sound Palette)
  // =========================================================================

  // 1. 3-Star Blue Rarity Chord Stinger
  public playBlueStinger() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    // Pure celestial chime chord (D5, A5, D6)
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

  // 2. 4-Star Purple Rarity Chord Stinger
  public playPurpleStinger() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Resonant mystic dual-tone swell
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(196.0, now); // G3
    subOsc.frequency.exponentialRampToValueAtTime(110.0, now + 0.8);
    subGain.gain.setValueAtTime(0.35, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(now);
    subOsc.stop(now + 0.8);

    // Purple chord stinger (Eb4, Bb4, G5, C6)
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

  // 3. 5-Star Gold Rarity Chord Stinger (Grand Fanfare & Shimmer)
  public playGoldStinger() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    // Cosmic deep impact sub-bass
    const boomOsc = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boomOsc.type = "triangle";
    boomOsc.frequency.setValueAtTime(146.83, now); // D3
    boomOsc.frequency.exponentialRampToValueAtTime(32.7, now + 1.8);
    boomGain.gain.setValueAtTime(0.65, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    boomOsc.connect(boomGain);
    boomGain.connect(this.sfxGain);
    boomOsc.start(now);
    boomOsc.stop(now + 1.8);

    // Triumphant golden chord fanfare (D4, A4, D5, F#5, A5, D6 shimmer)
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

  // Card Flip / Item Reveal stinger delegator
  public playCardReveal(rarity: number) {
    if (rarity === 5) {
      this.playGoldStinger();
    } else if (rarity === 4) {
      this.playPurpleStinger();
    } else {
      this.playBlueStinger();
    }
  }

  // 4. 5-Star Character Reveal Intro Voice Lines / SFX (Disabled per request - no TTS)
  public playCharacterVoice(name: string, quote?: string) {
    // No-op: text-to-speech removed
  }
}

export const soundEngine = new SoundEngine();
