// js/card-export.js - Export digital certificate for Zalo
const CardExporter = {
  async generateCard(student, group) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 600, 750);
    bgGrad.addColorStop(0, '#FFF5EB');
    bgGrad.addColorStop(1, '#FFF0F5');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 600, 750);

    // Decorative outer border
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#FF758C';
    ctx.strokeRect(15, 15, 570, 720);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#FFA07A';
    ctx.strokeRect(25, 25, 550, 700);

    // Header banner
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.roundRect(50, 45, 500, 65, 15);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⭐ PHIẾU KHEN BÉ NGOAN ⭐', 300, 86);

    // Subtitle
    ctx.fillStyle = '#718096';
    ctx.font = '16px Arial, sans-serif';
    const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    ctx.fillText(today, 300, 135);

    // Student Box
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(50, 160, 500, 140, 20);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Name
    ctx.fillStyle = '#2D3748';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.fillText(student.name, 300, 205);

    // Group info & Stage
    const stage = window.EggEvolution ? window.EggEvolution.getStage(student.stars) : { name: 'Thần thú' };
    ctx.fillStyle = '#4A5568';
    ctx.font = '16px Arial, sans-serif';
    ctx.fillText(`Thành viên: ${group ? group.name : 'Tổ lớp'}`, 300, 238);

    ctx.fillStyle = '#E53E3E';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText(`Linh thú: ${stage.name} (${student.stars} ⭐)`, 300, 275);

    // Section title: Việc tốt hôm nay
    ctx.fillStyle = '#2B6CB0';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🌟 NHỮNG VIỆC TỐT BÉ ĐÃ LÀM HÔM NAY:', 60, 340);

    // Log items box
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(50, 360, 500, 220, 15);
    ctx.fill();

    const logs = (student.logs && student.logs.length > 0) 
      ? student.logs.slice(0, 4) 
      : [
          { icon: '✋', reason: 'Tích cực giơ tay phát biểu bài', time: '08:30' },
          { icon: '🤫', reason: 'Giữ trật tự và ngồi học rất ngoan', time: '09:15' },
          { icon: '👀', reason: 'Tập trung chú ý nghe cô giảng', time: '10:00' }
        ];

    let startY = 405;
    logs.forEach((log) => {
      ctx.fillStyle = '#2D3748';
      ctx.font = '16px Arial, sans-serif';
      ctx.fillText(`${log.icon}  ${log.reason}`, 75, startY);

      ctx.fillStyle = '#A0AEC0';
      ctx.font = '14px Arial, sans-serif';
      ctx.fillText(log.time || '', 480, startY);
      startY += 45;
    });

    // Teacher praise & stamp
    ctx.fillStyle = '#2C7A7B';
    ctx.font = 'italic bold 17px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('“Cô rất tự hào về sự tiến bộ và chăm ngoan của bé hôm nay!”', 300, 620);

    // Stamp circle
    ctx.save();
    ctx.translate(450, 670);
    ctx.rotate(-0.15);
    ctx.strokeStyle = '#E53E3E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 45, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = '#E53E3E';
    ctx.font = 'bold 12px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CÔ GIÁO', 0, -12);
    ctx.font = 'bold 15px Arial, sans-serif';
    ctx.fillText('KHEN BÉ', 0, 8);
    ctx.font = '10px Arial, sans-serif';
    ctx.fillText('XUẤT SẮC', 0, 24);
    ctx.restore();

    return canvas;
  },

  async copyToClipboard(canvas) {
    try {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    } catch (e) {
      console.warn('Clipboard write failed:', e);
      return false;
    }
  },

  download(canvas, studentName) {
    const link = document.createElement('a');
    link.download = `PhieuKhen_${studentName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
};

window.CardExporter = CardExporter;
