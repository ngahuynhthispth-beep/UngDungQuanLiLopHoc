// js/wheel.js - Colorful Lucky Wheel for calling students/teams
class LuckyWheel {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.items = [];
    this.currentAngle = 0;
    this.isSpinning = false;
    this.colors = [
      '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C',
      '#FF9F43', '#54A0FF', '#5f27cd', '#48dbfb',
      '#ff6b81', '#1dd1a1', '#f368e0', '#00d2d3'
    ];
  }

  setItems(items) {
    this.items = items;
    this.draw();
  }

  draw() {
    if (!this.canvas || this.items.length === 0) return;
    const { width, height } = this.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 15;
    const arc = (2 * Math.PI) / this.items.length;

    this.ctx.clearRect(0, 0, width, height);

    // Outer shadow ring
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#FFEAA7';
    this.ctx.fill();
    this.ctx.restore();

    this.items.forEach((item, i) => {
      const angle = this.currentAngle + i * arc;
      this.ctx.beginPath();
      this.ctx.fillStyle = this.colors[i % this.colors.length];
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, angle, angle + arc);
      this.ctx.lineTo(centerX, centerY);
      this.ctx.fill();
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      // Text
      this.ctx.save();
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(angle + arc / 2);
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 15px Quicksand, Arial, sans-serif';
      this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
      this.ctx.shadowBlur = 4;
      // Shorten name if too long
      const displayName = item.name.length > 14 ? item.name.substring(0, 12) + '..' : item.name;
      this.ctx.fillText(displayName, radius - 20, 5);
      this.ctx.restore();
    });

    // Center pin
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 22, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fill();
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#FF4757';
    this.ctx.fill();
  }

  spin(onComplete) {
    if (this.isSpinning || this.items.length === 0) return;
    this.isSpinning = true;

    const spinAngle = Math.random() * 2 * Math.PI + Math.PI * 10; // at least 5 full rotations
    const duration = 4000; // 4s
    const startTime = performance.now();
    const startAngle = this.currentAngle;
    let lastTickAngle = startAngle;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      this.currentAngle = startAngle + spinAngle * easeOut;

      // Sound tick when passing a section
      const arc = (2 * Math.PI) / this.items.length;
      if (Math.abs(this.currentAngle - lastTickAngle) > arc) {
        window.soundFx.playWheelTick();
        lastTickAngle = this.currentAngle;
      }

      this.draw();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;
        // Determine winning item (Pointer is at top: 3*PI/2)
        const normalizedAngle = (3 * Math.PI / 2 - (this.currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const winningIndex = Math.floor(normalizedAngle / arc) % this.items.length;
        const winner = this.items[winningIndex];
        window.soundFx.playHatch();
        if (onComplete) onComplete(winner);
      }
    };

    requestAnimationFrame(animate);
  }
}

window.LuckyWheel = LuckyWheel;
