// js/audio.js - Web Audio API Synthesizer for 100% offline playful classroom sounds
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.isMuted = localStorage.getItem('class_app_muted') === 'true';
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    localStorage.setItem('class_app_muted', this.isMuted);
    return this.isMuted;
  }

  // Tiếng Ting lấp lánh khi cộng sao
  playStar() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.1); // E6
    osc1.frequency.exponentialRampToValueAtTime(1975.53, now + 0.25); // B6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.51, now);
    osc2.frequency.exponentialRampToValueAtTime(2637.02, now + 0.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  // Tiếng quả trứng lắc rắc rắc
  playEggShake() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(540, now + 0.08);
    osc.frequency.linearRampToValueAtTime(380, now + 0.16);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Tiếng Trứng Nở / Tiến hóa hoành tráng
  playHatch() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, index) => {
      const now = this.ctx.currentTime + index * 0.09;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    });
  }

  // Tiếng thăng cấp / nộp bài tập thành công
  playLevelUp() {
    this.playHatch();
  }

  // Tiếng chúc mừng cả tổ / cả lớp
  playCheer() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const chords = [
      [523.25, 659.25, 783.99],       // C
      [587.33, 739.99, 880.00],       // D
      [659.25, 830.61, 987.77],       // E
      [783.99, 987.77, 1174.66, 1567.98] // G + high G
    ];

    chords.forEach((chord, step) => {
      const stepTime = this.ctx.currentTime + step * 0.14;
      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, stepTime);

        gain.gain.setValueAtTime(0.18, stepTime);
        gain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(stepTime);
        osc.stop(stepTime + 0.5);
      });
    });
  }

  // Tiếng ru ngủ nhẹ nhàng khi thú cưng vào trạng thái "Tĩnh tâm / Đi ngủ"
  playSleep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [659.25, 587.33, 523.25, 392.00]; // E5, D5, C5, G4
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.22;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    });
  }

  // Tiếng gõ vòng quay may mắn
  playWheelTick() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Tiếng chuông nhẹ nhắc nhở im lặng
  playQuietShh() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.linearRampToValueAtTime(440, now + 0.4); // A4

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  }
}

window.soundFx = new SoundEffects();
