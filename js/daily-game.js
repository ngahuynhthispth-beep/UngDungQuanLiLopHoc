// js/daily-game.js - Mini-Game Cuối Ngày: Oẳn Tù Tì Nhận Kẹo (Dành cho học sinh ngoan)
(function() {
  'use strict';

  class DailyMiniGame {
    constructor() {
      this.modal = null;
      this.modalBody = null;
      this.students = [];
      this.groups = [];
      this.selectedStudentIds = new Set();
      this.wonCandyStudentIds = new Set();
      this.currentStudentId = null;
      this.currentView = 'selection'; // 'selection' | 'arena'
      this.isRoundPlaying = false;
      this.countdownTimer = null;
      this.todayLogsSummary = {}; // studentId -> { pos, neg, hasNeg }

      this.choices = [
        { id: 'rock', name: 'BÚA', emoji: '✊', beats: 'scissors', color: '#EF4444' },
        { id: 'scissors', name: 'KÉO', emoji: '✌️', beats: 'paper', color: '#3B82F6' },
        { id: 'paper', name: 'BAO', emoji: '🖐️', beats: 'rock', color: '#10B981' }
      ];

      this.init();
    }

    init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.bindEvents());
      } else {
        this.bindEvents();
      }
    }

    bindEvents() {
      this.modal = document.getElementById('dailyMiniGameModal');
      this.modalBody = document.getElementById('miniGameModalBody');

      // Nút mở trên Header của cả PC và Mobile
      const btnOpen = document.getElementById('btnDailyMiniGame');
      if (btnOpen) {
        btnOpen.addEventListener('click', () => this.openModal());
      }

      // Nút đóng
      const btnClose = document.getElementById('btnCloseMiniGameModal');
      if (btnClose) {
        btnClose.addEventListener('click', () => this.closeModal());
      }

      if (this.modal) {
        this.modal.addEventListener('click', (e) => {
          if (e.target === this.modal) {
            this.closeModal();
          }
        });
      }
    }

    // Tải dữ liệu và phân tích điểm trong ngày hôm nay
    loadTodayData() {
      const data = (window.StorageManager && window.StorageManager.loadData()) || {};
      this.students = data.students || [];
      this.groups = data.groups || [];

      // Mốc bắt đầu ngày hôm nay 00:00:00
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayMs = startOfToday.getTime();

      this.todayLogsSummary = {};
      let anyLogsToday = false;

      this.students.forEach(s => {
        const todayLogs = (s.logs || []).filter(l => l.timestamp >= startOfTodayMs);
        if (todayLogs.length > 0) anyLogsToday = true;

        const negLogs = todayLogs.filter(l => l.points < 0);
        const posLogs = todayLogs.filter(l => l.points > 0);
        const totalNeg = negLogs.reduce((acc, l) => acc + Math.abs(l.points), 0);
        const totalPos = posLogs.reduce((acc, l) => acc + l.points, 0);

        this.todayLogsSummary[s.id] = {
          hasNegative: negLogs.length > 0,
          totalNegative: totalNeg,
          totalPositive: totalPos,
          logsCount: todayLogs.length
        };
      });

      // Nếu chưa có bạn nào được chọn trước đó: Tự động chọn theo CÁCH 3 (Bé ngoan không bị trừ điểm hôm nay)
      if (this.selectedStudentIds.size === 0) {
        this.students.forEach(s => {
          const info = this.todayLogsSummary[s.id];
          if (!info.hasNegative) {
            this.selectedStudentIds.add(s.id);
          }
        });
      }
    }

    openModal() {
      if (window.soundFx) {
        if (typeof window.soundFx.unmute === 'function') window.soundFx.unmute();
        if (typeof window.soundFx.init === 'function') window.soundFx.init();
      }
      this.loadTodayData();
      this.currentView = 'selection';
      this.render();
      if (this.modal) {
        this.modal.classList.add('active');
      }
    }

    closeModal() {
      if (this.countdownTimer) clearTimeout(this.countdownTimer);
      this.isRoundPlaying = false;
      if (this.modal) {
        this.modal.classList.remove('active');
      }
    }

    render() {
      if (!this.modalBody) return;
      if (this.currentView === 'selection') {
        this.renderSelectionView();
      } else if (this.currentView === 'arena') {
        this.renderArenaView();
      }
    }

    // ==========================================
    // MÀN HÌNH 1: DANH SÁCH DUYỆT THÍ SINH NHẬN KẸO
    // ==========================================
    renderSelectionView() {
      const selectedCount = this.selectedStudentIds.size;
      const totalCount = this.students.length;
      const wonCount = this.wonCandyStudentIds.size;

      let html = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Banner hướng dẫn & Công cụ lọc nhanh -->
          <div style="background: #FFF5F5; border: 1.5px solid #FED7D7; border-radius: 16px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #9B2C2C;">
                🎯 Bước 1: Duyệt danh sách bé ngoan được chơi hôm nay
              </div>
              <div style="font-size: 12px; color: #742A2A; margin-top: 2px;">
                Máy đã tự động chọn các bé <strong>không bị trừ điểm hôm nay</strong>. Cô có thể chạm vào từng bé để Bật/Tắt theo thực tế!
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 13px; font-weight: 800; color: #2B6CB0; background: #EBF8FF; padding: 4px 12px; border-radius: 12px; border: 1px solid #BEE3F8;">
                Đã chọn: <strong style="color: #2B6CB0; font-size: 15px;">${selectedCount}</strong> / ${totalCount} bạn
              </span>
              ${wonCount > 0 ? `
                <span style="font-size: 13px; font-weight: 800; color: #D69E2E; background: #FEFCBF; padding: 4px 12px; border-radius: 12px; border: 1px solid #FAF089;">
                  🍬 Đã nhận kẹo: <strong>${wonCount}</strong>
                </span>
              ` : ''}
            </div>
          </div>

          <!-- Thanh nút thao tác nhanh -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" id="dmgBtnFilterGood" class="btn-header" style="font-size: 12px; font-weight: 800; background: #DCFCE7; color: #15803D; border: 1.5px solid #86EFAC;">
                🟢 Chỉ Chọn Bé Ngoan Hôm Nay
              </button>
              <button type="button" id="dmgBtnSelectAll" class="btn-header" style="font-size: 12px; font-weight: 700;">
                👥 Chọn Cả Lớp (36 bạn)
              </button>
              <button type="button" id="dmgBtnClearAll" class="btn-header" style="font-size: 12px; color: #64748B;">
                ❌ Bỏ chọn hết
              </button>
            </div>

            <!-- Nút Bắt đầu thi đấu Oẳn tù tì -->
            <button type="button" id="dmgBtnStartArena" class="btn-header primary" style="background: linear-gradient(135deg, #FF6B6B, #EE5253); padding: 10px 22px; font-size: 15px; font-weight: 800; border-radius: 20px; box-shadow: 0 4px 15px rgba(238, 82, 83, 0.4);" ${selectedCount === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
              🚀 BẮT ĐẦU VÒNG ĐẤU OẲN TÙ TÌ ▶
            </button>
          </div>

          <!-- Lưới 36 học sinh -->
          <div class="dmg-student-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; max-height: 52vh; overflow-y: auto; padding-right: 4px;">
      `;

      this.students.forEach(student => {
        const isSelected = this.selectedStudentIds.has(student.id);
        const hasWonCandy = this.wonCandyStudentIds.has(student.id);
        const info = this.todayLogsSummary[student.id] || { hasNegative: false, totalNegative: 0, totalPositive: 0 };
        const group = this.groups.find(g => g.id === student.group) || { name: 'Tổ 1', color: '#4F46E5' };

        // Badge trạng thái hôm nay
        let statusBadge = '';
        if (hasWonCandy) {
          statusBadge = `<span style="font-size: 10px; font-weight: 800; background: #FEFCBF; color: #B7791F; padding: 2px 6px; border-radius: 8px;">🍬 Đã nhận kẹo</span>`;
        } else if (info.hasNegative) {
          statusBadge = `<span style="font-size: 10px; font-weight: 800; background: #FED7D7; color: #C53030; padding: 2px 6px; border-radius: 8px;">⚠️ Bị trừ ${info.totalNegative}⭐</span>`;
        } else if (info.totalPositive > 0) {
          statusBadge = `<span style="font-size: 10px; font-weight: 800; background: #C6F6D5; color: #22543D; padding: 2px 6px; border-radius: 8px;">🟢 Ngoan (+${info.totalPositive}⭐)</span>`;
        } else {
          statusBadge = `<span style="font-size: 10px; font-weight: 700; background: #E2E8F0; color: #4A5568; padding: 2px 6px; border-radius: 8px;">Ổn định</span>`;
        }

        const borderStyle = isSelected 
          ? 'border: 2px solid #22C55E; background: #F0FDF4; box-shadow: 0 4px 10px rgba(34, 197, 94, 0.2);' 
          : 'border: 1.5px dashed #CBD5E1; background: #F8FAFC; opacity: 0.55;';

        const checkMark = isSelected 
          ? `<span style="position: absolute; top: 6px; right: 6px; background: #22C55E; color: #FFF; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900;">✓</span>`
          : `<span style="position: absolute; top: 6px; right: 6px; background: #CBD5E1; color: #FFF; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px;">✕</span>`;

        let avatarSvg = '';
        if (window.EggEvolution && typeof window.EggEvolution.renderPetSVG === 'function') {
          avatarSvg = window.EggEvolution.renderPetSVG(student.stars, student.status, group.color);
        } else {
          avatarSvg = `<span style="font-size: 26px;">🐣</span>`;
        }

        html += `
          <div class="dmg-student-item" data-id="${student.id}" style="position: relative; border-radius: 14px; padding: 10px 8px; text-align: center; cursor: pointer; transition: all 0.2s; user-select: none; ${borderStyle}">
            ${checkMark}
            <div style="width: 44px; height: 44px; margin: 0 auto 6px;">
              ${avatarSvg}
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${student.name}">
              ${student.name}
            </div>
            <div style="font-size: 10.5px; color: #64748B; margin-bottom: 4px;">Tổ ${student.group} • ${student.stars} ⭐</div>
            <div>${statusBadge}</div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;

      this.modalBody.innerHTML = html;

      // Gắn sự kiện cho các nút trong màn chọn
      document.getElementById('dmgBtnFilterGood')?.addEventListener('click', () => {
        this.selectedStudentIds.clear();
        this.students.forEach(s => {
          if (!this.todayLogsSummary[s.id]?.hasNegative) {
            this.selectedStudentIds.add(s.id);
          }
        });
        this.renderSelectionView();
      });

      document.getElementById('dmgBtnSelectAll')?.addEventListener('click', () => {
        this.students.forEach(s => this.selectedStudentIds.add(s.id));
        this.renderSelectionView();
      });

      document.getElementById('dmgBtnClearAll')?.addEventListener('click', () => {
        this.selectedStudentIds.clear();
        this.renderSelectionView();
      });

      document.getElementById('dmgBtnStartArena')?.addEventListener('click', () => {
        if (this.selectedStudentIds.size === 0) return;
        this.currentView = 'arena';
        // Chọn bạn đầu tiên chưa nhận kẹo, nếu đã nhận hết thì chọn bạn đầu tiên
        const list = Array.from(this.selectedStudentIds);
        const unplayed = list.find(id => !this.wonCandyStudentIds.has(id));
        this.currentStudentId = unplayed || list[0];
        this.render();
      });

      // Gắn sự kiện click vào từng thẻ học sinh để toggle
      this.modalBody.querySelectorAll('.dmg-student-item').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.id;
          if (this.selectedStudentIds.has(id)) {
            this.selectedStudentIds.delete(id);
          } else {
            this.selectedStudentIds.add(id);
          }
          this.renderSelectionView();
        });
      });
    }

    // ==========================================
    // MÀN HÌNH 2: SÀN ĐẤU OẲN TÙ TÌ CHIẾU TV / BẢNG LỚP
    // ==========================================
    renderArenaView() {
      const selectedList = this.students.filter(s => this.selectedStudentIds.has(s.id));
      if (selectedList.length === 0) {
        this.currentView = 'selection';
        this.render();
        return;
      }

      let currentStudent = selectedList.find(s => s.id === this.currentStudentId);
      if (!currentStudent) {
        currentStudent = selectedList[0];
        this.currentStudentId = currentStudent.id;
      }

      const currentIndex = selectedList.findIndex(s => s.id === currentStudent.id);
      const hasWonCandy = this.wonCandyStudentIds.has(currentStudent.id);
      const group = this.groups.find(g => g.id === currentStudent.group) || { name: 'Tổ 1', color: '#4F46E5' };

      let avatarSvg = '';
      if (window.EggEvolution && typeof window.EggEvolution.renderPetSVG === 'function') {
        avatarSvg = window.EggEvolution.renderPetSVG(currentStudent.stars, currentStudent.status, group.color);
      } else {
        avatarSvg = `<span style="font-size: 50px;">🐣</span>`;
      }

      let html = `
        <div style="display: flex; flex-direction: column; gap: 14px; text-align: center;">
          <!-- Thanh điều hướng trên sàn đấu -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; background: #F8FAFC; border-radius: 16px; padding: 8px 14px; border: 1.5px solid #E2E8F0;">
            <button type="button" id="dmgBtnBackToSelection" class="btn-header" style="font-size: 13px; font-weight: 700;">
              ⬅️ Đổi Danh Sách Bé
            </button>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 13px; font-weight: 800; color: #475569;">
                Thí sinh: <strong>${currentIndex + 1}</strong> / ${selectedList.length}
              </span>
              <span style="font-size: 13px; font-weight: 800; color: #D97706; background: #FEF3C7; padding: 3px 10px; border-radius: 12px;">
                🍬 Đã phát: <strong>${this.wonCandyStudentIds.size}</strong> kẹo
              </span>
            </div>

            <div style="display: flex; gap: 6px;">
              <button type="button" id="dmgBtnPrevStudent" class="btn-header" style="padding: 6px 12px; font-size: 13px;" title="Bé trước đó">◀</button>
              <button type="button" id="dmgBtnRandomStudent" class="btn-header primary" style="background: linear-gradient(135deg, #8B5CF6, #6D28D9); padding: 6px 14px; font-size: 13px; font-weight: 800;" title="Gọi ngẫu nhiên bạn bất kỳ">
                🎲 Gọi Ngẫu Nhiên
              </button>
              <button type="button" id="dmgBtnNextStudent" class="btn-header" style="padding: 6px 12px; font-size: 13px;" title="Bé tiếp theo">▶</button>
            </div>
          </div>

          <!-- KHUNG SÀN ĐẤU ĐỐI KHÁNG 2 BÊN (CHIẾU TV SIÊU TO RỰC RỠ) -->
          <div style="background: linear-gradient(180deg, #FFFFFF 0%, #FFF1F2 100%); border: 3px solid #FECDD3; border-radius: 24px; padding: 20px 16px; box-shadow: 0 10px 25px rgba(244, 63, 94, 0.15);">
            <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 16px;">
              
              <!-- BÊN TRÁI: BÉ HỌC SINH -->
              <div style="flex: 1; min-width: 150px; max-width: 260px; background: #FFFFFF; border-radius: 20px; padding: 14px; border: 2px solid #86EFAC; box-shadow: 0 6px 16px rgba(34, 197, 94, 0.15); text-align: center;">
                <div style="display: inline-block; background: #DCFCE7; color: #15803D; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 10px; margin-bottom: 6px;">
                  🌟 HỌC SINH NGOAN
                </div>
                <div style="width: 72px; height: 72px; margin: 0 auto 6px;">
                  ${avatarSvg}
                </div>
                <div style="font-size: 18px; font-weight: 900; color: #1E293B; margin-bottom: 2px;">
                  ${currentStudent.name}
                </div>
                <div style="font-size: 12px; color: #64748B;">
                  Tổ ${currentStudent.group} • ${currentStudent.stars} ⭐
                </div>
                ${hasWonCandy ? `<div style="margin-top: 6px; font-size: 12px; font-weight: 800; color: #D97706; background: #FEF3C7; padding: 3px 8px; border-radius: 10px; display: inline-block;">🍬 ĐÃ NHẬN KẸO</div>` : ''}

                <!-- Tay của bé xuất chiêu -->
                <div id="dmgPlayerHand" style="font-size: 64px; height: 80px; display: flex; align-items: center; justify-content: center; margin-top: 10px; transition: transform 0.2s;">
                  ✊
                </div>
                <div style="font-size: 13px; font-weight: 800; color: #15803D;" id="dmgPlayerChoiceLabel">
                  Chờ bé chọn...
                </div>
              </div>

              <!-- Ở GIỮA: BIỂU TƯỢNG VS & ĐẾM NGƯỢC -->
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 110px;">
                <div id="dmgVsBadge" style="font-size: 32px; font-weight: 900; color: #E11D48; text-shadow: 0 2px 8px rgba(225, 29, 72, 0.3); animation: pulseRecording 1.5s infinite;">
                  ⚔️ VS ⚔️
                </div>
                <div id="dmgCountdownText" style="font-size: 14px; font-weight: 800; color: #6D28D9; min-height: 24px; margin-top: 4px;">
                  Oẳn tù tì nhận kẹo!
                </div>
              </div>

              <!-- BÊN PHẢI: MASCOT KHỦNG LONG AI CỦA LỚP -->
              <div style="flex: 1; min-width: 150px; max-width: 260px; background: #FFFFFF; border-radius: 20px; padding: 14px; border: 2px solid #FBCFE8; box-shadow: 0 6px 16px rgba(236, 72, 153, 0.15); text-align: center;">
                <div style="display: inline-block; background: #FCE7F3; color: #BE185D; font-size: 11px; font-weight: 800; padding: 2px 10px; border-radius: 10px; margin-bottom: 6px;">
                  🦖 ĐỐI THỦ CỦA LỚP 1/8
                </div>
                <div style="font-size: 60px; height: 72px; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px;">
                  🦖
                </div>
                <div style="font-size: 18px; font-weight: 900; color: #831843; margin-bottom: 2px;">
                  Khủng Long AI
                </div>
                <div style="font-size: 12px; color: #64748B;">
                  Người Giữ Túi Kẹo 🍬
                </div>
                <div style="margin-top: 6px; font-size: 12px; font-weight: 800; color: #BE185D; background: #FCE7F3; padding: 3px 8px; border-radius: 10px; display: inline-block;">
                  Tỷ lệ vui: Dễ thắng!
                </div>

                <!-- Tay của Khủng long xuất chiêu -->
                <div id="dmgAiHand" style="font-size: 64px; height: 80px; display: flex; align-items: center; justify-content: center; margin-top: 10px; transition: transform 0.2s;">
                  ✊
                </div>
                <div style="font-size: 13px; font-weight: 800; color: #BE185D;" id="dmgAiChoiceLabel">
                  Đang chờ bé ra đòn...
                </div>
              </div>

            </div>

            <!-- BẢN TIN KẾT QUẢ VÒNG ĐẤU -->
            <div id="dmgResultBanner" style="display: none; margin-top: 16px; padding: 14px; border-radius: 16px; font-size: 16px; font-weight: 900; animation: bounceIn 0.5s ease;">
              <!-- Nội dung kết quả render động -->
            </div>
          </div>

          <!-- BÀN PHÍM 3 NÚT BẤM CHO BÉ (BÚA - KÉO - BAO) -->
          <div style="background: #FFFFFF; border: 2px solid #E2E8F0; border-radius: 20px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="font-size: 13px; font-weight: 800; color: #64748B; margin-bottom: 10px;">
              👇 Bé hãy chạm vào 1 trong 3 nút dưới đây để ra đòn (hoặc cô bấm theo lời bé nói):
            </div>
            <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
              <button type="button" class="dmg-choice-btn" data-choice="rock" style="background: linear-gradient(135deg, #EF4444, #DC2626); color: #FFF; border: none; padding: 12px 28px; border-radius: 22px; font-size: 16px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35); transition: transform 0.15s;">
                ✊ BÚA
              </button>
              <button type="button" class="dmg-choice-btn" data-choice="scissors" style="background: linear-gradient(135deg, #3B82F6, #2563EB); color: #FFF; border: none; padding: 12px 28px; border-radius: 22px; font-size: 16px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35); transition: transform 0.15s;">
                ✌️ KÉO
              </button>
              <button type="button" class="dmg-choice-btn" data-choice="paper" style="background: linear-gradient(135deg, #10B981, #059669); color: #FFF; border: none; padding: 12px 28px; border-radius: 22px; font-size: 16px; font-weight: 900; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35); transition: transform 0.15s;">
                🖐️ BAO
              </button>
            </div>
          </div>
        </div>
      `;

      this.modalBody.innerHTML = html;

      // Gắn sự kiện các nút điều hướng
      document.getElementById('dmgBtnBackToSelection')?.addEventListener('click', () => {
        this.currentView = 'selection';
        this.render();
      });

      document.getElementById('dmgBtnPrevStudent')?.addEventListener('click', () => {
        const prevIdx = (currentIndex - 1 + selectedList.length) % selectedList.length;
        this.currentStudentId = selectedList[prevIdx].id;
        this.renderArenaView();
      });

      document.getElementById('dmgBtnNextStudent')?.addEventListener('click', () => {
        const nextIdx = (currentIndex + 1) % selectedList.length;
        this.currentStudentId = selectedList[nextIdx].id;
        this.renderArenaView();
      });

      document.getElementById('dmgBtnRandomStudent')?.addEventListener('click', () => {
        // Ưu tiên chọn các bạn chưa nhận kẹo
        const unplayed = selectedList.filter(s => !this.wonCandyStudentIds.has(s.id));
        const pool = unplayed.length > 0 ? unplayed : selectedList;
        const randomStudent = pool[Math.floor(Math.random() * pool.length)];
        this.currentStudentId = randomStudent.id;
        this.renderArenaView();
      });

      // Gắn sự kiện 3 nút ra đòn Búa - Kéo - Bao
      this.modalBody.querySelectorAll('.dmg-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (this.isRoundPlaying) return;
          const choiceId = btn.dataset.choice;
          this.playRound(choiceId, currentStudent);
        });
      });
    }

    // ==========================================
    // LOGIC ĐẤU OẲN TÙ TÌ & HIỆU ỨNG ĐẾM NGƯỢC
    // ==========================================
    playRound(playerChoiceId, currentStudent) {
      if (this.isRoundPlaying) return;
      this.isRoundPlaying = true;

      const playerHandEl = document.getElementById('dmgPlayerHand');
      const aiHandEl = document.getElementById('dmgAiHand');
      const countdownText = document.getElementById('dmgCountdownText');
      const playerLabel = document.getElementById('dmgPlayerChoiceLabel');
      const aiLabel = document.getElementById('dmgAiChoiceLabel');
      const resultBanner = document.getElementById('dmgResultBanner');

      if (resultBanner) resultBanner.style.display = 'none';

      // Quyết định đòn của AI:
      // Để tạo động lực cho học sinh lớp 1 nhận kẹo, ưu tiên tỷ lệ thắng:
      // ~75% Bé thắng, ~15% Hòa, ~10% Thua (nếu thua vẫn cho nút Đấu Lại ngay)
      const playerChoiceObj = this.choices.find(c => c.id === playerChoiceId);
      const losingChoiceId = playerChoiceObj.beats; // Cái mà người chơi thắng
      const winningChoiceId = this.choices.find(c => c.beats === playerChoiceId).id; // Cái thắng người chơi

      let aiChoiceId = losingChoiceId; // Mặc định bé thắng
      const rand = Math.random();
      if (rand < 0.75) {
        aiChoiceId = losingChoiceId; // 75% Bé Thắng
      } else if (rand < 0.90) {
        aiChoiceId = playerChoiceId; // 15% Hòa
      } else {
        aiChoiceId = winningChoiceId; // 10% Thua
      }

      const aiChoiceObj = this.choices.find(c => c.id === aiChoiceId);

      // Bắt đầu đếm ngược 3 nhịp kịch tính
      let count = 3;
      const countPhrases = ['Oẳn tù tì...', 'Ra cái gì...', 'Ra cái này!'];

      if (playerHandEl) playerHandEl.classList.add('dmg-hand-animating');
      if (aiHandEl) aiHandEl.classList.add('dmg-hand-animating');

      const doCountStep = () => {
        if (window.soundFx && typeof window.soundFx.playWheelTick === 'function') {
          window.soundFx.playWheelTick();
        }

        if (countdownText) {
          countdownText.innerHTML = `<span style="font-size: 18px; font-weight: 900; color: #EF4444;">${countPhrases[3 - count]} (${count})</span>`;
        }

        count--;
        if (count >= 0) {
          this.countdownTimer = setTimeout(doCountStep, 450);
        } else {
          // Mở bài!
          this.resolveRound(playerChoiceObj, aiChoiceObj, currentStudent);
        }
      };

      doCountStep();
    }

    resolveRound(playerChoice, aiChoice, currentStudent) {
      this.isRoundPlaying = false;

      const playerHandEl = document.getElementById('dmgPlayerHand');
      const aiHandEl = document.getElementById('dmgAiHand');
      const countdownText = document.getElementById('dmgCountdownText');
      const playerLabel = document.getElementById('dmgPlayerChoiceLabel');
      const aiLabel = document.getElementById('dmgAiChoiceLabel');
      const resultBanner = document.getElementById('dmgResultBanner');

      if (playerHandEl) {
        playerHandEl.classList.remove('dmg-hand-animating');
        playerHandEl.textContent = playerChoice.emoji;
      }
      if (aiHandEl) {
        aiHandEl.classList.remove('dmg-hand-animating');
        aiHandEl.textContent = aiChoice.emoji;
      }

      if (playerLabel) playerLabel.textContent = `Bé ra: ${playerChoice.name}`;
      if (aiLabel) aiLabel.textContent = `Khủng long ra: ${aiChoice.name}`;

      if (countdownText) countdownText.textContent = 'ĐÃ MỞ BÀI!';

      // Xác định kết quả
      let outcome = 'tie'; // 'win' | 'tie' | 'lose'
      if (playerChoice.id === aiChoice.id) {
        outcome = 'tie';
      } else if (playerChoice.beats === aiChoice.id) {
        outcome = 'win';
      } else {
        outcome = 'lose';
      }

      if (!resultBanner) return;
      resultBanner.style.display = 'block';

      if (outcome === 'win') {
        // BÉ THẮNG
        this.wonCandyStudentIds.add(currentStudent.id);

        if (window.soundFx) {
          if (typeof window.soundFx.playCheer === 'function') window.soundFx.playCheer();
          if (typeof window.soundFx.playHatch === 'function') window.soundFx.playHatch();
        }

        // Kích hoạt pháo hoa kẹo bay đầy màn hình
        this.triggerCandyBurst();

        // Phản hồi giọng nói AI
        if (window.VoiceAssistant && typeof window.VoiceAssistant.speakFeedback === 'function') {
          setTimeout(() => {
            window.VoiceAssistant.speakFeedback(`Chúc mừng ${currentStudent.name} đã thắng và nhận kẹo ngọt!`);
          }, 300);
        }

        resultBanner.style.background = '#DCFCE7';
        resultBanner.style.border = '2px solid #86EFAC';
        resultBanner.style.color = '#15803D';
        resultBanner.innerHTML = `
          <div style="font-size: 24px; margin-bottom: 4px;">🎉🍬🦖🏆</div>
          <div style="font-size: 20px; font-weight: 900; color: #166534;">
            HOAN HÔ! ${currentStudent.name} ĐÃ THẮNG RỒI!
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #15803D; margin-top: 4px;">
            Bé xuất sắc nhận được <strong>1 phần kẹo ngọt 🍬</strong> từ cô giáo!
          </div>
          <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <button type="button" id="dmgBtnNextAfterWin" class="btn-header primary" style="background: linear-gradient(135deg, #10B981, #059669); font-size: 14px; padding: 10px 20px; font-weight: 800; border-radius: 18px;">
              🎲 Gọi Bạn Tiếp Theo ▶
            </button>
            <button type="button" id="dmgBtnReplayAfterWin" class="btn-header" style="font-size: 13px; font-weight: 700; border-radius: 18px;">
              🔄 Đấu Thêm Ván Nữa
            </button>
          </div>
        `;

        document.getElementById('dmgBtnNextAfterWin')?.addEventListener('click', () => {
          this.pickNextStudent();
        });
        document.getElementById('dmgBtnReplayAfterWin')?.addEventListener('click', () => {
          this.renderArenaView();
        });

      } else if (outcome === 'tie') {
        // HÒA
        if (window.soundFx && typeof window.soundFx.playStar === 'function') {
          window.soundFx.playStar();
        }

        resultBanner.style.background = '#FEF3C7';
        resultBanner.style.border = '2px solid #FCD34D';
        resultBanner.style.color = '#92400E';
        resultBanner.innerHTML = `
          <div style="font-size: 20px; margin-bottom: 2px;">🤝🤝🤝</div>
          <div style="font-size: 18px; font-weight: 900;">
            HÒA NHAU RỒI! (Cùng ra ${playerChoice.name})
          </div>
          <div style="font-size: 13px; margin-top: 2px;">
            Bé và Khủng Long ngang sức ngang tài! Hãy ra đòn lại để phân thắng bại nhé!
          </div>
          <div style="margin-top: 10px;">
            <button type="button" id="dmgBtnRetryTie" class="btn-header primary" style="background: linear-gradient(135deg, #F59E0B, #D97706); font-size: 14px; padding: 8px 18px; font-weight: 800; border-radius: 18px;">
              ⚡ Ra Đòn Lại Ngay!
            </button>
          </div>
        `;

        document.getElementById('dmgBtnRetryTie')?.addEventListener('click', () => {
          this.renderArenaView();
        });

      } else {
        // BÉ THUA
        resultBanner.style.background = '#FEE2E2';
        resultBanner.style.border = '2px solid #FCA5A5';
        resultBanner.style.color = '#991B1B';
        resultBanner.innerHTML = `
          <div style="font-size: 20px; margin-bottom: 2px;">🦖😅</div>
          <div style="font-size: 18px; font-weight: 900;">
            TIẾC QUÁ! Khủng Long ra ${aiChoice.name} rồi!
          </div>
          <div style="font-size: 13px; margin-top: 2px;">
            Đừng buồn nhé! Cô cho bé thêm 1 cơ hội để phục thù nè!
          </div>
          <div style="margin-top: 10px; display: flex; gap: 8px; justify-content: center;">
            <button type="button" id="dmgBtnRetryLose" class="btn-header primary" style="background: linear-gradient(135deg, #EF4444, #DC2626); font-size: 14px; padding: 8px 18px; font-weight: 800; border-radius: 18px;">
              🔄 Cho Bé Đấu Lại Ngay
            </button>
            <button type="button" id="dmgBtnSkipToNext" class="btn-header" style="font-size: 13px; font-weight: 700; border-radius: 18px;">
              Bạn Tiếp Theo ➡️
            </button>
          </div>
        `;

        document.getElementById('dmgBtnRetryLose')?.addEventListener('click', () => {
          this.renderArenaView();
        });
        document.getElementById('dmgBtnSkipToNext')?.addEventListener('click', () => {
          this.pickNextStudent();
        });
      }
    }

    pickNextStudent() {
      const selectedList = this.students.filter(s => this.selectedStudentIds.has(s.id));
      if (selectedList.length === 0) return;

      // Tìm bạn chưa nhận kẹo
      const unplayed = selectedList.filter(s => !this.wonCandyStudentIds.has(s.id));
      if (unplayed.length > 0) {
        this.currentStudentId = unplayed[0].id;
      } else {
        // Đã chơi hết một vòng, chọn bạn kế tiếp theo thứ tự
        const currentIndex = selectedList.findIndex(s => s.id === this.currentStudentId);
        const nextIdx = (currentIndex + 1) % selectedList.length;
        this.currentStudentId = selectedList[nextIdx].id;
      }
      this.renderArenaView();
    }

    // Hiệu ứng kẹo bay chúc mừng (100% offline không cần CDN)
    triggerCandyBurst() {
      const candies = ['🍬', '🍭', '🍫', '✨', '🎉', '⭐', '🎈'];
      const count = 35;

      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'dmg-candy-particle';
        el.textContent = candies[Math.floor(Math.random() * candies.length)];
        el.style.left = `${Math.random() * 92 + 4}vw`;
        el.style.top = `${Math.random() * 20 + 10}vh`;
        el.style.fontSize = `${Math.random() * 16 + 20}px`;
        el.style.animationDuration = `${Math.random() * 1.2 + 1.5}s`;
        el.style.animationDelay = `${Math.random() * 0.3}s`;

        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2800);
      }
    }
  }

  // Khởi tạo và gắn vào window
  window.DailyMiniGame = new DailyMiniGame();

})();
