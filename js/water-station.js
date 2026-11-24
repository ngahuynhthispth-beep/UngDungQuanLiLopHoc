/**
 * js/water-station.js - Trạm Nước Uống Tuần & Danh Hiệu Hiệp Sĩ Nước Sạch
 * Thiết kế cho Lớp 1/8 Trường TH Tiểu La
 * Mỗi học sinh có 1 bình nước trong suốt tượng trưng (5 nấc: T2 - T6).
 * Mỗi ngày uống hết 1 bình -> Nước dâng 1 nấc (20%) + Nhận 5 ⭐.
 * Hết tuần: Bạn nào đầy bình (5/5 ngày) được vinh danh Hiệp Sĩ Nước Sạch!
 * Sang tuần mới: Bình tự động rỗng lại để tiếp tục thi đua.
 */

(function () {
  'use strict';

  // Lấy chuỗi ngày Thứ Hai của tuần hiện tại (YYYY-MM-DD)
  function getWeekMondayDateStr(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay(); // 0: CN, 1: T2, ..., 6: T7
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const dt = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  }

  // Lấy chuỗi ngày Thứ Sáu của tuần hiện tại (YYYY-MM-DD)
  function getWeekFridayDateStr(mondayStr) {
    const parts = mondayStr.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + 4);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  }

  // Định dạng ngày hiển thị VN (DD/MM)
  function formatVnDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  }

  // Lấy chuỗi ngày hôm nay (YYYY-MM-DD)
  function getTodayDateStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  }

  class WaterStation {
    constructor() {
      this.modal = null;
      this.currentFilter = 'all'; // 'all' | 1 | 2 | 3 | 4 | 'not_today' | 'full'
      this.searchQuery = '';
      this.viewMode = 'list'; // Mặc định luôn là Danh Sách dòng ngang siêu tốc, dễ tìm kiếm
      this.init();
    }

    setViewMode(mode) {
      this.viewMode = mode === 'grid' ? 'grid' : 'list';
      try {
        localStorage.setItem('water_station_view_mode', this.viewMode);
      } catch (e) {}
      this.render();
    }

    init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.bindEvents());
      } else {
        this.bindEvents();
      }
    }

    bindEvents() {
      this.modal = document.getElementById('waterStationModal');

      // Nút mở trên Header (hỗ trợ cả Desktop và Mobile)
      const btnOpenDesktop = document.getElementById('btnWaterStation');
      if (btnOpenDesktop) {
        btnOpenDesktop.addEventListener('click', () => this.openModal());
      }
      const btnOpenMobile = document.getElementById('btnMobileWaterStation');
      if (btnOpenMobile) {
        btnOpenMobile.addEventListener('click', () => this.openModal());
      }

      // Nút đóng
      const btnClose = document.getElementById('btnCloseWaterStationModal');
      if (btnClose) {
        btnClose.addEventListener('click', () => this.closeModal());
      }

      if (this.modal) {
        this.modal.addEventListener('click', (e) => {
          if (e.target === this.modal) this.closeModal();
        });
      }

      // Ô tìm kiếm tên học sinh (hỗ trợ cả Desktop và Mobile)
      document.querySelectorAll('.water-search-input').forEach(input => {
        input.addEventListener('input', (e) => {
          this.searchQuery = (e.target.value || '').trim();
          document.querySelectorAll('.water-search-input').forEach(other => {
            if (other !== input) other.value = e.target.value;
          });
          document.querySelectorAll('.water-clear-search-btn').forEach(btn => {
            btn.style.display = this.searchQuery ? 'flex' : 'none';
          });
          this.render();
        });
      });

      // Nút xóa nhanh ô tìm kiếm
      document.querySelectorAll('.water-clear-search-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.searchQuery = '';
          document.querySelectorAll('.water-search-input').forEach(input => {
            input.value = '';
          });
          btn.style.display = 'none';
          this.render();
        });
      });

      // Nút chuyển chế độ xem: Dòng Ngang (List) vs Thẻ Bình Nước (Grid)
      document.querySelectorAll('.btn-water-view-list').forEach(btn => {
        btn.addEventListener('click', () => this.setViewMode('list'));
      });
      document.querySelectorAll('.btn-water-view-grid').forEach(btn => {
        btn.addEventListener('click', () => this.setViewMode('grid'));
      });

      // Cập nhật số lượng bình đầy trên badge của nút Header
      this.updateHeaderBadge();
    }

    // Lấy dữ liệu trạm nước và tự động xoay vòng tuần mới nếu sang tuần khác
    getWaterData() {
      const data = (window.StorageManager && window.StorageManager.loadData()) || { students: [] };
      const currentMonday = getWeekMondayDateStr();

      if (!data.waterStation) {
        data.waterStation = {
          currentWeekMonday: currentMonday,
          records: {},
          history: []
        };
        if (window.StorageManager && typeof window.StorageManager.saveData === 'function') {
          window.StorageManager.saveData(data);
        }
      } else if (data.waterStation.currentWeekMonday !== currentMonday) {
        // Tự động lưu trữ tuần cũ và reset sang tuần mới
        const oldRecords = data.waterStation.records || {};
        const knights = Object.keys(oldRecords).filter(id => (oldRecords[id].count || 0) >= 5);
        if (knights.length > 0 || Object.keys(oldRecords).length > 0) {
          data.waterStation.history = data.waterStation.history || [];
          data.waterStation.history.unshift({
            weekMonday: data.waterStation.currentWeekMonday,
            knights: knights,
            totalStudents: (data.students || []).length,
            timestamp: Date.now()
          });
        }
        data.waterStation.currentWeekMonday = currentMonday;
        data.waterStation.records = {};
        if (window.StorageManager && typeof window.StorageManager.saveData === 'function') {
          window.StorageManager.saveData(data);
        }
      }

      return data;
    }

    // Lưu dữ liệu trạm nước
    saveWaterData(data) {
      if (window.StorageManager && typeof window.StorageManager.saveData === 'function') {
        window.StorageManager.saveData(data);
      }
      this.updateHeaderBadge();
    }

    // Cập nhật huy hiệu số bé đầy bình trên nút Header
    updateHeaderBadge() {
      try {
        const data = this.getWaterData();
        const records = (data.waterStation && data.waterStation.records) || {};
        const fullCount = Object.values(records).filter(r => (r.count || 0) >= 5).length;
        const badges = document.querySelectorAll('.water-full-badge-count');
        badges.forEach(b => {
          b.textContent = fullCount;
          b.style.display = fullCount > 0 ? 'inline-block' : 'none';
        });
      } catch (e) {}
    }

    openModal() {
      if (!this.modal) return;
      this.modal.classList.add('active');
      this.render();
    }

    closeModal() {
      if (!this.modal) return;
      this.modal.classList.remove('active');
      this.updateHeaderBadge();
    }

    // Âm thanh rót nước sủi bọt chân thực bằng Web Audio API
    playWaterSound() {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        [0, 0.08, 0.16, 0.24, 0.32].forEach((delay, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const freq = 420 + idx * 110 + Math.random() * 40;
          osc.frequency.setValueAtTime(freq, now + delay);
          osc.frequency.exponentialRampToValueAtTime(freq + 280, now + delay + 0.08);
          gain.gain.setValueAtTime(0.2, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.09);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.1);
        });
      } catch (e) {}
    }

    // Âm thanh vinh danh khi đầy bình 5/5
    playCelebrationSound() {
      if (window.soundFx && typeof window.soundFx.playCelebration === 'function') {
        window.soundFx.playCelebration();
      } else if (window.soundFx && typeof window.soundFx.playStar === 'function') {
        window.soundFx.playStar();
      }
    }

    // Hiệu ứng pháo hoa
    launchConfetti() {
      if (typeof window.confetti === 'function') {
        window.confetti({
          particleCount: 70,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    }

    // Nạp nước cho 1 học sinh
    logWater(studentId) {
      const data = this.getWaterData();
      const student = (data.students || []).find(s => s.id === studentId);
      if (!student) return;

      const todayStr = getTodayDateStr();
      const records = data.waterStation.records || {};
      const record = records[studentId] || { days: [], count: 0 };

      if (record.days.includes(todayStr)) {
        // Đã nạp hôm nay rồi
        if (typeof window.showSyncToast === 'function') {
          window.showSyncToast(`Bé <strong>${student.name}</strong> hôm nay đã uống đủ nước rồi nhé!`, '💧');
        }
        return;
      }

      // Thêm ngày hôm nay vào danh sách ngày đã uống
      record.days.push(todayStr);
      record.count = Math.min(5, record.days.length);
      record.updatedAt = Date.now();
      records[studentId] = record;
      data.waterStation.records = records;

      this.saveWaterData(data);

      // Phát âm thanh rót nước
      this.playWaterSound();

      // Cộng 5 sao kèm lý do minh chứng cho phụ huynh
      const cardEl = document.querySelector(`.water-student-card[data-id="${studentId}"]`);
      const reason = `Uống đủ bình nước (Nấc ${record.count}/5 tuần này)`;
      if (typeof window.applyStudentPoints === 'function') {
        window.applyStudentPoints(studentId, 5, reason, '💧', cardEl, true);
      } else if (window.StorageManager) {
        window.StorageManager.addPointsToStudent(studentId, 5, reason, '💧');
        if (typeof window.refreshData === 'function') window.refreshData();
      }

      // Nếu đạt 5/5 ngày: Vinh danh Hiệp Sĩ Nước Sạch
      if (record.count === 5) {
        setTimeout(() => {
          this.playCelebrationSound();
          this.launchConfetti();
          if (typeof window.showSyncToast === 'function') {
            window.showSyncToast(`🏆 Chúc mừng bé <strong>${student.name}</strong> đã đầy 5/5 nấc nước và trở thành <strong>HIỆP SĨ NƯỚC SẠCH</strong> tuần này!`, '👑');
          }
        }, 300);
      }

      this.render();
    }

    // Ghi nhận nạp nước vào bình (không tự cộng điểm, dùng khi điểm đã được cộng từ nguồn khác như Mic AI)
    recordWaterOnly(studentId) {
      const data = this.getWaterData();
      const todayStr = getTodayDateStr();
      const records = data.waterStation.records || {};
      const record = records[studentId] || { days: [], count: 0 };
      if (!record.days.includes(todayStr)) {
        record.days.push(todayStr);
        record.count = Math.min(5, record.days.length);
        record.updatedAt = Date.now();
        records[studentId] = record;
        data.waterStation.records = records;
        this.saveWaterData(data);
      }
    }

    // Hoàn tác nạp nước nếu cô bấm nhầm
    unlogWater(studentId) {
      const data = this.getWaterData();
      const student = (data.students || []).find(s => s.id === studentId);
      if (!student) return;

      const todayStr = getTodayDateStr();
      const records = data.waterStation.records || {};
      const record = records[studentId];
      if (!record || !record.days.includes(todayStr)) return;

      if (!window.confirm(`Bạn có chắc muốn hoàn tác lượt uống nước hôm nay của bé "${student.name}" không? (-5 ⭐)`)) {
        return;
      }

      record.days = record.days.filter(d => d !== todayStr);
      record.count = Math.max(0, record.days.length);
      record.updatedAt = Date.now();
      records[studentId] = record;
      data.waterStation.records = records;

      this.saveWaterData(data);

      const cardEl = document.querySelector(`.water-student-card[data-id="${studentId}"]`);
      if (typeof window.applyStudentPoints === 'function') {
        window.applyStudentPoints(studentId, -5, `Hoàn tác nước uống (bấm nhầm)`, '⚠️', cardEl, true);
      } else if (window.StorageManager) {
        window.StorageManager.addPointsToStudent(studentId, -5, `Hoàn tác nước uống (bấm nhầm)`, '⚠️');
        if (typeof window.refreshData === 'function') window.refreshData();
      }

      this.render();
    }

    // Nạp nhanh hàng loạt cho các bé chưa uống hôm nay theo danh sách ID
    bulkLogWater(targetStudentIds) {
      if (!targetStudentIds || targetStudentIds.length === 0) {
        if (typeof window.showSyncToast === 'function') {
          window.showSyncToast('Không có học sinh nào cần nạp nước trong nhóm này.', 'ℹ️');
        }
        return;
      }

      const data = this.getWaterData();
      const todayStr = getTodayDateStr();
      const records = data.waterStation.records || {};
      let loggedCount = 0;

      targetStudentIds.forEach((sId, idx) => {
        const student = (data.students || []).find(s => s.id === sId);
        if (!student) return;
        const record = records[sId] || { days: [], count: 0 };

        if (!record.days.includes(todayStr)) {
          record.days.push(todayStr);
          record.count = Math.min(5, record.days.length);
          record.updatedAt = Date.now();
          records[sId] = record;
          loggedCount++;

          // Thực hiện cộng điểm với độ trễ nhẹ để hiển thị âm thanh
          setTimeout(() => {
            const reason = `Uống đủ bình nước (Nấc ${record.count}/5 tuần này)`;
            if (typeof window.applyStudentPoints === 'function') {
              window.applyStudentPoints(sId, 5, reason, '💧', null, true);
            } else if (window.StorageManager) {
              window.StorageManager.addPointsToStudent(sId, 5, reason, '💧');
            }
          }, idx * 60);
        }
      });

      if (loggedCount === 0) {
        if (typeof window.showSyncToast === 'function') {
          window.showSyncToast('Tất cả các bé trong nhóm đã được nạp nước hôm nay rồi!', '💧');
        }
        return;
      }

      data.waterStation.records = records;
      this.saveWaterData(data);
      this.playWaterSound();

      if (typeof window.showSyncToast === 'function') {
        window.showSyncToast(`⚡ Đã nạp nước thành công cho <strong>${loggedCount}</strong> học sinh (+5 ⭐/bé)!`, '💧');
      }

      setTimeout(() => {
        if (typeof window.refreshData === 'function') window.refreshData();
        this.render();
      }, targetStudentIds.length * 60 + 100);
    }

    // Nạp nước hàng loạt cho các bé đang hiển thị trong bộ lọc & tìm kiếm
    bulkLogFiltered() {
      const data = this.getWaterData();
      const todayStr = getTodayDateStr();
      const records = data.waterStation.records || {};
      let filtered = (data.students || []).filter(s => {
        const r = records[s.id] || { count: 0, days: [] };
        if (this.currentFilter === 'all') return true;
        if (['1', '2', '3', '4'].includes(String(this.currentFilter))) return String(s.group) === String(this.currentFilter);
        if (this.currentFilter === 'not_today') return !r.days.includes(todayStr);
        if (this.currentFilter === 'full') return r.count >= 5;
        return true;
      });
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
      }
      const unloggedIds = filtered.filter(s => {
        const r = records[s.id] || { count: 0, days: [] };
        return !r.days.includes(todayStr);
      }).map(s => s.id);
      this.bulkLogWater(unloggedIds);
    }

    // Bắt đầu chu kỳ tuần mới thủ công
    resetWeekManual() {
      const data = this.getWaterData();
      const currentMonday = data.waterStation.currentWeekMonday || getWeekMondayDateStr();
      const records = data.waterStation.records || {};
      const knights = Object.keys(records).filter(id => (records[id].count || 0) >= 5);

      const confirmMsg = `Bạn có chắc muốn BẮT ĐẦU TUẦN MỚI cho Trạm Nước không?\n\n- Tuần hiện tại: ${formatVnDate(currentMonday)} đến ${formatVnDate(getWeekFridayDateStr(currentMonday))}\n- Số bé đạt Hiệp Sĩ Nước Sạch: ${knights.length} bé\n\n(Lịch sử tuần này sẽ được lưu trữ tự động vào Bảng Vinh Danh)`;
      if (!window.confirm(confirmMsg)) return;

      data.waterStation.history = data.waterStation.history || [];
      data.waterStation.history.unshift({
        weekMonday: currentMonday,
        knights: knights,
        totalStudents: (data.students || []).length,
        timestamp: Date.now()
      });

      data.waterStation.records = {};
      data.waterStation.currentWeekMonday = getWeekMondayDateStr();
      this.saveWaterData(data);

      this.launchConfetti();
      if (typeof window.showSyncToast === 'function') {
        window.showSyncToast('🌟 Đã bắt đầu tuần thi đua nước uống mới! Các bình nước đã sẵn sàng.', '✨');
      }
      this.render();
    }

    // Hiển thị Popup Hướng dẫn & Luật chơi
    showRulesModal() {
      const modal = document.getElementById('waterRulesModal');
      if (modal) modal.classList.add('active');
    }

    // Hiển thị Bảng Vinh Danh Hiệp Sĩ Nước
    showHonorModal() {
      const data = this.getWaterData();
      const students = data.students || [];
      const records = (data.waterStation && data.waterStation.records) || {};
      const currentMonday = data.waterStation.currentWeekMonday || getWeekMondayDateStr();
      const currentFriday = getWeekFridayDateStr(currentMonday);

      const knights = students.filter(s => {
        const r = records[s.id];
        return r && (r.count || 0) >= 5;
      });

      const modal = document.getElementById('waterHonorModal');
      const container = document.getElementById('waterHonorKnightsList');
      const timeSpan = document.getElementById('waterHonorWeekRange');

      if (timeSpan) {
        timeSpan.textContent = `Tuần: ${formatVnDate(currentMonday)} - ${formatVnDate(currentFriday)}`;
      }

      if (container) {
        if (knights.length === 0) {
          container.innerHTML = `
            <div style="padding: 30px 10px; color: #64748B; font-size: 14px; font-weight: 700;">
              <div style="font-size: 40px; margin-bottom: 8px;">💧🐣</div>
              Chưa có bạn nào đạt 5/5 ngày đầy bình trong tuần này.<br>
              Các con hãy cố gắng uống đủ nước mỗi ngày nhé!
            </div>
          `;
        } else {
          container.innerHTML = knights.map((k, idx) => {
            const groupObj = (data.groups || []).find(g => g.id === k.group) || { color: '#0EA5E9', name: 'Tổ' };
            let avatarSvg = '🦖';
            if (window.EggEvolution && typeof window.EggEvolution.renderPetSVG === 'function') {
              avatarSvg = window.EggEvolution.renderPetSVG(k.stars || 100, k.status || 'active', groupObj.color, 44, k.group, k.id);
            }
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; background: #FFFFFF; border: 2px solid #BAE6FD; padding: 10px 14px; border-radius: 16px; box-shadow: 0 2px 6px rgba(14, 165, 233, 0.1);">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-size: 18px; font-weight: 900; color: #F59E0B; width: 24px;">#${idx + 1}</span>
                  <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">${avatarSvg}</div>
                  <div style="text-align: left;">
                    <div style="font-size: 15px; font-weight: 900; color: #0F172A;">${k.name}</div>
                    <span style="font-size: 11px; font-weight: 700; color: ${groupObj.color};">${groupObj.name}</span>
                  </div>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; background: #FEF08A; color: #854D0E; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 900;">
                  👑 5/5 Ngày (100%)
                </div>
              </div>
            `;
          }).join('');
        }
      }

      if (modal) modal.classList.add('active');
    }

    // Xuất Ảnh Thiệp Vinh Danh gửi Zalo Phụ Huynh
    exportHonorZaloCard() {
      const data = this.getWaterData();
      const students = data.students || [];
      const records = (data.waterStation && data.waterStation.records) || {};
      const currentMonday = data.waterStation.currentWeekMonday || getWeekMondayDateStr();
      const currentFriday = getWeekFridayDateStr(currentMonday);

      const knights = students.filter(s => {
        const r = records[s.id];
        return r && (r.count || 0) >= 5;
      });

      if (knights.length === 0) {
        alert('Chưa có học sinh nào đạt 5/5 ngày đầy bình trong tuần này để xuất thiệp vinh danh.');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = Math.max(720, 480 + Math.ceil(knights.length / 3) * 110);
      const ctx = canvas.getContext('2d');

      // Nền Gradient Xanh Nước Biển Rực Rỡ
      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0369A1');
      grad.addColorStop(0.35, '#0284C7');
      grad.addColorStop(1, '#0C4A6E');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Họa tiết trang trí vòng tròn bong bóng nước
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let i = 0; i < 25; i++) {
        ctx.beginPath();
        const rx = (i * 137) % canvas.width;
        const ry = (i * 211) % canvas.height;
        ctx.arc(rx, ry, 25 + (i % 5) * 15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Khung viền vàng hoàng gia
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Tiêu đề
      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 42px Quicksand, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 BẢNG VÀNG HIỆP SĨ NƯỚC SẠCH 🏆', canvas.width / 2, 85);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 28px Quicksand, Arial, sans-serif';
      ctx.fillText(`LỚP 1/8 • TRƯỜNG TIỂU HỌC TIỂU LA`, canvas.width / 2, 130);

      ctx.fillStyle = '#BAE6FD';
      ctx.font = '700 22px Quicksand, Arial, sans-serif';
      ctx.fillText(`Tuần: ${formatVnDate(currentMonday)} - ${formatVnDate(currentFriday)} • Hoàn thành xuất sắc 5/5 ngày đầy bình nước`, canvas.width / 2, 168);

      // Vẽ danh sách các bé (Grid 3 cột)
      const cols = 3;
      const colWidth = (canvas.width - 120) / cols;
      const startX = 60;
      const startY = 220;

      knights.forEach((k, idx) => {
        const c = idx % cols;
        const r = Math.floor(idx / cols);
        const x = startX + c * colWidth;
        const y = startY + r * 95;

        // Hộp thẻ tên bé
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(x + 6, y, colWidth - 12, 80, 16);
        ctx.fill();

        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Icon giọt nước vương miện
        ctx.fillStyle = '#F59E0B';
        ctx.font = '900 26px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('👑💧', x + 18, y + 50);

        // Tên học sinh
        ctx.fillStyle = '#0F172A';
        ctx.font = '900 22px Quicksand, Arial, sans-serif';
        ctx.fillText(k.name, x + 85, y + 40);

        // Nhãn 5/5 Ngày
        ctx.fillStyle = '#0284C7';
        ctx.font = '800 15px Quicksand, Arial, sans-serif';
        ctx.fillText(`Đã uống đủ 5 ngày (100⭐)`, x + 85, y + 64);
      });

      // Lời chúc ở chân trang
      const footerY = canvas.height - 50;
      ctx.fillStyle = '#FDE047';
      ctx.font = 'italic 700 20px Quicksand, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ "Uống đủ nước mỗi ngày giúp cơ thể khỏe mạnh, mắt sáng và thông minh hơn!" ✨', canvas.width / 2, footerY - 20);

      ctx.fillStyle = '#E0F2FE';
      ctx.font = '700 16px Quicksand, Arial, sans-serif';
      ctx.fillText('Vườn Thú Kỳ Diệu Lớp 1/8 • Giáo Viên Chủ Nhiệm', canvas.width / 2, footerY + 8);

      // Tải ảnh về máy
      const link = document.createElement('a');
      link.download = `Hiep_Si_Nuoc_Sach_Lop_1_8_${currentMonday}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      if (typeof window.showSyncToast === 'function') {
        window.showSyncToast('📸 Đã xuất ảnh Thiệp Vinh Danh thành công! Cô có thể gửi ngay vào nhóm Zalo phụ huynh.', '✅');
      }
    }

    // Render toàn bộ giao diện Trạm Nước
    render() {
      const data = this.getWaterData();
      const students = data.students || [];
      const groups = data.groups || [];
      const records = (data.waterStation && data.waterStation.records) || {};
      const currentMonday = data.waterStation.currentWeekMonday || getWeekMondayDateStr();
      const currentFriday = getWeekFridayDateStr(currentMonday);
      const todayStr = getTodayDateStr();

      // Cập nhật thông tin Header
      const weekRangeEl = document.getElementById('waterModalWeekRange');
      if (weekRangeEl) {
        weekRangeEl.textContent = `Tuần học: ${formatVnDate(currentMonday)} đến ${formatVnDate(currentFriday)}`;
      }

      // Thống kê tiến độ chung cả lớp
      const totalStudents = students.length || 1;
      const fullBottlesCount = students.filter(s => {
        const r = records[s.id];
        return r && (r.count || 0) >= 5;
      }).length;

      const todayLoggedCount = students.filter(s => {
        const r = records[s.id];
        return r && Array.isArray(r.days) && r.days.includes(todayStr);
      }).length;

      const progressPercent = Math.round((fullBottlesCount / totalStudents) * 100);

      const progressFill = document.getElementById('waterProgressFill');
      const statsLabel = document.getElementById('waterStatsLabel');
      if (progressFill) progressFill.style.width = `${progressPercent}%`;
      if (statsLabel) {
        statsLabel.innerHTML = `🏆 <strong>${fullBottlesCount}/${totalStudents}</strong> bình đầy (Hôm nay: <strong>${todayLoggedCount}</strong> bé đã uống)`;
      }

      // Cập nhật trạng thái nút Toggle View List / Grid
      document.querySelectorAll('.btn-water-view-list').forEach(btn => {
        btn.classList.toggle('active', this.viewMode === 'list');
      });
      document.querySelectorAll('.btn-water-view-grid').forEach(btn => {
        btn.classList.toggle('active', this.viewMode === 'grid');
      });

      // Cập nhật nhãn nút nạp nước hàng loạt theo bộ lọc đang chọn
      document.querySelectorAll('.water-toolbar-quick-btn').forEach(btn => {
        let label = '⚡ Nạp Nước Hàng Loạt (+5⭐)';
        if (String(this.currentFilter) === '1') label = '⚡ Nạp Nước Cả Tổ 1 (+5⭐)';
        else if (String(this.currentFilter) === '2') label = '⚡ Nạp Nước Cả Tổ 2 (+5⭐)';
        else if (String(this.currentFilter) === '3') label = '⚡ Nạp Nước Cả Tổ 3 (+5⭐)';
        else if (String(this.currentFilter) === '4') label = '⚡ Nạp Nước Cả Tổ 4 (+5⭐)';
        else if (this.currentFilter === 'not_today') label = '⚡ Nạp Các Bé Chưa Uống (+5⭐)';
        else if (this.currentFilter === 'all') label = '⚡ Nạp Nước Cả Lớp (+5⭐)';
        btn.textContent = label;
      });

      // Lọc danh sách học sinh
      let filteredStudents = students.filter(s => {
        const r = records[s.id] || { count: 0, days: [] };
        if (this.currentFilter === 'all') return true;
        if (['1', '2', '3', '4'].includes(String(this.currentFilter))) {
          return String(s.group) === String(this.currentFilter);
        }
        if (this.currentFilter === 'not_today') {
          return !r.days.includes(todayStr);
        }
        if (this.currentFilter === 'full') {
          return r.count >= 5;
        }
        return true;
      });

      if (this.searchQuery) {
        const normalize = (str) => {
          return (str || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D')
            .toLowerCase()
            .replace(/y/g, 'i')
            .trim();
        };
        const qNorm = normalize(this.searchQuery);
        filteredStudents = filteredStudents.filter(s => {
          const sNorm = normalize(s.name);
          return sNorm.includes(qNorm) || s.name.toLowerCase().includes(this.searchQuery.toLowerCase());
        });
      }

      // Container danh sách bình nước / dòng học sinh
      const container = document.getElementById('waterBottlesGrid');
      if (!container) return;

      container.className = this.viewMode === 'list' ? 'water-students-list' : 'water-bottles-grid';

      if (filteredStudents.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 40px 10px; text-align: center; color: #64748B;">
            <div style="font-size: 40px; margin-bottom: 8px;">🔍💧</div>
            <p style="font-size: 15px; font-weight: 700;">Không tìm thấy học sinh nào phù hợp bộ lọc.</p>
          </div>
        `;
        return;
      }

      if (this.viewMode === 'list') {
        // ==========================================
        // CHẾ ĐỘ 1: DANH SÁCH DÒNG NGANG (LIST VIEW) - TÌM NHANH, NẠP 1 CHẠM
        // ==========================================
        container.innerHTML = filteredStudents.map((student, idx) => {
          const groupObj = groups.find(g => g.id === student.group) || { color: '#0EA5E9', name: `Tổ ${student.group || 1}` };
          const record = records[student.id] || { count: 0, days: [] };
          const count = record.count || 0;
          const isFull = count >= 5;
          const isDoneToday = Array.isArray(record.days) && record.days.includes(todayStr);
          const stt = String(idx + 1).padStart(2, '0');

          let avatarSvg = '🦖';
          if (window.EggEvolution && typeof window.EggEvolution.renderPetSVG === 'function') {
            avatarSvg = window.EggEvolution.renderPetSVG(student.stars || 0, student.status || 'active', groupObj.color, 36, student.group, student.id);
          }

          const daySlots = [
            { day: 'T2', name: 'Thứ 2' },
            { day: 'T3', name: 'Thứ 3' },
            { day: 'T4', name: 'Thứ 4' },
            { day: 'T5', name: 'Thứ 5' },
            { day: 'T6', name: 'Thứ 6' }
          ];

          return `
            <div class="water-student-row ${isFull ? 'is-full' : ''}" data-id="${student.id}">
              <div class="water-row-left">
                <span class="water-row-stt">${stt}</span>
                <div class="water-row-avatar">${avatarSvg}</div>
                <div class="water-row-info">
                  <div class="water-row-name" title="${student.name}">${student.name}</div>
                  <span class="water-row-group" style="background: ${groupObj.color};">${groupObj.name}</span>
                </div>
              </div>

              <!-- Thanh 5 nấc nước ngang (Thứ 2 - Thứ 6) -->
              <div class="water-row-progress-container">
                <div class="water-row-bars">
                  ${daySlots.map((d, dIdx) => {
                    const isFilled = dIdx < count;
                    return `
                      <div class="water-row-day-bar ${isFilled ? 'filled' : ''}" title="${d.name}: ${isFilled ? 'Đã uống đủ nước (+5⭐)' : 'Chưa uống'}">
                        <span class="water-day-text">${d.day}</span>
                        <span class="water-day-drop">${isFilled ? '💧' : '○'}</span>
                      </div>
                    `;
                  }).join('')}
                </div>
                <div class="water-row-status-pill ${isFull ? 'full' : ''}">
                  ${isFull ? '👑 5/5 ĐẦY BÌNH!' : `${count}/5 ngày`}
                </div>
              </div>

              <!-- Nút Nạp Nước Hôm Nay -->
              <div class="water-row-actions">
                ${isDoneToday ? `
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <button type="button" class="btn-log-water-row done-today" onclick="window.WaterStation.unlogWater('${student.id}')" title="Hôm nay bé đã uống đủ (+5⭐). Bấm để hoàn tác nếu lỡ bấm nhầm.">
                      ✅ Đã nạp
                    </button>
                    <button type="button" class="btn-water-undo-tiny" onclick="window.WaterStation.unlogWater('${student.id}')" title="Hoàn tác lượt nạp hôm nay">
                      ↩
                    </button>
                  </div>
                ` : `
                  <button type="button" class="btn-log-water-row" onclick="window.WaterStation.logWater('${student.id}')" title="Bấm nạp nước hôm nay cho bé (+5⭐)">
                    💧 Nạp (+5⭐)
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');
      } else {
        // ==========================================
        // CHẾ ĐỘ 2: THẺ BÌNH NƯỚC HOẠT HÌNH (GRID VIEW)
        // ==========================================
        container.innerHTML = filteredStudents.map(student => {
          const groupObj = groups.find(g => g.id === student.group) || { color: '#0EA5E9', name: `Tổ ${student.group || 1}` };
          const record = records[student.id] || { count: 0, days: [] };
          const count = record.count || 0;
          const isFull = count >= 5;
          const isDoneToday = Array.isArray(record.days) && record.days.includes(todayStr);
          const waterHeightPercent = Math.min(100, count * 20);

          let avatarSvg = '🦖';
          if (window.EggEvolution && typeof window.EggEvolution.renderPetSVG === 'function') {
            avatarSvg = window.EggEvolution.renderPetSVG(student.stars || 0, student.status || 'active', groupObj.color, 40, student.group, student.id);
          }

          return `
            <div class="water-student-card ${isFull ? 'is-full' : ''}" data-id="${student.id}">
              <!-- Avatar & Tên bé -->
              <div style="width: 40px; height: 40px; margin-bottom: 2px;">${avatarSvg}</div>
              <div class="water-card-student-name" title="${student.name}">${student.name}</div>
              <span class="water-card-group-tag" style="background: ${groupObj.color};">${groupObj.name}</span>

              <!-- CHIẾC BÌNH NƯỚC HOẠT HÌNH TRONG SUỐT -->
              <div class="water-tumbler">
                <!-- Nắp bình theo màu tổ -->
                <div class="tumbler-cap" style="background: ${groupObj.color};">
                  <div class="tumbler-handle"></div>
                </div>
                <div class="tumbler-neck"></div>

                <!-- Thân bình trong suốt -->
                <div class="tumbler-body">
                  <!-- Vệt bóng kính -->
                  <div class="tumbler-shine"></div>

                  <!-- Vạch chia 5 ngày (Thứ 2 đến Thứ 6) -->
                  <div class="tumbler-ticks">
                    <div class="tumbler-tick"><span class="tumbler-tick-label">T6</span><div class="tumbler-tick-line"></div></div>
                    <div class="tumbler-tick"><span class="tumbler-tick-label">T5</span><div class="tumbler-tick-line"></div></div>
                    <div class="tumbler-tick"><span class="tumbler-tick-label">T4</span><div class="tumbler-tick-line"></div></div>
                    <div class="tumbler-tick"><span class="tumbler-tick-label">T3</span><div class="tumbler-tick-line"></div></div>
                    <div class="tumbler-tick"><span class="tumbler-tick-label">T2</span><div class="tumbler-tick-line"></div></div>
                  </div>

                  <!-- Mực nước dâng theo ngày -->
                  <div class="tumbler-water" style="height: ${waterHeightPercent}%;">
                    <div class="tumbler-wave"></div>
                    <div class="tumbler-bubble b1"></div>
                    <div class="tumbler-bubble b2"></div>
                    <div class="tumbler-bubble b3"></div>
                  </div>
                </div>
              </div>

              <!-- Nhãn Trạng Thái -->
              <div class="water-status-pill ${isFull ? 'full' : ''}">
                ${isFull ? '👑 5/5 ĐẦY BÌNH!' : `Đã uống: ${count}/5 ngày`}
              </div>

              <!-- Nút Nạp Nước Hôm Nay -->
              ${isDoneToday ? `
                <button type="button" class="btn-log-water done-today" onclick="window.WaterStation.unlogWater('${student.id}')" title="Hôm nay đã uống đủ (+5⭐). Bấm vào đây nếu cô muốn hoàn tác khi bấm nhầm.">
                  ✅ Đã nạp hôm nay
                </button>
              ` : `
                <button type="button" class="btn-log-water" onclick="window.WaterStation.logWater('${student.id}')" title="Bấm để nạp nước hôm nay và cộng 5 sao cho bé">
                  💧 Nạp Nước (+5⭐)
                </button>
              `}
            </div>
          `;
        }).join('');
      }
    }
  }

  // Khởi tạo instance duy nhất và gắn ra window
  window.WaterStation = new WaterStation();

})();
