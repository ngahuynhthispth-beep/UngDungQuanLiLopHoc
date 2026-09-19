// js/noise-meter.js - Real-time Classroom Noise Detector using Web Audio API
class NoiseMeter {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphone = null;
    this.javascriptNode = null;
    this.isRunning = false;
    this.threshold = 45; // Default threshold percentage
    this.quietStreak = 0; // Seconds of being quiet
    this.targetStreak = 45; // 45 seconds quiet = award
    this.timer = null;
    this.onVolumeUpdate = null;
    this.onAlarm = null;
    this.onReward = null;
  }

  async start() {
    if (this.isRunning) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);

      this.analyser.smoothingTimeConstant = 0.6;
      this.analyser.fftSize = 512;

      this.microphone.connect(this.analyser);
      this.isRunning = true;

      this.loop();
      this.startStreakTimer();
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or not available:', err);
      return false;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    if (this.microphone && this.microphone.mediaStream) {
      this.microphone.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }

  setThreshold(val) {
    this.threshold = Number(val);
  }

  loop() {
    if (!this.isRunning) return;

    const array = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(array);

    let values = 0;
    const length = array.length;
    for (let i = 0; i < length; i++) {
      values += array[i];
    }
    const average = values / length;
    const volumePercent = Math.min(100, Math.round((average / 128) * 100));

    const isLoud = volumePercent > this.threshold;

    if (this.onVolumeUpdate) {
      this.onVolumeUpdate({
        volume: volumePercent,
        threshold: this.threshold,
        isLoud,
        quietProgress: Math.min(100, Math.round((this.quietStreak / this.targetStreak) * 100))
      });
    }

    if (isLoud) {
      this.quietStreak = Math.max(0, this.quietStreak - 2);
      if (this.onAlarm) this.onAlarm();
    }

    requestAnimationFrame(() => this.loop());
  }

  startStreakTimer() {
    this.timer = setInterval(() => {
      if (!this.isRunning) return;
      this.quietStreak++;

      if (this.quietStreak >= this.targetStreak) {
        this.quietStreak = 0;
        if (this.onReward) {
          this.onReward();
        }
      }
    }, 1000);
  }
}

window.NoiseMeter = NoiseMeter;
