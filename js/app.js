// js/app.js - Main Application Controller for Teachers
document.addEventListener('DOMContentLoaded', () => {
  StorageManager.init();

  let state = {
    data: StorageManager.loadData(),
    activeTab: 'students', // 'students' or 'groups'
    selectedStudentId: null,
    selectedGroupId: null,
    timerInterval: null,
    timerSecondsLeft: 0
  };

  const noiseMeter = new NoiseMeter();
  let luckyWheel = null;

  // Elements
  const tabStudentsBtn = document.getElementById('tabStudentsBtn');
  const tabGroupsBtn = document.getElementById('tabGroupsBtn');
  const studentsContainer = document.getElementById('studentsContainer');
  const groupsContainer = document.getElementById('groupsContainer');

  // Modals
  const actionModal = document.getElementById('actionModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const noiseModal = document.getElementById('noiseModal');
  const wheelModal = document.getElementById('wheelModal');
  const timerModal = document.getElementById('timerModal');
  const parentQrModal = document.getElementById('parentQrModal');
  const cardPreviewModal = document.getElementById('cardPreviewModal');

  // Top buttons
  const btnAllReward = document.getElementById('btnAllReward');
  const btnNoiseMeter = document.getElementById('btnNoiseMeter');
  const btnWheel = document.getElementById('btnWheel');
  const btnTimer = document.getElementById('btnTimer');
  const btnMute = document.getElementById('btnMute');

  // --- Audio Mute Init ---
  function updateMuteBtn() {
    if (!btnMute) return;
    const isMuted = window.soundFx ? window.soundFx.isMuted : (localStorage.getItem('class_app_muted') === 'true');
    if (isMuted) {
      btnMute.innerHTML = '🔇 <span>Đã tắt âm</span>';
    } else {
      btnMute.innerHTML = '🔊 <span>Âm thanh</span>';
    }
  }
  updateMuteBtn();

  if (btnMute) {
    btnMute.addEventListener('click', () => {
      if (window.soundFx) {
        window.soundFx.toggleMute();
      }
      updateMuteBtn();
    });
  }

  // --- Confetti / Star Particle Animation ---
  function createFloatingStar(x, y, icon = '⭐') {
    const star = document.createElement('div');
    star.className = 'floating-star';
    star.textContent = icon;
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    document.body.appendChild(star);
    setTimeout(() => star.remove(), 1200);
  }

  // --- View Mode & Search State ---
  const isMobilePage = window.location.pathname.includes('mobile.html') || document.body.classList.contains('mobile-app-page');
  const isMiniScreen = window.innerWidth <= 640;
  let currentStudentViewMode = (isMobilePage || isMiniScreen) 
    ? 'compact' 
    : (localStorage.getItem('vltk_pc_student_view_mode') || 'grid'); // Trên máy tính màn to mặc định grid, màn nhỏ/mini mặc định danh bạ gọn
  let currentSearchQuery = '';
  let currentGroupFilter = 'all'; // Mặc định hiển thị tất cả các tổ

  const btnViewCompact = document.getElementById('btnViewCompact');
  const btnViewGrid = document.getElementById('btnViewGrid');
  const inputSearchStudent = document.getElementById('inputSearchStudent');
  const btnClearSearchStudent = document.getElementById('btnClearSearchStudent');

  const scrollNavControls = document.getElementById('scrollNavControls');
  const btnScrollLeft = document.getElementById('btnScrollLeft');
  const btnScrollRight = document.getElementById('btnScrollRight');

  function updateViewToggleButtons() {
    if (btnViewCompact && btnViewGrid) {
      if (currentStudentViewMode === 'compact') {
        btnViewCompact.classList.add('active');
        btnViewGrid.classList.remove('active');
        if (scrollNavControls) scrollNavControls.style.display = 'flex';
      } else {
        btnViewGrid.classList.add('active');
        btnViewCompact.classList.remove('active');
        if (scrollNavControls) scrollNavControls.style.display = 'none';
      }
    }
  }

  if (btnScrollLeft) {
    btnScrollLeft.addEventListener('click', () => {
      studentsContainer.scrollBy({ left: -310, behavior: 'smooth' });
    });
  }

  if (btnScrollRight) {
    btnScrollRight.addEventListener('click', () => {
      studentsContainer.scrollBy({ left: 310, behavior: 'smooth' });
    });
  }

  if (btnViewCompact) {
    btnViewCompact.addEventListener('click', () => {
      currentStudentViewMode = 'compact';
      if (!isMobilePage) localStorage.setItem('vltk_pc_student_view_mode', 'compact');
      updateViewToggleButtons();
      renderStudents();
    });
  }

  if (btnViewGrid) {
    btnViewGrid.addEventListener('click', () => {
      currentStudentViewMode = 'grid';
      if (!isMobilePage) localStorage.setItem('vltk_pc_student_view_mode', 'grid');
      updateViewToggleButtons();
      renderStudents();
    });
  }

  if (inputSearchStudent) {
    inputSearchStudent.addEventListener('input', (e) => {
      currentSearchQuery = (e.target.value || '').trim().toLowerCase();
      if (btnClearSearchStudent) {
        btnClearSearchStudent.style.display = currentSearchQuery ? 'block' : 'none';
      }
      renderStudents();
    });
  }

  if (btnClearSearchStudent) {
    btnClearSearchStudent.addEventListener('click', () => {
      inputSearchStudent.value = '';
      currentSearchQuery = '';
      btnClearSearchStudent.style.display = 'none';
      renderStudents();
    });
  }

  // --- Hàm áp dụng điểm linh hoạt: Dùng chung cho nút cộng/trừ nhanh mức 10, tự đánh số và modal ---
  function applyStudentPoints(studentId, points, reason = 'Khen thưởng', icon = '⭐', targetEl = null) {
    const student = (state.data.students || []).find(s => s.id === studentId);
    if (!student) return;

    if (points > 0) {
      if ((student.stars || 0) >= 200) {
        showSyncToast(`🏆 Bé <strong>${student.name}</strong> đã đạt 200 ⭐ (Mốc Đặc Biệt)!`, '🎁');
        openMilestoneChoiceModal(student.id, 200);
        return;
      }
      if ((student.stars || 0) >= 100 && !student.accumulateBonus) {
        showSyncToast(`🐣 Bé <strong>${student.name}</strong> đã đạt 100 ⭐! Mời bé chọn quay quà hoặc tích điểm cộng dồn.`, '🎁');
        openMilestoneChoiceModal(student.id, 100);
        return;
      }
    }

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      createFloatingStar(rect.left + rect.width / 2, rect.top, points > 0 ? (icon || '⭐') : '⚠️');
    }

    if (points < 0) {
      if (window.soundFx && typeof window.soundFx.playPenalty === 'function') {
        window.soundFx.playPenalty();
      }
    } else {
      if (window.soundFx && typeof window.soundFx.playStar === 'function') {
        window.soundFx.playStar();
      }
    }

    const sign = points > 0 ? `+${points}` : `${points}`;
    showSyncToast(`${points > 0 ? '🌟' : '⚠️'} Bé <strong>${student.name}</strong>: ${sign} ⭐ (${reason})`, points > 0 ? '✨' : '⚠️');

    const res = StorageManager.addPointsToStudent(studentId, points, reason, icon);
    refreshData(res ? res.data : null);

    const updated = (state.data.students || []).find(s => s.id === studentId);
    if (updated && points > 0) {
      if (updated.stars >= 200) {
        showSyncToast(`🏆 Chúc mừng bé <strong>${updated.name}</strong> đã đạt mốc 200 ⭐ SIÊU ĐẶC BIỆT!`, '🏆');
        openMilestoneChoiceModal(updated.id, 200);
      } else if (updated.stars >= 100 && !updated.accumulateBonus) {
        showSyncToast(`🎉 Chúc mừng bé <strong>${updated.name}</strong> đã nở trứng (100 ⭐)!`, '🏆');
        openMilestoneChoiceModal(updated.id, 100);
      }
    }
  }

  // --- Render Thanh Chọn Tổ Dạng Tab/Chips Như Danh Bạ Điện Thoại ---
  function renderGroupFilterChips(groups, students) {
    const container = document.getElementById('contactFilterChips');
    if (!container) return;

    const totalStudents = (students || []).length;
    let html = `
      <button type="button" class="btn-group-chip ${currentGroupFilter === 'all' ? 'active' : ''}" data-group="all">
        <span class="chip-mascot">🌟</span>
        <span class="chip-name">Tất cả</span>
        <span class="chip-badge">${totalStudents}</span>
      </button>
    `;

    (groups || []).forEach(group => {
      const count = (students || []).filter(s => s.group === group.id).length;
      const isActive = currentGroupFilter === String(group.id);
      html += `
        <button type="button" class="btn-group-chip ${isActive ? 'active' : ''}" data-group="${group.id}">
          <span class="chip-mascot">${group.mascot || '🚩'}</span>
          <span class="chip-name">${(group.name || '').split('-')[0].trim()}</span>
          <span class="chip-badge">${count}</span>
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.btn-group-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        currentGroupFilter = btn.dataset.group;
        renderStudents();
      });
    });
  }

  // --- Render Individual Students View ---
  function renderStudents() {
    const { students, groups } = state.data;
    studentsContainer.innerHTML = '';

    renderGroupFilterChips(groups || [], students || []);

    const hatchedStudents = (students || []).filter(s => (s.stars || 0) >= 100);
    const hatchedBadgeCount = document.getElementById('hatchedBadgeCount');
    if (hatchedBadgeCount) hatchedBadgeCount.textContent = hatchedStudents.length;

    const todayDateKey = StorageManager.getTodayDateString ? StorageManager.getTodayDateString() : new Date().toISOString().split('T')[0];
    const hwSubmittedToday = (students || []).filter(s => s.homeworkRecords && s.homeworkRecords[todayDateKey] && s.homeworkRecords[todayDateKey].totalStars > 0);
    const hwBadgeCount = document.getElementById('hwBadgeCount');
    if (hwBadgeCount) hwBadgeCount.textContent = hwSubmittedToday.length;

    if (typeof parentHomeworkSummaryModal !== 'undefined' && parentHomeworkSummaryModal && parentHomeworkSummaryModal.classList.contains('active')) {
      renderParentHomeworkSummary(currentHwViewDate, currentHwViewGroup);
    }

    updateViewToggleButtons();

    // Lọc theo tổ nếu giáo viên chọn tổ
    let displayStudents = students || [];
    if (currentGroupFilter && currentGroupFilter !== 'all') {
      const gId = parseInt(currentGroupFilter, 10);
      displayStudents = displayStudents.filter(s => s.group === gId);
    }

    // Lọc theo từ khóa tìm kiếm nhanh
    if (currentSearchQuery) {
      displayStudents = displayStudents.filter(s => (s.name || '').toLowerCase().includes(currentSearchQuery));
    }

    if (displayStudents.length === 0) {
      studentsContainer.className = '';
      studentsContainer.innerHTML = `
        <div style="padding: 36px 20px; text-align: center; color: #64748B; font-size: 14px; background: #FFFFFF; border-radius: 20px; border: 2px dashed #CBD5E1; margin: 20px auto; max-width: 480px;">
          🔍 Không tìm thấy học sinh nào khớp với bộ lọc hiện tại.
        </div>
      `;
      return;
    }

    if (currentStudentViewMode === 'compact') {
      renderCompactStudentsView(displayStudents, groups);
    } else {
      renderGridStudentsView(displayStudents, groups);
    }
  }

  // Giao diện 1: Danh Bạ Điện Thoại Ngắn Gọn (Dễ tìm tên và cho điểm siêu tốc)
  function renderCompactStudentsView(displayStudents, groups) {
    studentsContainer.className = 'students-compact-wrapper';

    const columnsContainer = document.createElement('div');
    columnsContainer.className = 'compact-columns-container';

    // Xác định danh sách tổ cần hiển thị
    let targetGroups = groups || [];
    if (currentGroupFilter && currentGroupFilter !== 'all') {
      const gId = parseInt(currentGroupFilter, 10);
      targetGroups = targetGroups.filter(g => g.id === gId);
    }

    targetGroups.forEach(group => {
      const groupStudents = displayStudents.filter(s => s.group === group.id);
      if (groupStudents.length === 0) return;

      const col = document.createElement('div');
      col.className = 'compact-group-column';
      col.style.borderColor = `${group.color}40`;
      col.style.borderTop = `4px solid ${group.color}`;

      col.innerHTML = `
        <div class="compact-group-header" style="background: ${group.color};">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>${group.mascot}</span>
            <span>${group.name.split('-')[0].trim()}</span>
            <span style="font-size: 11px; opacity: 0.9; font-weight: 600;">(${groupStudents.length} bé)</span>
          </div>
          <div style="background: rgba(255, 255, 255, 0.25); padding: 1px 8px; border-radius: 12px; font-size: 12px;">
            ⭐ ${group.stars}
          </div>
        </div>
        <div class="compact-students-list"></div>
      `;

      const listContainer = col.querySelector('.compact-students-list');

      groupStudents.forEach(student => {
        const isSleeping = student.status === 'sleeping';
        const stage = window.EggEvolution.getStage(student.stars);
        const globalIdx = (state.data.students || []).findIndex(s => s.id === student.id) + 1;

        const row = document.createElement('div');
        row.className = `student-compact-row ${isSleeping ? 'sleeping' : ''}`;
        row.dataset.id = student.id;

        row.innerHTML = `
          <span class="compact-stt">${globalIdx}</span>
          <span class="compact-pet-mini" title="${isSleeping ? '💤 Đang tĩnh tâm' : stage.title}">
            ${isSleeping ? '💤' : window.EggEvolution.renderPetSVG(student.stars, student.status, group.color)}
          </span>
          <div class="compact-student-info">
            <div class="compact-name-row">
              <span class="compact-student-name">${student.name}</span>
              ${student.stars >= 100 ? `<span class="compact-hatched-tag">🎉 Nở</span>` : ''}
            </div>
            <span class="compact-group-subtag" style="color: ${group.color};">
              ${group.mascot} ${group.name.split('-')[0].trim()}
            </span>
          </div>

          <div class="compact-score-controls">
            <!-- Nút giảm nhanh 10 điểm (mức 10) -->
            <button type="button" class="btn-compact-delta btn-delta-minus10" data-id="${student.id}" title="Trừ -10 ⭐ cho ${student.name}">
              -10
            </button>

            <!-- Badge hiển thị số sao & Chạm để tự đánh số điểm -->
            <div class="compact-stars-badge btn-compact-open-custom" data-id="${student.id}" title="Hiện có: ${student.stars} ⭐ - Chạm để tự gõ số điểm">
              ⭐ ${student.stars}
            </div>

            <!-- Nút tăng nhanh 10 điểm (mức 10) -->
            <button type="button" class="btn-compact-delta btn-delta-plus10" data-id="${student.id}" title="Cộng +10 ⭐ cho ${student.name}">
              +10
            </button>

            <!-- Nút mở nhanh bộ gõ tự nhập số hoặc hành vi -->
            <button type="button" class="btn-compact-dial" data-id="${student.id}" title="Tự đánh số điểm hoặc khen thưởng chi tiết">
              ⚡
            </button>
          </div>
        `;

        // Click row (ngoài các nút điểm) mở modal chi tiết
        row.addEventListener('click', (e) => {
          if (e.target.closest('.compact-score-controls')) return;
          if (student.stars >= 200) {
            openMilestoneChoiceModal(student.id, 200);
            return;
          }
          if (student.stars >= 100 && !student.accumulateBonus) {
            openMilestoneChoiceModal(student.id, 100);
            return;
          }
          openActionModal(student.id);
        });

        // Nút trừ nhanh -10 điểm
        const minus10Btn = row.querySelector('.btn-delta-minus10');
        if (minus10Btn) {
          minus10Btn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyStudentPoints(student.id, -10, 'Nhắc nhở rèn luyện (-10 ⭐)', '⚠️', e.target);
          });
        }

        // Nút cộng nhanh +10 điểm
        const plus10Btn = row.querySelector('.btn-delta-plus10');
        if (plus10Btn) {
          plus10Btn.addEventListener('click', (e) => {
            e.stopPropagation();
            applyStudentPoints(student.id, 10, 'Khen thưởng tích cực (+10 ⭐)', '⭐', e.target);
          });
        }

        // Chạm vào badge số sao hoặc nút ⚡ để mở nhanh bàn phím tự đánh số điểm
        const customScoreBtn = row.querySelector('.btn-compact-open-custom');
        const dialBtn = row.querySelector('.btn-compact-dial');
        const openCustomFn = (e) => {
          e.stopPropagation();
          openQuickScoreModal(student.id);
        };
        if (customScoreBtn) customScoreBtn.addEventListener('click', openCustomFn);
        if (dialBtn) dialBtn.addEventListener('click', openCustomFn);

        listContainer.appendChild(row);
      });

      columnsContainer.appendChild(col);
    });

    studentsContainer.appendChild(columnsContainer);
  }


  // Giao diện 2: Thẻ Linh Thú To (Sinh động cho các bé ngắm tiến hóa)
  function renderGridStudentsView(displayStudents, groups) {
    studentsContainer.className = 'students-grid';

    displayStudents.forEach(student => {
      const group = groups.find(g => g.id === student.group) || { name: 'Tổ 1', color: '#FF6B6B' };
      const stage = window.EggEvolution.getStage(student.stars);
      const milestone = window.EggEvolution.getNextMilestone(student.stars);
      const isSleeping = student.status === 'sleeping';

      const card = document.createElement('div');
      card.className = `student-card ${isSleeping ? 'sleeping' : ''}`;
      card.dataset.id = student.id;

      let hatchedBadgeHtml = '';
      if (student.stars >= 100) {
        hatchedBadgeHtml = `<div class="hatched-success-badge" title="Đã nở trứng thành công! Đang tiếp tục tích sao lớn lên">🎉 Đã Nở Linh Thú</div>`;
      }

      card.innerHTML = `
        <div class="group-badge" style="background: ${group.color}">
          ${group.name.split('-')[0].trim()}
        </div>

        <div class="card-top-actions">
          <button class="btn-icon-mini btn-edit-student" title="Sửa tên học sinh" data-id="${student.id}">
            ✏️
          </button>
          <button class="btn-icon-mini btn-delete-student" title="Xóa học sinh này" data-id="${student.id}" style="color: #E11D48;">
            🗑️
          </button>
          <button class="btn-icon-mini btn-qr-parent" title="Mã QR Phụ Huynh" data-id="${student.id}">
            📱
          </button>
          <button class="btn-icon-mini btn-zalo-card" title="Xuất Phiếu Bé Ngoan Zalo" data-id="${student.id}">
            📜
          </button>
        </div>

        <div class="pet-avatar-wrapper">
          ${window.EggEvolution.renderPetSVG(student.stars, student.status, group.color)}
        </div>

        <div class="student-name">${student.name}</div>
        <div class="stage-title">${isSleeping ? '💤 Đang tĩnh tâm' : stage.title}</div>

        <div class="stars-display card-stars-click" data-id="${student.id}" title="Hiện có: ${student.stars} ⭐ - Chạm để tự gõ số điểm" style="cursor: pointer;">
          <span>⭐</span> <span>${student.stars}</span>
        </div>
        ${hatchedBadgeHtml}

        <div class="evo-progress-container">
          <div class="evo-progress-label">
            <span>${student.stars >= 100 ? 'Tiến hóa' : 'Ấp trứng'}</span>
            <span style="${student.stars < 100 ? 'color: #E11D48; font-weight: 800;' : ''}">${student.stars < 100 ? `Còn ${milestone.neededToHatch} ⭐ để nở` : (milestone.nextStage ? `Còn ${milestone.needed} ⭐` : 'Tối đa!')}</span>
          </div>
          <div class="evo-progress-bar">
            <div class="evo-progress-fill" style="width: ${student.stars < 100 ? Math.min(100, Math.round((student.stars / 100) * 100)) : milestone.progress}%; background: ${student.stars >= 100 ? 'linear-gradient(90deg, #10B981, #3B82F6)' : 'linear-gradient(90deg, #F59E0B, #EF4444)'};"></div>
          </div>
        </div>

        <div class="card-quick-btn-row">
          ${student.stars >= 200 ? `
            <button class="btn-fast-reward btn-card-open-gift fast-action" data-action="gift200" data-id="${student.id}" style="width: 100%; background: linear-gradient(135deg, #F59E0B, #DC2626); color: #fff; font-weight: 800; padding: 7px 10px; font-size: 11px;" title="Bé đã đạt 200 ⭐ - Bấm mở 2 quà SIÊU ĐẶC BIỆT!">
              🏆 KỶ LỤC 200⭐ - MỞ QUÀ ĐẶC BIỆT
            </button>
          ` : (student.stars >= 100 && !student.accumulateBonus) ? `
            <button class="btn-fast-reward btn-card-open-gift fast-action" data-action="gift100" data-id="${student.id}" style="width: 100%; background: linear-gradient(135deg, #EC4899, #BE185D); color: #fff; font-weight: 800; padding: 7px 10px; font-size: 11px;" title="Bé đã đạt 100 ⭐ - Bấm mở quà hoặc tích điểm!">
              🎁 ĐÃ NỞ - MỞ QUÀ / TÍCH ĐIỂM (100⭐)
            </button>
          ` : `
            <button class="btn-fast-reward fast-action" data-action="minus10" data-id="${student.id}" style="background: #FEE2E2; color: #DC2626; border: 1.5px solid #FECDD3; font-weight: 800; padding: 6px 8px;" title="Trừ -10 ⭐">
              -10
            </button>
            <button class="btn-fast-reward focus fast-action" data-action="focus" data-id="${student.id}" title="Tập trung chú ý nghe giảng (+3 ⭐)">
              👀 (+3)
            </button>
            <button class="btn-fast-reward fast-action" data-action="plus10" data-id="${student.id}" style="background: #DCFCE7; color: #16A34A; border: 1.5px solid #BBF7D0; font-weight: 800; padding: 6px 8px;" title="Cộng +10 ⭐">
              +10
            </button>
            <button class="btn-fast-reward fast-action" data-action="dial" data-id="${student.id}" style="background: #EEF2FF; color: #4F46E5; border: 1.5px solid #C7D2FE; font-weight: 800; padding: 6px 8px;" title="Tự gõ số điểm">
              ⚡ Điểm
            </button>
          `}
        </div>
      `;

      // Click on Card opens full reward action sheet
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-qr-parent') || e.target.closest('.btn-zalo-card') || e.target.closest('.fast-action') || e.target.closest('.btn-edit-student') || e.target.closest('.btn-delete-student') || e.target.closest('.card-stars-click')) {
          return;
        }
        if (student.stars >= 200) {
          openMilestoneChoiceModal(student.id, 200);
          return;
        }
        if (student.stars >= 100 && !student.accumulateBonus) {
          openMilestoneChoiceModal(student.id, 100);
          return;
        }
        openActionModal(student.id);
      });

      // Chạm vào sao để tự đánh số điểm
      const starsClickEl = card.querySelector('.card-stars-click');
      if (starsClickEl) {
        starsClickEl.addEventListener('click', (e) => {
          e.stopPropagation();
          openQuickScoreModal(student.id);
        });
      }

      // Quick Fast Buttons
      const minus10Btn = card.querySelector('.fast-action[data-action="minus10"]');
      if (minus10Btn) {
        minus10Btn.addEventListener('click', (e) => {
          e.stopPropagation();
          applyStudentPoints(student.id, -10, 'Nhắc nhở rèn luyện (-10 ⭐)', '⚠️', e.target);
        });
      }

      const plus10Btn = card.querySelector('.fast-action[data-action="plus10"]');
      if (plus10Btn) {
        plus10Btn.addEventListener('click', (e) => {
          e.stopPropagation();
          applyStudentPoints(student.id, 10, 'Khen thưởng tích cực (+10 ⭐)', '⭐', e.target);
        });
      }

      const dialBtn = card.querySelector('.fast-action[data-action="dial"]');
      if (dialBtn) {
        dialBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openQuickScoreModal(student.id);
        });
      }

      const focusBtn = card.querySelector('.fast-action[data-action="focus"]');
      if (focusBtn) {
        focusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if ((student.stars || 0) >= 100) {
            showSyncToast(`🐣 Bé <strong>${student.name}</strong> đã đạt 100 ⭐! Bắt buộc mở quà để về 0 ⭐ trước khi tích sao tiếp.`, '🎁');
            openGiftClaimModal(student.id);
            return;
          }
          const rect = e.target.getBoundingClientRect();
          createFloatingStar(rect.left + rect.width / 2, rect.top, '👀');
          window.soundFx.playStar();
          StorageManager.addPointsToStudent(student.id, 3, 'Tập trung chú ý nghe giảng', '👀');
          refreshData();
        });
      }

      const handBtn = card.querySelector('.fast-action[data-action="hand"]');
      if (handBtn) {
        handBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if ((student.stars || 0) >= 100) {
            showSyncToast(`🐣 Bé <strong>${student.name}</strong> đã đạt 100 ⭐! Bắt buộc mở quà để về 0 ⭐ trước khi tích sao tiếp.`, '🎁');
            openGiftClaimModal(student.id);
            return;
          }
          const rect = e.target.getBoundingClientRect();
          createFloatingStar(rect.left + rect.width / 2, rect.top, '✋');
          window.soundFx.playStar();
          StorageManager.addPointsToStudent(student.id, 2, 'Giơ tay phát biểu sôi nổi', '✋');
          refreshData();
        });
      }

      const quietBtn = card.querySelector('.fast-action[data-action="quiet"]');
      if (quietBtn) {

        quietBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if ((student.stars || 0) >= 100) {
            showSyncToast(`🐣 Bé <strong>${student.name}</strong> đã đạt 100 ⭐! Bắt buộc mở quà để về 0 ⭐ trước khi tích sao tiếp.`, '🎁');
            openGiftClaimModal(student.id);
            return;
          }
          const rect = e.target.getBoundingClientRect();
          createFloatingStar(rect.left + rect.width / 2, rect.top, '🤫');
          window.soundFx.playStar();
          StorageManager.addPointsToStudent(student.id, 2, 'Giữ trật tự và ngồi ngoan', '🤫');
          refreshData();
        });
      }

      const giftBtn200 = card.querySelector('.fast-action[data-action="gift200"]');
      if (giftBtn200) {
        giftBtn200.addEventListener('click', (e) => {
          e.stopPropagation();
          openMilestoneChoiceModal(student.id, 200);
        });
      }

      const giftBtn100 = card.querySelector('.fast-action[data-action="gift100"]');
      if (giftBtn100) {
        giftBtn100.addEventListener('click', (e) => {
          e.stopPropagation();
          openMilestoneChoiceModal(student.id, 100);
        });
      }

      const giftBtn = card.querySelector('.fast-action[data-action="gift"]');
      if (giftBtn) {
        giftBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openMilestoneChoiceModal(student.id, (student.stars >= 200) ? 200 : 100);
        });
      }

      // Edit student button
      const editBtn = card.querySelector('.btn-edit-student');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditStudentModal(student.id);
        });
      }

      // Delete student button
      const deleteBtn = card.querySelector('.btn-delete-student');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteStudentConfirm(student.id);
        });
      }

      // QR Parent modal
      card.querySelector('.btn-qr-parent').addEventListener('click', (e) => {
        e.stopPropagation();
        openParentQrModal(student.id);
      });

      // Zalo Card Export
      card.querySelector('.btn-zalo-card').addEventListener('click', (e) => {
        e.stopPropagation();
        openCardExportModal(student.id);
      });

      studentsContainer.appendChild(card);
    });
  }

  // --- Render 4 Groups (Tổ) View ---
  function renderGroups() {
    const { groups, students } = state.data;
    groupsContainer.innerHTML = '';

    groups.forEach(group => {
      const members = students.filter(s => s.group === group.id);
      const card = document.createElement('div');
      card.className = 'group-card';
      card.style.borderTopColor = group.color;

      card.innerHTML = `
        <div class="group-header-row">
          <div class="group-title-box">
            <div class="group-mascot">${group.mascot}</div>
            <div>
              <div class="group-name">${group.name}</div>
              <div style="font-size: 13px; color: #64748B; font-weight: 700;">${members.length} thành viên</div>
            </div>
          </div>
          <div class="group-stars-badge">
            ⭐ ${group.stars}
          </div>
        </div>

        <div style="font-weight: 700; font-size: 13px; color: #64748B; margin-bottom: 8px;">
          Thành viên trong tổ:
        </div>
        <div class="group-members-list">
          ${members.map(m => `
            <div class="member-chip">
              <span>⭐ ${m.stars}</span>
              <span>${m.name}</span>
            </div>
          `).join('')}
        </div>

        <div class="group-actions-row">
          <button class="btn-group-action reward" data-gid="${group.id}">
            👏 Thưởng Tổ (+1 ⭐)
          </button>
          <button class="btn-group-action super" data-gid="${group.id}">
            🚀 Xuất sắc (+2 ⭐)
          </button>
        </div>
      `;

      card.querySelector('.btn-group-action.reward').addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        createFloatingStar(rect.left + rect.width / 2, rect.top, '🌟');
        window.soundFx.playCheer();
        StorageManager.addPointsToGroup(group.id, 1, 'Tổ hợp tác tốt', '👏');
        refreshData();
      });

      card.querySelector('.btn-group-action.super').addEventListener('click', (e) => {
        const rect = e.target.getBoundingClientRect();
        createFloatingStar(rect.left + rect.width / 2, rect.top, '🚀');
        window.soundFx.playHatch();
        StorageManager.addPointsToGroup(group.id, 2, 'Tổ xuất sắc dẫn đầu', '🚀');
        refreshData();
      });

      groupsContainer.appendChild(card);
    });
  }

  // --- Switch Tabs ---
  tabStudentsBtn.addEventListener('click', () => {
    state.activeTab = 'students';
    tabStudentsBtn.classList.add('active');
    tabGroupsBtn.classList.remove('active');
    studentsContainer.style.display = 'block';
    const studentViewControls = document.getElementById('studentViewControls');
    if (studentViewControls) studentViewControls.style.display = 'flex';
    groupsContainer.style.display = 'none';
  });

  tabGroupsBtn.addEventListener('click', () => {
    state.activeTab = 'groups';
    tabGroupsBtn.classList.add('active');
    tabStudentsBtn.classList.remove('active');
    studentsContainer.style.display = 'none';
    const studentViewControls = document.getElementById('studentViewControls');
    if (studentViewControls) studentViewControls.style.display = 'none';
    groupsContainer.style.display = 'grid';
  });

  // --- Refresh View from state ---
  function refreshData(newData) {
    if (newData && newData.students) {
      state.data = newData;
    } else {
      state.data = StorageManager.loadData();
    }

    const prevHatchedMap = new Set(
      ((state.data && state.data.students) || []).filter(s => (s.stars || 0) >= 100).map(s => s.id)
    );

    // Check if any student newly hatched (>= 100 stars)
    if (prevHatchedMap.size >= 0) {
      const newlyHatched = (state.data.students || []).find(s => (s.stars || 0) >= 100 && !prevHatchedMap.has(s.id));
      if (newlyHatched && prevHatchedMap.size > 0) {
        showHatchCelebration(newlyHatched);
      }
    }

    renderStudents();
    renderGroups();
    renderParentHwQuickBar();
  }

  // --- Full Action Sheet Modal for 1 Student ---
  function openActionModal(studentId) {
    state.selectedStudentId = studentId;
    const student = state.data.students.find(s => s.id === studentId);
    if (!student) return;

    const modalTitle = document.getElementById('actionModalTitle');
    const modalPetPreview = document.getElementById('modalPetPreview');
    const modalStudentStars = document.getElementById('modalStudentStars');
    const sleepBtn = document.getElementById('optSleepBtn');

    modalTitle.textContent = `Khen thưởng: ${student.name}`;
    modalStudentStars.textContent = `${student.stars} ⭐`;
    modalPetPreview.innerHTML = window.EggEvolution.renderPetSVG(student.stars, student.status);

    if (student.status === 'sleeping') {
      sleepBtn.innerHTML = `
        <span class="opt-icon">✨</span>
        <span class="opt-label">Đánh thức dậy (+1 ⭐)</span>
        <span class="opt-points">Đã ngồi ngoan</span>
      `;
      sleepBtn.dataset.type = 'wake';
    } else {
      sleepBtn.innerHTML = `
        <span class="opt-icon">💤</span>
        <span class="opt-label">Thú cưng đi ngủ (Tĩnh tâm)</span>
        <span class="opt-points">2 phút giữ trật tự</span>
      `;
      sleepBtn.dataset.type = 'sleep';
    }

    actionModal.classList.add('active');
  }

  modalCloseBtn.addEventListener('click', () => {
    actionModal.classList.remove('active');
  });

  // Stepper & Custom Points Controls in Action Modal
  const inputCustomRewardPoints = document.getElementById('inputCustomRewardPoints');
  const btnCustomPointsMinus = document.getElementById('btnCustomPointsMinus');
  const btnCustomPointsPlus = document.getElementById('btnCustomPointsPlus');
  const btnCustomPointsStepMinus10 = document.getElementById('btnCustomPointsStepMinus10');
  const btnCustomPointsStepPlus10 = document.getElementById('btnCustomPointsStepPlus10');
  const btnModalDirectMinus = document.getElementById('btnModalDirectMinus');
  const btnModalDirectPlus = document.getElementById('btnModalDirectPlus');
  const lblModalMinusPoints = document.getElementById('lblModalMinusPoints');
  const lblModalPlusPoints = document.getElementById('lblModalPlusPoints');
  const chkKeepModalOpen = document.getElementById('chkKeepModalOpen');
  const presetButtons = document.querySelectorAll('.btn-preset-pts');

  function updateActionModalDirectLabels(val) {
    if (lblModalMinusPoints) lblModalMinusPoints.textContent = val;
    if (lblModalPlusPoints) lblModalPlusPoints.textContent = val;
  }

  function updateActivePreset(val) {
    presetButtons.forEach(btn => {
      const pts = parseInt(btn.dataset.pts, 10);
      if (pts === val) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    updateActionModalDirectLabels(val);
  }

  if (btnCustomPointsMinus) {
    btnCustomPointsMinus.addEventListener('click', (e) => {
      e.preventDefault();
      let cur = parseInt(inputCustomRewardPoints.value, 10) || 1;
      if (cur > 1) {
        cur--;
        inputCustomRewardPoints.value = cur;
        updateActivePreset(cur);
      }
    });
  }

  if (btnCustomPointsPlus) {
    btnCustomPointsPlus.addEventListener('click', (e) => {
      e.preventDefault();
      let cur = parseInt(inputCustomRewardPoints.value, 10) || 1;
      if (cur < 100) {
        cur++;
        inputCustomRewardPoints.value = cur;
        updateActivePreset(cur);
      }
    });
  }

  if (btnCustomPointsStepMinus10) {
    btnCustomPointsStepMinus10.addEventListener('click', (e) => {
      e.preventDefault();
      let cur = parseInt(inputCustomRewardPoints.value, 10) || 10;
      cur = Math.max(1, cur - 10);
      inputCustomRewardPoints.value = cur;
      updateActivePreset(cur);
    });
  }

  if (btnCustomPointsStepPlus10) {
    btnCustomPointsStepPlus10.addEventListener('click', (e) => {
      e.preventDefault();
      let cur = parseInt(inputCustomRewardPoints.value, 10) || 10;
      cur = Math.min(100, cur + 10);
      inputCustomRewardPoints.value = cur;
      updateActivePreset(cur);
    });
  }

  if (inputCustomRewardPoints) {
    inputCustomRewardPoints.addEventListener('input', () => {
      let cur = parseInt(inputCustomRewardPoints.value, 10) || 1;
      updateActivePreset(cur);
    });
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const pts = parseInt(btn.dataset.pts, 10);
      if (inputCustomRewardPoints) inputCustomRewardPoints.value = pts;
      updateActivePreset(pts);
    });
  });

  // Nút trừ điểm trực tiếp theo số đã nhập trong Action Modal
  if (btnModalDirectMinus) {
    btnModalDirectMinus.addEventListener('click', (e) => {
      e.preventDefault();
      const studentId = state.selectedStudentId;
      if (!studentId) return;
      const val = Math.abs(parseInt(inputCustomRewardPoints.value, 10)) || 10;
      applyStudentPoints(studentId, -val, `Nhắc nhở (-${val} ⭐)`, '⚠️', btnModalDirectMinus);

      const keepOpen = chkKeepModalOpen && chkKeepModalOpen.checked;
      if (!keepOpen && actionModal) {
        actionModal.classList.remove('active');
      } else {
        const student = (state.data.students || []).find(s => s.id === studentId);
        const modalStudentStars = document.getElementById('modalStudentStars');
        if (modalStudentStars && student) modalStudentStars.textContent = `${student.stars} ⭐`;
      }
    });
  }

  // Nút cộng điểm trực tiếp theo số đã nhập trong Action Modal
  if (btnModalDirectPlus) {
    btnModalDirectPlus.addEventListener('click', (e) => {
      e.preventDefault();
      const studentId = state.selectedStudentId;
      if (!studentId) return;
      const val = Math.abs(parseInt(inputCustomRewardPoints.value, 10)) || 10;
      applyStudentPoints(studentId, val, `Khen thưởng (+${val} ⭐)`, '⭐', btnModalDirectPlus);

      const keepOpen = chkKeepModalOpen && chkKeepModalOpen.checked;
      if (!keepOpen && actionModal) {
        actionModal.classList.remove('active');
      } else {
        const student = (state.data.students || []).find(s => s.id === studentId);
        const modalStudentStars = document.getElementById('modalStudentStars');
        if (modalStudentStars && student) modalStudentStars.textContent = `${student.stars} ⭐`;
      }
    });
  }

  // --- Bàn Phím Chấm Điểm Siêu Tốc & Tự Đánh Số (Quick Score Modal) ---
  const quickScoreModal = document.getElementById('quickScoreModal');
  const closeQuickScoreModalBtn = document.getElementById('closeQuickScoreModalBtn');
  const quickScorePetPreview = document.getElementById('quickScorePetPreview');
  const quickScoreStudentName = document.getElementById('quickScoreStudentName');
  const quickScoreGroupBadge = document.getElementById('quickScoreGroupBadge');
  const quickScoreStarsBadge = document.getElementById('quickScoreStarsBadge');
  const inputQuickScoreNumber = document.getElementById('inputQuickScoreNumber');
  const btnQuickDec10 = document.getElementById('btnQuickDec10');
  const btnQuickInc10 = document.getElementById('btnQuickInc10');
  const btnQuickApplyMinus = document.getElementById('btnQuickApplyMinus');
  const btnQuickApplyPlus = document.getElementById('btnQuickApplyPlus');
  const labelQuickMinusVal = document.getElementById('labelQuickMinusVal');
  const labelQuickPlusVal = document.getElementById('labelQuickPlusVal');
  const btnSwitchToFullActionModal = document.getElementById('btnSwitchToFullActionModal');
  const quickScoreChips = document.querySelectorAll('.btn-qs-chip');

  function updateQuickScoreLabels() {
    let val = Math.abs(parseInt(inputQuickScoreNumber.value, 10)) || 10;
    if (val < 1) val = 1;
    if (labelQuickMinusVal) labelQuickMinusVal.textContent = val;
    if (labelQuickPlusVal) labelQuickPlusVal.textContent = val;

    quickScoreChips.forEach(chip => {
      const chipVal = parseInt(chip.dataset.val, 10);
      chip.classList.toggle('active', chipVal === val);
    });
  }

  function openQuickScoreModal(studentId) {
    state.selectedStudentId = studentId;
    const student = (state.data.students || []).find(s => s.id === studentId);
    if (!student) return;

    const group = (state.data.groups || []).find(g => g.id === student.group) || { name: 'Tổ 1', color: '#FF6B6B' };

    if (quickScoreStudentName) quickScoreStudentName.textContent = student.name;
    if (quickScoreGroupBadge) {
      quickScoreGroupBadge.textContent = `${group.mascot || '🚩'} ${group.name.split('-')[0].trim()}`;
      quickScoreGroupBadge.style.color = group.color;
    }
    if (quickScoreStarsBadge) quickScoreStarsBadge.textContent = `${student.stars} ⭐`;
    if (quickScorePetPreview) {
      quickScorePetPreview.innerHTML = window.EggEvolution.renderPetSVG(student.stars, student.status, group.color);
    }

    if (inputQuickScoreNumber) {
      inputQuickScoreNumber.value = 10;
      updateQuickScoreLabels();
    }

    if (quickScoreModal) {
      quickScoreModal.classList.add('active');
      setTimeout(() => {
        if (inputQuickScoreNumber) {
          inputQuickScoreNumber.focus();
          inputQuickScoreNumber.select();
        }
      }, 100);
    }
  }

  if (closeQuickScoreModalBtn) {
    closeQuickScoreModalBtn.addEventListener('click', () => {
      if (quickScoreModal) quickScoreModal.classList.remove('active');
    });
  }

  if (quickScoreModal) {
    quickScoreModal.addEventListener('click', (e) => {
      if (e.target === quickScoreModal) {
        quickScoreModal.classList.remove('active');
      }
    });
  }

  if (inputQuickScoreNumber) {
    inputQuickScoreNumber.addEventListener('input', updateQuickScoreLabels);
  }

  if (btnQuickDec10) {
    btnQuickDec10.addEventListener('click', () => {
      let cur = parseInt(inputQuickScoreNumber.value, 10) || 10;
      cur = Math.max(1, cur - 10);
      inputQuickScoreNumber.value = cur;
      updateQuickScoreLabels();
    });
  }

  if (btnQuickInc10) {
    btnQuickInc10.addEventListener('click', () => {
      let cur = parseInt(inputQuickScoreNumber.value, 10) || 10;
      cur = Math.min(100, cur + 10);
      inputQuickScoreNumber.value = cur;
      updateQuickScoreLabels();
    });
  }

  quickScoreChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const val = parseInt(chip.dataset.val, 10);
      if (inputQuickScoreNumber) {
        inputQuickScoreNumber.value = val;
        updateQuickScoreLabels();
      }
    });
  });

  if (btnQuickApplyMinus) {
    btnQuickApplyMinus.addEventListener('click', () => {
      const studentId = state.selectedStudentId;
      if (!studentId) return;
      const pts = -(Math.abs(parseInt(inputQuickScoreNumber.value, 10)) || 10);
      applyStudentPoints(studentId, pts, `Nhắc nhở (${pts} ⭐)`, '⚠️', btnQuickApplyMinus);
      if (quickScoreModal) quickScoreModal.classList.remove('active');
    });
  }

  if (btnQuickApplyPlus) {
    btnQuickApplyPlus.addEventListener('click', () => {
      const studentId = state.selectedStudentId;
      if (!studentId) return;
      const pts = Math.abs(parseInt(inputQuickScoreNumber.value, 10)) || 10;
      applyStudentPoints(studentId, pts, `Khen thưởng (+${pts} ⭐)`, '⭐', btnQuickApplyPlus);
      if (quickScoreModal) quickScoreModal.classList.remove('active');
    });
  }

  if (btnSwitchToFullActionModal) {
    btnSwitchToFullActionModal.addEventListener('click', () => {
      const studentId = state.selectedStudentId;
      if (quickScoreModal) quickScoreModal.classList.remove('active');
      if (studentId) openActionModal(studentId);
    });
  }


  // Reward Option buttons in modal
  document.querySelectorAll('.reward-option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const studentId = state.selectedStudentId;
      if (!studentId) return;

      const actionType = btn.dataset.action;

      if (actionType === 'sleep-toggle') {
        const isWake = btn.dataset.type === 'wake';
        if (isWake) {
          window.soundFx.playHatch();
          StorageManager.wakeUp(studentId);
        } else {
          window.soundFx.playSleep();
          StorageManager.setSleeping(studentId, 2);
        }
        actionModal.classList.remove('active');
        refreshData();
      } else {
        let points = parseInt(btn.dataset.points || '1', 10);
        // Nếu người dùng chọn số điểm trên thanh điều khiển và đây là hành vi thưởng dương
        if (points > 0 && inputCustomRewardPoints) {
          const customVal = parseInt(inputCustomRewardPoints.value, 10);
          if (customVal && customVal > 0) {
            points = customVal;
          }
        }

        const reason = btn.dataset.reason || 'Khen thưởng';
        const icon = btn.dataset.icon || '⭐';

        const student = state.data.students.find(s => s.id === studentId);
        if (student && (student.stars || 0) >= 100 && points > 0) {
          actionModal.classList.remove('active');
          showSyncToast(`🐣 Bé <strong>${student.name}</strong> đã đạt 100 ⭐! Bắt buộc mở 2 phần quà để chuyển về 0 ⭐ bắt đầu chu kỳ mới.`, '🎁');
          openGiftClaimModal(student.id);
          return;
        }

        if (points < 0) {
          if (window.soundFx && typeof window.soundFx.playPenalty === 'function') {
            window.soundFx.playPenalty();
          }
        } else {
          window.soundFx.playStar();
          const rect = btn.getBoundingClientRect();
          createFloatingStar(rect.left + rect.width / 2, rect.top, icon);
        }

        StorageManager.addPointsToStudent(studentId, points, reason, icon);

        // Cập nhật số sao tức thì trên tiêu đề modal để cô nhìn thấy số điểm tăng liên tục
        const updatedStudent = state.data.students.find(s => s.id === studentId);
        const modalStudentStars = document.getElementById('modalStudentStars');
        const modalPetPreview = document.getElementById('modalPetPreview');
        if (modalStudentStars && updatedStudent) {
          modalStudentStars.textContent = `${updatedStudent.stars} ⭐`;
        }
        if (modalPetPreview && updatedStudent) {
          modalPetPreview.innerHTML = window.EggEvolution.renderPetSVG(updatedStudent.stars, updatedStudent.status);
        }

        if (updatedStudent && updatedStudent.stars >= 100) {
          actionModal.classList.remove('active');
          refreshData();
          showSyncToast(`🎉 Chúc mừng bé <strong>${updatedStudent.name}</strong> đã nở trứng (100 ⭐)!`, '🏆');
          openGiftClaimModal(updatedStudent.id);
          return;
        }

        const keepOpen = chkKeepModalOpen && chkKeepModalOpen.checked;
        if (!keepOpen) {
          actionModal.classList.remove('active');
        }
        refreshData();
      }
    });
  });

  // --- Render Compact Parent Homework Summary Bar (Bảng Tổng Hợp Ngắn Gọn Trên Trang Giáo Viên) ---
  function renderParentHwQuickBar() {
    const quickHwContentArea = document.getElementById('quickHwContentArea');
    const quickHwCountText = document.getElementById('quickHwCountText');
    if (!quickHwContentArea) return;

    const todayDateKey = StorageManager.getTodayDateString ? StorageManager.getTodayDateString() : new Date().toISOString().split('T')[0];
    const students = (state.data && state.data.students) || [];
    const groups = (state.data && state.data.groups) || [];

    const submittedToday = students.filter(s => s.homeworkRecords && s.homeworkRecords[todayDateKey] && s.homeworkRecords[todayDateKey].totalStars > 0);
    const totalStars = submittedToday.reduce((sum, s) => sum + (s.homeworkRecords[todayDateKey].totalStars || 0), 0);

    if (quickHwCountText) {
      quickHwCountText.textContent = `${submittedToday.length} bé (+${totalStars} ⭐)`;
    }

    if (submittedToday.length === 0) {
      quickHwContentArea.innerHTML = `
        <div class="quick-hw-empty">
          ✨ Hôm nay chưa có bé nào nhận sao từ phụ huynh. Khi phụ huynh chấm điểm trên điện thoại, số sao thưởng sẽ tự động hiển thị ngay tại đây để cô nắm bắt tức thì mà không cần đi tìm!
        </div>
      `;
      return;
    }

    let cardsHtml = '<div class="quick-hw-grid">';
    submittedToday.forEach(s => {
      const rec = s.homeworkRecords[todayDateKey];
      const grp = groups.find(g => g.id === s.group) || { name: 'Tổ ' + s.group };
      const timeStr = rec.submittedAt ? new Date(rec.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Hôm nay';
      cardsHtml += `
        <div class="quick-hw-badge-card" title="Phụ huynh gửi lúc: ${timeStr}">
          <div style="font-size: 24px;">🐣</div>
          <div>
            <div class="quick-hw-student-name">
              ${s.name}
              <span class="quick-hw-group">${grp.name.split('-')[0].trim()}</span>
            </div>
            <div class="quick-hw-breakdown">
              📖 Đọc: ${rec.readingCount || 0} • ✍️ Viết: ${rec.writingStars || 0} • 🧹 Việc nhà: ${rec.choresDone || 0}
            </div>
          </div>
          <div class="quick-hw-stars-pill">+${rec.totalStars} ⭐</div>
        </div>
      `;
    });
    cardsHtml += '</div>';

    quickHwContentArea.innerHTML = cardsHtml;
  }

  const btnToggleQuickHwBar = document.getElementById('btnToggleQuickHwBar');
  if (btnToggleQuickHwBar) {
    btnToggleQuickHwBar.addEventListener('click', () => {
      const content = document.getElementById('quickHwContentArea');
      if (content) {
        content.classList.toggle('collapsed');
        btnToggleQuickHwBar.textContent = content.classList.contains('collapsed') ? '🔼 Mở rộng' : '🔽 Thu gọn';
      }
    });
  }

  const btnOpenFullParentHwModal = document.getElementById('btnOpenFullParentHwModal');
  if (btnOpenFullParentHwModal) {
    btnOpenFullParentHwModal.addEventListener('click', () => {
      if (typeof openParentHomeworkModal === 'function') {
        openParentHomeworkModal();
      } else {
        const modal = document.getElementById('parentHomeworkSummaryModal');
        if (modal) modal.classList.add('active');
      }
    });
  }

  // --- Chế Độ Tự Sửa & Xóa Học Sinh Trên App ---
  const editStudentModal = document.getElementById('editStudentModal');
  const closeEditStudentModalBtn = document.getElementById('closeEditStudentModalBtn');
  const btnCancelEditStudent = document.getElementById('btnCancelEditStudent');
  const formEditStudent = document.getElementById('formEditStudent');
  const editStudentId = document.getElementById('editStudentId');
  const editStudentNameInput = document.getElementById('editStudentNameInput');
  const editStudentGroupSelect = document.getElementById('editStudentGroupSelect');
  const btnDeleteStudentInsideEdit = document.getElementById('btnDeleteStudentInsideEdit');
  const btnModalEditStudent = document.getElementById('btnModalEditStudent');
  const btnModalDeleteStudent = document.getElementById('btnModalDeleteStudent');

  function openEditStudentModal(studentId) {
    const student = (state.data.students || []).find(s => s.id === studentId);
    if (!student) return;

    if (editStudentId) editStudentId.value = student.id;
    if (editStudentNameInput) editStudentNameInput.value = student.name;
    if (editStudentGroupSelect) editStudentGroupSelect.value = student.group || '1';

    if (editStudentModal) {
      editStudentModal.classList.add('active');
      setTimeout(() => {
        if (editStudentNameInput) editStudentNameInput.focus();
      }, 100);
    }
  }

  function closeEditStudentModal() {
    if (editStudentModal) {
      editStudentModal.classList.remove('active');
    }
  }

  function deleteStudentConfirm(studentId) {
    const student = (state.data.students || []).find(s => s.id === studentId);
    if (!student) return;

    const confirmed = confirm(`⚠️ Cô có chắc chắn muốn xóa học sinh "${student.name}" khỏi danh sách lớp không?\n\nThao tác này sẽ đồng bộ ngay lập tức lên Đám Mây và điện thoại phụ huynh.`);
    if (!confirmed) return;

    StorageManager.deleteStudent(studentId);

    if (actionModal && actionModal.classList.contains('active') && state.selectedStudentId === studentId) {
      actionModal.classList.remove('active');
    }
    closeEditStudentModal();
    refreshData();
    showSyncToast(`🗑️ Đã xóa học sinh <strong>${student.name}</strong> thành công!`, '🗑️');
  }

  if (closeEditStudentModalBtn) {
    closeEditStudentModalBtn.addEventListener('click', closeEditStudentModal);
  }
  if (btnCancelEditStudent) {
    btnCancelEditStudent.addEventListener('click', closeEditStudentModal);
  }

  if (formEditStudent) {
    formEditStudent.addEventListener('submit', (e) => {
      e.preventDefault();
      const studentId = editStudentId ? editStudentId.value : null;
      const newName = (editStudentNameInput ? editStudentNameInput.value : '').trim();
      const newGroup = parseInt(editStudentGroupSelect ? editStudentGroupSelect.value : '1', 10) || 1;

      if (!newName) {
        alert('Vui lòng nhập họ và tên của học sinh!');
        return;
      }

      StorageManager.updateStudentName(studentId, newName);
      StorageManager.updateStudentGroup(studentId, newGroup);

      closeEditStudentModal();

      if (actionModal && actionModal.classList.contains('active') && state.selectedStudentId === studentId) {
        const modalTitle = document.getElementById('actionModalTitle');
        if (modalTitle) modalTitle.textContent = `Khen thưởng: ${newName}`;
      }

      refreshData();
      showSyncToast(`✅ Đã cập nhật thông tin học sinh <strong>${newName}</strong>! Đã đồng bộ lên Đám Mây.`, '✏️');
    });
  }

  if (btnDeleteStudentInsideEdit) {
    btnDeleteStudentInsideEdit.addEventListener('click', () => {
      const studentId = editStudentId ? editStudentId.value : null;
      if (studentId) deleteStudentConfirm(studentId);
    });
  }

  if (btnModalEditStudent) {
    btnModalEditStudent.addEventListener('click', () => {
      if (state.selectedStudentId) {
        openEditStudentModal(state.selectedStudentId);
      }
    });
  }

  if (btnModalDeleteStudent) {
    btnModalDeleteStudent.addEventListener('click', () => {
      if (state.selectedStudentId) {
        deleteStudentConfirm(state.selectedStudentId);
      }
    });
  }

  // --- Button: Whole Class Reward ---
  btnAllReward.addEventListener('click', (e) => {
    const rect = btnAllReward.getBoundingClientRect();
    createFloatingStar(rect.left + 50, rect.top, '🏆');
    window.soundFx.playCheer();
    StorageManager.addPointsToAll(1, 'Cả lớp cùng chăm ngoan', '🏆');
    refreshData();
  });

  // --- Noise Meter Modal ---
  btnNoiseMeter.addEventListener('click', async () => {
    noiseModal.classList.add('active');
    const started = await noiseMeter.start();
    const meterStatus = document.getElementById('noiseStatusText');
    const volumeLevel = document.getElementById('noiseVolumeLevel');
    const streakFill = document.getElementById('noiseStreakFill');

    if (!started) {
      meterStatus.textContent = '⚠️ Hãy cấp quyền truy cập Micro để đo tiếng ồn!';
      return;
    }

    meterStatus.textContent = '🎧 Đang lắng nghe âm thanh lớp học...';

    noiseMeter.onVolumeUpdate = (data) => {
      volumeLevel.style.width = `${data.volume}%`;
      if (data.isLoud) {
        volumeLevel.classList.add('loud');
        meterStatus.textContent = '🤫 Suỵt! Lớp mình đang hơi ồn rồi!';
      } else {
        volumeLevel.classList.remove('loud');
        meterStatus.textContent = '🌿 Tuyệt vời! Lớp đang rất trật tự.';
      }
      streakFill.style.width = `${data.quietProgress}%`;
    };

    noiseMeter.onReward = () => {
      window.soundFx.playCheer();
      StorageManager.addPointsToAll(1, 'Giữ trật tự siêu giỏi (Đầy bình yên bình)', '🌈');
      refreshData();
      meterStatus.textContent = '🎉 Thưởng cả lớp +1 sao vì giữ trật tự xuất sắc!';
    };
  });

  document.getElementById('noiseThresholdSlider').addEventListener('input', (e) => {
    noiseMeter.setThreshold(e.target.value);
    document.getElementById('noiseThresholdMarker').style.left = `${e.target.value}%`;
  });

  document.getElementById('closeNoiseModalBtn').addEventListener('click', () => {
    noiseMeter.stop();
    noiseModal.classList.remove('active');
  });

  // --- Lucky Wheel Modal ---
  let currentWheelGroup = 'all';

  function setupWheelGroup(group) {
    currentWheelGroup = group;
    document.querySelectorAll('.wheel-group-tab').forEach(btn => {
      const isAct = btn.dataset.group === String(group);
      btn.style.background = isAct ? '#6366F1' : '#F8FAFC';
      btn.style.color = isAct ? '#FFF' : '#334155';
      btn.style.borderColor = isAct ? '#6366F1' : '#E2E8F0';
    });

    const allStudents = state.data.students || [];
    let items = allStudents.filter(s => s.status !== 'sleeping');
    if (group !== 'all') {
      const gId = parseInt(group, 10);
      items = items.filter(s => s.group === gId);
    }
    if (luckyWheel) {
      luckyWheel.setItems(items);
    }
    const winnerBox = document.getElementById('wheelWinnerBox');
    if (winnerBox) winnerBox.style.display = 'none';
  }

  document.querySelectorAll('.wheel-group-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      setupWheelGroup(btn.dataset.group);
    });
  });

  btnWheel.addEventListener('click', () => {
    state.data = StorageManager.loadData();
    wheelModal.classList.add('active');
    const canvas = document.getElementById('luckyWheelCanvas');
    if (canvas) {
      canvas.width = 360;
      canvas.height = 360;
    }

    luckyWheel = new LuckyWheel('luckyWheelCanvas');
    setupWheelGroup('all');

    const winnerBox = document.getElementById('wheelWinnerBox');
    if (winnerBox) winnerBox.style.display = 'none';
  });

  document.getElementById('spinWheelBtn').addEventListener('click', () => {
    if (!luckyWheel || luckyWheel.isSpinning) return;
    const winnerBox = document.getElementById('wheelWinnerBox');
    if (winnerBox) winnerBox.style.display = 'none';

    luckyWheel.spin((winner) => {
      if (!winner) return;
      const winnerName = document.getElementById('wheelWinnerName');
      if (winnerName) winnerName.textContent = `🎉 Xin chúc mừng: ${winner.name}!`;
      if (winnerBox) winnerBox.style.display = 'block';

      const awardBtn = document.getElementById('btnAwardWinner');
      if (awardBtn) {
        awardBtn.onclick = () => {
          if (window.soundFx) window.soundFx.playStar();
          StorageManager.addPointsToStudent(winner.id, 1, 'Bốc thăm trúng phát biểu', '🎲');
          state.data = StorageManager.loadData();
          renderStudents();
          renderGroups();
          wheelModal.classList.remove('active');
        };
      }
    });
  });

  document.getElementById('closeWheelModalBtn').addEventListener('click', () => {
    wheelModal.classList.remove('active');
  });

  // --- Mission Countdown Timer Modal ---
  btnTimer.addEventListener('click', () => {
    timerModal.classList.add('active');
  });

  document.querySelectorAll('.btn-preset-timer').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = parseInt(btn.dataset.mins, 10);
      startTimer(mins * 60);
    });
  });

  function startTimer(seconds) {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerSecondsLeft = seconds;
    updateTimerDisplay();

    state.timerInterval = setInterval(() => {
      state.timerSecondsLeft--;
      updateTimerDisplay();

      if (state.timerSecondsLeft <= 0) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        window.soundFx.playCheer();
        document.getElementById('timerDigits').textContent = 'HẾT GIỜ! 🎉';
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const mins = Math.floor(state.timerSecondsLeft / 60);
    const secs = state.timerSecondsLeft % 60;
    document.getElementById('timerDigits').textContent = 
      `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  document.getElementById('closeTimerModalBtn').addEventListener('click', () => {
    if (state.timerInterval) clearInterval(state.timerInterval);
    timerModal.classList.remove('active');
  });

  // --- Parent QR Code & Link Modal ---
  let serverNetworkInfo = null;

  // Pre-fetch network info
  async function fetchServerNetworkInfo() {
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/info');
        if (res.ok) {
          serverNetworkInfo = await res.json();
        }
      } catch (e) {}
    }
  }
  fetchServerNetworkInfo();

  async function openParentQrModal(studentId) {
    const student = state.data.students.find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('qrStudentName').textContent = student.name;
    const isFileProtocol = window.location.protocol === 'file:';
    const warningBox = document.getElementById('fileProtocolWarning');
    if (warningBox) {
      warningBox.style.display = isFileProtocol ? 'block' : 'none';
    }

    if (!serverNetworkInfo) {
      await fetchServerNetworkInfo();
    }

    // Determine the best URL for parent phone access
    let baseUrl = '';
    if (window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      baseUrl = new URL('.', window.location.href).href.replace(/\/$/, '');
    } else if (serverNetworkInfo && serverNetworkInfo.publicUrl) {
      baseUrl = serverNetworkInfo.publicUrl;
    } else if (serverNetworkInfo && serverNetworkInfo.primaryIp) {
      baseUrl = `http://${serverNetworkInfo.primaryIp}:${serverNetworkInfo.port || 3000}`;
    } else if (window.location.origin && window.location.origin !== 'null' && !isFileProtocol) {
      baseUrl = new URL('.', window.location.href).href.replace(/\/$/, '');
    } else {
      baseUrl = 'http://localhost:3000';
    }

    const parentUrl = `${baseUrl}/parent.html?id=${student.id}`;

    const linkInput = document.getElementById('parentLinkInput');
    const linkAnchor = document.getElementById('parentLinkAnchor');

    if (linkInput) linkInput.value = parentUrl;
    if (linkAnchor) {
      linkAnchor.href = parentUrl;
      linkAnchor.textContent = parentUrl;
    }

    // Generate local offline QR code
    const qrContainer = document.getElementById('parentQrCanvas');
    if (qrContainer) {
      qrContainer.innerHTML = '';
      if (window.QRCode) {
        new QRCode(qrContainer, {
          text: parentUrl,
          width: 180,
          height: 180,
          colorDark: '#1E293B',
          colorLight: '#FFFFFF',
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(parentUrl)}" style="width: 180px; height: 180px; display: block; border-radius: 12px;" alt="QR Code">`;
      }
    }

    parentQrModal.classList.add('active');
  }

  document.getElementById('btnCopyParentLink').addEventListener('click', async () => {
    const input = document.getElementById('parentLinkInput');
    const url = input.value;
    try {
      await navigator.clipboard.writeText(url);
      alert('🎉 Đã sao chép link phụ huynh thành công!\nCô chỉ cần mở Zalo và ấn Ctrl + V để gửi cho bố mẹ bé nhé.');
    } catch (e) {
      input.style.display = 'block';
      input.select();
      document.execCommand('copy');
      input.style.display = 'none';
      alert('🎉 Đã sao chép link phụ huynh thành công!');
    }
  });

  document.getElementById('btnOpenParentPortal').addEventListener('click', () => {
    const input = document.getElementById('parentLinkInput');
    window.open(input.value, '_blank');
  });

  document.getElementById('closeParentQrBtn').addEventListener('click', () => {
    parentQrModal.classList.remove('active');
  });

  // --- Shared Class Link for All Parents Modal ---
  const btnShareClassLink = document.getElementById('btnShareClassLink');
  const sharedClassLinkModal = document.getElementById('sharedClassLinkModal');
  const closeSharedClassLinkBtn = document.getElementById('closeSharedClassLinkBtn');
  const sharedClassLinkAnchor = document.getElementById('sharedClassLinkAnchor');
  const sharedClassQrCanvas = document.getElementById('sharedClassQrCanvas');
  const btnCopySharedClassMessage = document.getElementById('btnCopySharedClassMessage');
  const btnOpenSharedClassPortal = document.getElementById('btnOpenSharedClassPortal');

  let currentSharedParentUrl = '';

  btnShareClassLink.addEventListener('click', async () => {
    if (!serverNetworkInfo) {
      await fetchServerNetworkInfo();
    }

    let baseUrl = '';
    if (window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      baseUrl = new URL('.', window.location.href).href.replace(/\/$/, '');
    } else if (serverNetworkInfo && serverNetworkInfo.publicUrl) {
      baseUrl = serverNetworkInfo.publicUrl;
    } else if (serverNetworkInfo && serverNetworkInfo.primaryIp) {
      baseUrl = `http://${serverNetworkInfo.primaryIp}:${serverNetworkInfo.port || 3000}`;
    } else if (window.location.origin && window.location.origin !== 'null' && !window.location.protocol.startsWith('file')) {
      baseUrl = new URL('.', window.location.href).href.replace(/\/$/, '');
    } else {
      baseUrl = 'http://localhost:3000';
    }

    currentSharedParentUrl = `${baseUrl}/parent.html`;

    sharedClassLinkAnchor.href = currentSharedParentUrl;
    sharedClassLinkAnchor.textContent = currentSharedParentUrl;

    // Render offline QR
    if (sharedClassQrCanvas) {
      sharedClassQrCanvas.innerHTML = '';
      if (window.QRCode) {
        new QRCode(sharedClassQrCanvas, {
          text: currentSharedParentUrl,
          width: 180,
          height: 180,
          colorDark: '#4C1D95',
          colorLight: '#FFFFFF',
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        sharedClassQrCanvas.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(currentSharedParentUrl)}" style="width: 180px; height: 180px; display: block; border-radius: 12px;" alt="QR Code">`;
      }
    }

    sharedClassLinkModal.classList.add('active');
  });

  closeSharedClassLinkBtn.addEventListener('click', () => {
    sharedClassLinkModal.classList.remove('active');
  });

  btnCopySharedClassMessage.addEventListener('click', async () => {
    const className = state.data.className || 'Lớp 1A';
    const message = `🌸 Kính gửi quý phụ huynh ${className}!\nCô gửi đường link theo dõi tiến trình ấp trứng và tự chấm điểm rèn luyện tại nhà (Đọc, Viết, Dặn dò) của các con:\n👉 ${currentSharedParentUrl}\n(Bố mẹ mở link trên điện thoại bằng 4G hoặc Wifi ở nhà bất kỳ để tự chấm cho con nhé! Bố mẹ có thể bấm "Thêm vào Màn hình chính" để cài thành app tiện dùng mỗi tối).`;

    try {
      await navigator.clipboard.writeText(message);
      alert('🎉 Đã sao chép tin nhắn kèm link Zalo thành công!\nCô chỉ cần mở nhóm Zalo của lớp và ấn Ctrl + V để gửi cho toàn thể phụ huynh nhé.');
    } catch (e) {
      alert('Đường link của lớp:\n' + currentSharedParentUrl);
    }
  });

  btnOpenSharedClassPortal.addEventListener('click', () => {
    window.open(currentSharedParentUrl, '_blank');
  });

  // Nút lối tắt Lấy Link Zalo Phụ Huynh trên bảng tổng hợp
  const btnQuickShareLink = document.getElementById('btnQuickShareLink');
  if (btnQuickShareLink && btnShareClassLink) {
    btnQuickShareLink.addEventListener('click', () => {
      btnShareClassLink.click();
    });
  }

  // Hỗ trợ cuộn chuột lăn ngang mượt mà trên thanh công cụ header
  const headerActionsEl = document.querySelector('.header-actions');
  if (headerActionsEl) {
    headerActionsEl.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        headerActionsEl.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  }

  // Xử lý bật/tắt mở rộng thanh công cụ tiện ích trên điện thoại
  const btnToggleMobileTools = document.getElementById('btnToggleMobileTools');
  const btnCloseMobileTools = document.getElementById('btnCloseMobileTools');
  const headerActionsMenu = document.getElementById('headerActionsMenu');
  const mobileToolsToggleArrow = document.getElementById('mobileToolsToggleArrow');
  const mobileToolsToggleText = document.getElementById('mobileToolsToggleText');

  function toggleMobileTools(forceState) {
    if (!headerActionsMenu) return;
    const shouldOpen = typeof forceState === 'boolean' 
      ? forceState 
      : !headerActionsMenu.classList.contains('show-mobile');
    
    if (shouldOpen) {
      headerActionsMenu.classList.add('show-mobile');
      if (btnToggleMobileTools) btnToggleMobileTools.classList.add('active');
      if (mobileToolsToggleArrow) mobileToolsToggleArrow.textContent = '▴';
      if (mobileToolsToggleText) mobileToolsToggleText.textContent = 'Đóng tiện ích';
    } else {
      headerActionsMenu.classList.remove('show-mobile');
      if (btnToggleMobileTools) btnToggleMobileTools.classList.remove('active');
      if (mobileToolsToggleArrow) mobileToolsToggleArrow.textContent = '▾';
      if (mobileToolsToggleText) mobileToolsToggleText.textContent = 'Tiện ích (13)';
    }
  }

  if (btnToggleMobileTools) {
    btnToggleMobileTools.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileTools();
    });
  }

  if (btnCloseMobileTools) {
    btnCloseMobileTools.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileTools(false);
    });
  }

  // Mở app thành Cửa Sổ Mini nổi (dành riêng cho khi đang chiếu PowerPoint bài giảng)
  const btnOpenMiniWindow = document.getElementById('btnOpenMiniWindow');
  if (btnOpenMiniWindow) {
    btnOpenMiniWindow.addEventListener('click', () => {
      const width = 430;
      const height = 760;
      const left = Math.max(10, (window.screen.availWidth || 1366) - width - 20);
      const top = 30;
      const miniWin = window.open(
        'mobile.html',
        'MiniClassroomWindow',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes`
      );
      if (miniWin) {
        miniWin.focus();
      }
    });
  }

  // Tự động đóng menu tiện ích trên mobile khi cô bấm vào một chức năng (để modal mở ra không bị che)
  if (headerActionsMenu) {
    headerActionsMenu.querySelectorAll('.btn-header').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          toggleMobileTools(false);
        }
      });
    });
  }

  // --- Zalo Certificate Export Modal ---
  async function openCardExportModal(studentId) {
    const student = state.data.students.find(s => s.id === studentId);
    const group = state.data.groups.find(g => g.id === student.group);
    if (!student) return;

    const canvas = await CardExporter.generateCard(student, group);
    const previewContainer = document.getElementById('cardCanvasPreview');
    previewContainer.innerHTML = '';
    previewContainer.appendChild(canvas);

    document.getElementById('btnDownloadCard').onclick = () => {
      CardExporter.download(canvas, student.name);
    };

    document.getElementById('btnCopyCard').onclick = async () => {
      const ok = await CardExporter.copyToClipboard(canvas);
      if (ok) {
        alert('Đã sao chép ảnh! Cô chỉ cần mở Zalo và ấn Ctrl + V để gửi cho phụ huynh.');
      } else {
        alert('Trình duyệt không hỗ trợ sao chép ảnh trực tiếp, cô hãy ấn nút "Tải ảnh về máy" nhé!');
      }
    };

    cardPreviewModal.classList.add('active');
  }

  // --- Import & Manage Students Modal ---
  const btnImportStudents = document.getElementById('btnImportStudents');
  const importModal = document.getElementById('importModal');
  const closeImportModalBtn = document.getElementById('closeImportModalBtn');

  const subTabPasteBtn = document.getElementById('subTabPasteBtn');
  const subTabFileBtn = document.getElementById('subTabFileBtn');
  const subTabCurrentBtn = document.getElementById('subTabCurrentBtn');

  const panelPasteText = document.getElementById('panelPasteText');
  const panelUploadFile = document.getElementById('panelUploadFile');
  const panelCurrentList = document.getElementById('panelCurrentList');

  const pasteStudentsTextarea = document.getElementById('pasteStudentsTextarea');
  const autoAssignGroupsCheckbox = document.getElementById('autoAssignGroupsCheckbox');
  const replaceExistingCheckbox = document.getElementById('replaceExistingCheckbox');
  const btnApplyPasteStudents = document.getElementById('btnApplyPasteStudents');

  const studentFileInput = document.getElementById('studentFileInput');
  const btnBrowseFile = document.getElementById('btnBrowseFile');
  const selectedFileName = document.getElementById('selectedFileName');
  const btnProcessFile = document.getElementById('btnProcessFile');
  const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');

  const currentTotalStudents = document.getElementById('currentTotalStudents');
  const currentStudentsTableContainer = document.getElementById('currentStudentsTableContainer');
  const btnExportStudentsCsv = document.getElementById('btnExportStudentsCsv');
  const btnClearAllStudents = document.getElementById('btnClearAllStudents');

  let uploadedFileContent = null;

  function switchImportSubTab(activeTab) {
    [subTabPasteBtn, subTabFileBtn, subTabCurrentBtn].forEach(b => b.classList.remove('primary'));
    [panelPasteText, panelUploadFile, panelCurrentList].forEach(p => p.style.display = 'none');

    if (activeTab === 'paste') {
      subTabPasteBtn.classList.add('primary');
      panelPasteText.style.display = 'block';
    } else if (activeTab === 'file') {
      subTabFileBtn.classList.add('primary');
      panelUploadFile.style.display = 'block';
    } else if (activeTab === 'current') {
      subTabCurrentBtn.classList.add('primary');
      panelCurrentList.style.display = 'block';
      renderCurrentStudentsTable();
    }
  }

  subTabPasteBtn.addEventListener('click', () => switchImportSubTab('paste'));
  subTabFileBtn.addEventListener('click', () => switchImportSubTab('file'));
  subTabCurrentBtn.addEventListener('click', () => switchImportSubTab('current'));

  btnImportStudents.addEventListener('click', () => {
    switchImportSubTab('paste');
    importModal.classList.add('active');
  });

  closeImportModalBtn.addEventListener('click', () => {
    importModal.classList.remove('active');
  });

  // Action 1: Apply Paste List
  btnApplyPasteStudents.addEventListener('click', () => {
    const text = pasteStudentsTextarea.value.trim();
    if (!text) {
      alert('Cô hãy dán danh sách tên học sinh vào ô trước nhé!');
      return;
    }

    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const autoGroup = autoAssignGroupsCheckbox.checked;
    const replaceOld = replaceExistingCheckbox.checked;

    const updatedData = StorageManager.importStudentsList(lines, autoGroup, replaceOld);
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      window.FirebaseSync.setClassData(updatedData);
    }
    window.soundFx.playCheer();
    pasteStudentsTextarea.value = '';
    importModal.classList.remove('active');
    refreshData();
    alert(`🎉 Đã cập nhật thành công ${lines.length} học sinh vào lớp và đồng bộ lên Đám Mây cho phụ huynh!`);
  });

  // Action 2: File upload
  btnBrowseFile.addEventListener('click', () => {
    studentFileInput.click();
  });

  studentFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    selectedFileName.textContent = `Đã chọn: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    const reader = new FileReader();
    reader.onload = (event) => {
      uploadedFileContent = event.target.result;
      btnProcessFile.disabled = false;
    };
    reader.readAsText(file, 'utf-8');
  });

  btnProcessFile.addEventListener('click', () => {
    if (!uploadedFileContent) return;

    // Parse CSV or Text
    const lines = uploadedFileContent.split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);

    // If first line is header like "Họ và tên", remove it
    if (lines.length > 0 && /họ\s*và\s*tên|stt|name/i.test(lines[0])) {
      lines.shift();
    }

    if (lines.length === 0) {
      alert('File không có danh sách tên học sinh hợp lệ!');
      return;
    }

    const updatedData = StorageManager.importStudentsList(lines, true, true);
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      window.FirebaseSync.setClassData(updatedData);
    }
    window.soundFx.playCheer();
    importModal.classList.remove('active');
    refreshData();
    alert(`🎉 Đã nhập thành công ${lines.length} học sinh từ file và đồng bộ lên Đám Mây cho phụ huynh!`);
  });

  // Action 3: Download template
  btnDownloadTemplate.addEventListener('click', () => {
    const templateContent = '\uFEFF"Họ và tên","Tổ"\n"Nguyễn Bảo An","1"\n"Trần Minh Khôi","1"\n"Lê Tuệ Mẫn","2"\n"Phạm Gia Huy","2"\n"Vũ Ngọc Hân","3"\n"Đỗ Đức Anh","3"\n"Hoàng Thùy Chi","4"\n"Bùi Quang Dũng","4"\n';
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mau_danh_sach_hoc_sinh_lop1.csv';
    link.click();
  });

  // Action 4: Render current students in table
  function renderCurrentStudentsTable() {
    const { students, groups } = state.data;
    currentTotalStudents.textContent = students.length;

    if (students.length === 0) {
      currentStudentsTableContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #94A3B8; font-size: 14px;">
          Lớp hiện chưa có học sinh nào. Cô hãy dán danh sách hoặc tải file lên nhé!
        </div>
      `;
      return;
    }

    let html = `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
        <thead style="background: #F8FAFC; position: sticky; top: 0;">
          <tr>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0;">STT</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0;">Họ và Tên</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0;">Tổ</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0;">Sao</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">Thao tác</th>
          </tr>
        </thead>
        <tbody>
    `;

    students.forEach((s, idx) => {
      html += `
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="padding: 8px 10px; color: #64748B;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 700; color: #1E293B;">${s.name}</td>
          <td style="padding: 8px 10px;">
            <select class="select-change-group" data-id="${s.id}" style="padding: 4px 8px; border-radius: 8px; border: 1px solid #CBD5E1; font-family: inherit; font-size: 12px; font-weight: 600;">
              ${groups.map(g => `
                <option value="${g.id}" ${g.id === s.group ? 'selected' : ''}>${g.name.split('-')[0].trim()}</option>
              `).join('')}
            </select>
          </td>
          <td style="padding: 8px 10px; font-weight: 800; color: #D97706;">⭐ ${s.stars}</td>
          <td style="padding: 8px 10px; text-align: center; white-space: nowrap;">
            <button class="btn-edit-student-table" data-id="${s.id}" style="background: #EEF2FF; border: none; color: #4338CA; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-right: 4px;" title="Sửa tên học sinh">
              ✏️
            </button>
            <button class="btn-delete-student" data-id="${s.id}" style="background: #FEE2E2; border: none; color: #DC2626; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;" title="Xóa học sinh này">
              🗑️
            </button>
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    currentStudentsTableContainer.innerHTML = html;

    // Attach group change
    currentStudentsTableContainer.querySelectorAll('.select-change-group').forEach(select => {
      select.addEventListener('change', (e) => {
        const studentId = e.target.dataset.id;
        const newGroup = e.target.value;
        StorageManager.updateStudentGroup(studentId, newGroup);
        refreshData();
      });
    });

    // Attach edit student
    currentStudentsTableContainer.querySelectorAll('.btn-edit-student-table').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const studentId = btn.dataset.id;
        openEditStudentModal(studentId);
      });
    });

    // Attach delete student
    currentStudentsTableContainer.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const studentId = btn.dataset.id;
        deleteStudentConfirm(studentId);
        renderCurrentStudentsTable();
      });
    });
  }

  // Action 5: Export CSV
  btnExportStudentsCsv.addEventListener('click', () => {
    const csvData = StorageManager.exportCSV();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `danh_sach_lop1_${Date.now()}.csv`;
    link.click();
  });

  // Action 6: Clear all
  btnClearAllStudents.addEventListener('click', () => {
    if (confirm('⚠️ Cô có chắc muốn xóa toàn bộ học sinh để làm mới lớp học?')) {
      StorageManager.clearAllStudents();
      renderCurrentStudentsTable();
      refreshData();
    }
  });

  document.getElementById('closeCardModalBtn').addEventListener('click', () => {
    cardPreviewModal.classList.remove('active');
  });

  // --- 🎁 Weekly Summary & Gift Award Modal Controller ---
  const btnWeeklyRewards = document.getElementById('btnWeeklyRewards');
  const weeklySummaryModal = document.getElementById('weeklySummaryModal');
  const closeWeeklyModalBtn = document.getElementById('closeWeeklyModalBtn');
  const weeklyHatchedCount = document.getElementById('weeklyHatchedCount');
  const weeklyInProgressCount = document.getElementById('weeklyInProgressCount');
  const weeklyTotalStarsClass = document.getElementById('weeklyTotalStarsClass');
  const weeklyFilterAllBtn = document.getElementById('weeklyFilterAllBtn');
  const weeklyFilterHatchedBtn = document.getElementById('weeklyFilterHatchedBtn');
  const weeklyFilterGrowingBtn = document.getElementById('weeklyFilterGrowingBtn');
  const countAllFilter = document.getElementById('countAllFilter');
  const countHatchedFilter = document.getElementById('countHatchedFilter');
  const countGrowingFilter = document.getElementById('countGrowingFilter');
  const weeklyRankingList = document.getElementById('weeklyRankingList');
  const btnCopyWeeklyZaloMessage = document.getElementById('btnCopyWeeklyZaloMessage');
  const btnWeeklyResetToZero = document.getElementById('btnWeeklyResetToZero');

  let currentWeeklyFilter = 'all';

  function renderWeeklySummary() {
    const summary = StorageManager.getWeeklySummary();
    const todayStr = StorageManager.getTodayDateString();

    const totalStars = summary.rankedStudents.reduce((acc, s) => acc + (s.stars || 0), 0);
    weeklyHatchedCount.textContent = summary.hatchedCount;
    weeklyInProgressCount.textContent = summary.inProgressCount;
    weeklyTotalStarsClass.textContent = totalStars;

    countAllFilter.textContent = summary.totalStudents;
    countHatchedFilter.textContent = summary.hatchedCount;
    countGrowingFilter.textContent = summary.inProgressCount;

    [weeklyFilterAllBtn, weeklyFilterHatchedBtn, weeklyFilterGrowingBtn].forEach(b => b.classList.remove('primary'));
    if (currentWeeklyFilter === 'all') weeklyFilterAllBtn.classList.add('primary');
    else if (currentWeeklyFilter === 'hatched') weeklyFilterHatchedBtn.classList.add('primary');
    else if (currentWeeklyFilter === 'growing') weeklyFilterGrowingBtn.classList.add('primary');

    let displayList = summary.rankedStudents;
    if (currentWeeklyFilter === 'hatched') displayList = summary.hatched;
    else if (currentWeeklyFilter === 'growing') displayList = summary.inProgress;

    if (displayList.length === 0) {
      weeklyRankingList.innerHTML = `
        <div style="text-align: center; color: #94A3B8; padding: 24px 0; font-weight: 700;">
          Không có học sinh nào trong mục này.
        </div>
      `;
      return;
    }

    weeklyRankingList.innerHTML = displayList.map((s) => {
      // Find actual overall rank
      const overallRank = summary.rankedStudents.findIndex(item => item.id === s.id) + 1;
      let medal = `#${overallRank}`;
      if (overallRank === 1) medal = '🥇';
      else if (overallRank === 2) medal = '🥈';
      else if (overallRank === 3) medal = '🥉';

      const group = state.data.groups.find(g => g.id === s.group) || { name: `Tổ ${s.group}`, color: '#FF6B6B' };
      const isHatched = (s.stars || 0) >= 71;
      const stage = window.EggEvolution.getStage(s.stars);
      const hwToday = s.homeworkRecords ? s.homeworkRecords[todayStr] : null;

      return `
        <div style="background: #FFFFFF; border: 2px solid ${isHatched ? '#86EFAC' : '#E2E8F0'}; border-radius: 16px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: ${overallRank <= 3 ? '22px' : '15px'}; font-weight: 800; width: 32px; text-align: center; color: #64748B;">
              ${medal}
            </div>
            <div style="width: 44px; height: 44px; flex-shrink: 0;">
              ${window.EggEvolution.renderPetSVG(s.stars, s.status, group.color)}
            </div>
            <div>
              <div style="font-weight: 800; font-size: 15px; color: #1E293B;">
                ${s.name}
                <span style="font-size: 11px; padding: 2px 8px; border-radius: 10px; background: ${group.color}; color: #FFF; margin-left: 4px; font-weight: 700;">
                  ${group.name.split('-')[0].trim()}
                </span>
              </div>
              <div style="font-size: 12px; margin-top: 2px;">
                ${isHatched 
                  ? `<span style="color: #059669; font-weight: 800; background: #D1FAE5; padding: 2px 8px; border-radius: 8px;">🎉 ${stage.name} - Đủ điều kiện nhận Quà Lớn!</span>` 
                  : `<span style="color: #B45309; font-weight: 700; background: #FEF3C7; padding: 2px 8px; border-radius: 8px;">🥚 Đang ấp - Còn thiếu ${71 - s.stars}⭐ để nở</span>`
                }
              </div>
              ${hwToday ? `
                <div style="font-size: 11px; color: #4F46E5; font-weight: 700; margin-top: 4px;">
                  📖 Đọc ${hwToday.readingCount} lần • ✍️ Viết mức ${hwToday.writingStars} • 🎒 Dặn dò (+${hwToday.choresStars}⭐)
                </div>
              ` : ''}
            </div>
          </div>

          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 20px; font-weight: 800; color: ${isHatched ? '#059669' : '#D97706'}; background: ${isHatched ? '#ECFDF5' : '#FFFBEB'}; padding: 4px 12px; border-radius: 16px; border: 1px solid ${isHatched ? '#A7F3D0' : '#FDE68A'};">
              ⭐ ${s.stars}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  if (btnWeeklyRewards) {
    btnWeeklyRewards.addEventListener('click', () => {
      currentWeeklyFilter = 'all';
      renderWeeklySummary();
      weeklySummaryModal.classList.add('active');
    });
  }

  if (closeWeeklyModalBtn) {
    closeWeeklyModalBtn.addEventListener('click', () => {
      weeklySummaryModal.classList.remove('active');
    });
  }

  if (weeklyFilterAllBtn) {
    weeklyFilterAllBtn.addEventListener('click', () => {
      currentWeeklyFilter = 'all';
      renderWeeklySummary();
    });
  }

  if (weeklyFilterHatchedBtn) {
    weeklyFilterHatchedBtn.addEventListener('click', () => {
      currentWeeklyFilter = 'hatched';
      renderWeeklySummary();
    });
  }

  if (weeklyFilterGrowingBtn) {
    weeklyFilterGrowingBtn.addEventListener('click', () => {
      currentWeeklyFilter = 'growing';
      renderWeeklySummary();
    });
  }

  // Copy Weekly Zalo Message
  if (btnCopyWeeklyZaloMessage) {
    btnCopyWeeklyZaloMessage.addEventListener('click', async () => {
      const summary = StorageManager.getWeeklySummary();
      let text = `🌟 BẢNG VINH DANH & TRAO QUÀ TUẦN LỚP 1A 🌟\n`;
      text += `(Quy định lớp: Tích lũy > 70 ⭐ linh thú nở & nhận Quà Đặc Biệt!)\n\n`;

      text += `🏆 TOP 3 BẠN DẪN ĐẦU TUẦN NÀY:\n`;
      const medals = ['🥇', '🥈', '🥉'];
      summary.rankedStudents.slice(0, 3).forEach((s, idx) => {
        text += `${medals[idx]} ${s.name} - ⭐ ${s.stars} sao\n`;
      });
      text += `\n`;

      if (summary.hatched.length > 0) {
        text += `🎉 DANH SÁCH BÉ ĐÃ NỞ LINH THÚ (NHẬN QUÀ ĐẶC BIỆT 🎁):\n`;
        summary.hatched.forEach((s, idx) => {
          const stage = window.EggEvolution.getStage(s.stars);
          text += `${idx + 1}. ${s.name} - ⭐ ${s.stars} sao (${stage.name})\n`;
        });
        text += `\n`;
      }

      if (summary.inProgress.length > 0) {
        text += `🥚 CÁC BÉ ĐANG TÍCH CỰC ẤP TRỨNG:\n`;
        summary.inProgress.forEach((s, idx) => {
          text += `${idx + 1}. ${s.name} - ⭐ ${s.stars} sao (Còn thiếu ${71 - s.stars}⭐ để trứng nở)\n`;
        });
        text += `\n`;
      }

      text += `❤️ Cô khen ngợi tất cả các con đã chăm chỉ rèn đọc bài, luyện viết nắn nót và chuẩn bị bài chu đáo mỗi tối. Cảm ơn quý phụ huynh đã luôn đồng hành cùng các con!`;

      try {
        await navigator.clipboard.writeText(text);
        alert('📋 Đã sao chép nội dung bảng trao quà tuần! Cô chỉ cần dán (Ctrl+V) vào nhóm Zalo lớp nhé.');
      } catch (err) {
        prompt('Cô copy văn bản báo cáo bên dưới nhé:', text);
      }
    });
  }

  // --- 🔄 Reset to Zero Controller ---
  const btnResetStars = document.getElementById('btnResetStars');
  const resetZeroModal = document.getElementById('resetZeroModal');
  const closeResetZeroModalBtn = document.getElementById('closeResetZeroModalBtn');
  const btnCancelResetZero = document.getElementById('btnCancelResetZero');
  const btnConfirmResetZero = document.getElementById('btnConfirmResetZero');

  function openResetModal() {
    resetZeroModal.classList.add('active');
  }

  function closeResetModal() {
    resetZeroModal.classList.remove('active');
  }

  if (btnResetStars) btnResetStars.addEventListener('click', openResetModal);
  if (btnWeeklyResetToZero) btnWeeklyResetToZero.addEventListener('click', openResetModal);
  if (closeResetZeroModalBtn) closeResetZeroModalBtn.addEventListener('click', closeResetModal);
  if (btnCancelResetZero) btnCancelResetZero.addEventListener('click', closeResetModal);

  if (btnConfirmResetZero) {
    btnConfirmResetZero.addEventListener('click', () => {
      StorageManager.resetAllToZero();
      if (window.soundFx) window.soundFx.playLevelUp();
      closeResetModal();
      if (weeklySummaryModal) weeklySummaryModal.classList.remove('active');
      refreshData();
      alert('✨ Toàn bộ học sinh và các tổ đã quay về 0 điểm thành công! Tất cả các con vật đã trở về quả trứng để các em bắt đầu hành trình ấp trứng mới.');
    });
  }

  // Close modals when clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.remove('active');
        if (backdrop.id === 'noiseModal') noiseMeter.stop();
      }
    });
  });

  // --- Hatch Celebration Popup for Teacher ---
  let lastHatchedStudent = null;
  function showHatchCelebration(student) {
    const hatchModal = document.getElementById('hatchCelebrationModal');
    if (!hatchModal) return;

    lastHatchedStudent = student;
    document.getElementById('hatchCelebrationStudentName').textContent = student.name;
    document.getElementById('hatchCelebrationStars').textContent = student.stars;

    const stage = window.EggEvolution.getStage(student.stars);
    document.getElementById('hatchCelebrationStageTitle').textContent = `🦖 ${stage.title}`;

    const group = (state.data.groups || []).find(g => g.id === student.group);
    const color = group ? group.color : null;
    document.getElementById('hatchCelebrationPetAvatar').innerHTML = window.EggEvolution.renderPetSVG(student.stars, student.status, color);

    if (window.soundFx && typeof window.soundFx.playLevelUp === 'function') {
      window.soundFx.playLevelUp();
    } else if (window.soundFx && typeof window.soundFx.playStar === 'function') {
      window.soundFx.playStar();
    }

    hatchModal.classList.add('active');
  }

  const btnAckHatchCelebration = document.getElementById('btnAckHatchCelebration');
  if (btnAckHatchCelebration) {
    btnAckHatchCelebration.addEventListener('click', () => {
      document.getElementById('hatchCelebrationModal').classList.remove('active');
    });
  }

  const btnOpenGiftFromCelebration = document.getElementById('btnOpenGiftFromCelebration');
  if (btnOpenGiftFromCelebration) {
    btnOpenGiftFromCelebration.addEventListener('click', () => {
      document.getElementById('hatchCelebrationModal').classList.remove('active');
      if (lastHatchedStudent) {
        openGiftClaimModal(lastHatchedStudent.id);
      }
    });
  }

  // --- Hatched List Modal (Bảng Danh Sách Trứng Đã Nở & Quà Nhận) ---
  const btnHatchedList = document.getElementById('btnHatchedList');
  const hatchedListModal = document.getElementById('hatchedListModal');
  const closeHatchedListBtn = document.getElementById('closeHatchedListBtn');
  const btnCloseHatchedListModal = document.getElementById('btnCloseHatchedListModal');
  const hatchedTableContainer = document.getElementById('hatchedTableContainer');
  const hatchedSummaryText = document.getElementById('hatchedSummaryText');

  function openHatchedListModal() {
    const students = state.data.students || [];
    const hatchedList = students.filter(s => (s.stars || 0) >= 100);

    hatchedList.sort((a, b) => (b.stars || 0) - (a.stars || 0));

    if (hatchedList.length === 0) {
      const sortedByStars = [...students].sort((a, b) => (b.stars || 0) - (a.stars || 0));
      const closest = sortedByStars[0];
      const needed = closest ? Math.max(0, 100 - closest.stars) : 100;

      hatchedTableContainer.innerHTML = `
        <div style="text-align: center; padding: 36px 20px;">
          <div style="font-size: 44px; margin-bottom: 8px;">🥚⏳</div>
          <div style="font-size: 16px; font-weight: 800; color: #1E293B; margin-bottom: 6px;">
            Chưa có bé nào đạt mốc trứng nở (100 ⭐)
          </div>
          <p style="font-size: 13px; color: #64748B; max-width: 420px; margin: 0 auto 14px;">
            ${closest ? `Bé đang dẫn đầu gần nở nhất là <strong>${closest.name}</strong> (${closest.stars}/100 ⭐ - chỉ còn thiếu <strong>${needed} ⭐</strong> nữa)!` : 'Cả lớp hãy cùng thi đua tích sao nhé!'}
          </p>
        </div>
      `;
      if (hatchedSummaryText) hatchedSummaryText.textContent = 'Cả lớp đang trong giai đoạn ấp trứng';
    } else {
      hatchedTableContainer.innerHTML = `
        <table class="hatched-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">STT</th>
              <th>Học Sinh</th>
              <th>Tổ</th>
              <th>Linh Thú Đã Nở</th>
              <th style="text-align: center;">Tổng ⭐</th>
              <th style="text-align: center;">🎁 Quà Đã Nhận (2 Lượt)</th>
              <th style="text-align: center; width: 110px;">Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${hatchedList.map((s, idx) => {
              const group = (state.data.groups || []).find(g => g.id === s.group) || { name: `Tổ ${s.group}`, color: '#64748B' };
              const stage = window.EggEvolution.getStage(s.stars);
              let hatchedDateStr = 'Đã nở';
              if (s.hatchedAt) {
                const d = new Date(Number(s.hatchedAt));
                hatchedDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              }

              const gifts = s.giftHistory || [];
              let giftColHtml = '';
              if (gifts.length === 0) {
                giftColHtml = `
                  <div style="font-size: 11px; color: #DC2626; font-weight: 700; margin-bottom: 4px;">Chưa mở (còn 2 lượt)</div>
                  <button class="btn-fast-reward btn-open-gift-for-student" data-id="${s.id}" style="padding: 3px 8px; font-size: 11px; background: linear-gradient(135deg, #EC4899, #BE185D); color: #fff; margin: 0 auto;">
                    🎁 Cho Bé Mở Quà
                  </button>
                `;
              } else if (gifts.length === 1) {
                giftColHtml = `
                  <div><span class="gift-tag-badge" style="background: #FCE7F3; color: #BE185D; border-color: #FBCFE8;">${gifts[0].icon || '🎁'} ${gifts[0].name}</span></div>
                  <div style="margin-top: 4px;">
                    <button class="btn-fast-reward btn-open-gift-for-student" data-id="${s.id}" style="padding: 2px 8px; font-size: 10px; background: linear-gradient(135deg, #EC4899, #BE185D); color: #fff; margin: 0 auto;">
                      🎁 Mở lượt 2
                    </button>
                  </div>
                `;
              } else {
                giftColHtml = `
                  <div style="display: flex; flex-direction: column; gap: 4px; align-items: center;">
                    ${gifts.map(g => `<span class="gift-tag-badge" style="background: #FCE7F3; color: #BE185D; border-color: #FBCFE8;">${g.icon || '🎁'} ${g.name}</span>`).join('')}
                    <div style="font-size: 10px; color: #059669; font-weight: 700;">✅ Đã nhận đủ 2 quà</div>
                  </div>
                `;
              }

              return `
                <tr>
                  <td style="text-align: center; font-weight: 800; color: #64748B;">${idx + 1}</td>
                  <td>
                    <div style="font-weight: 800; color: #1E293B; font-size: 14px;">${s.name}</div>
                    <div style="font-size: 11px; color: #059669; font-weight: 700;">Nở ngày: ${hatchedDateStr}</div>
                  </td>
                  <td>
                    <span style="background: ${group.color}; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 10px;">
                      ${group.name.split('-')[0].trim()}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <div style="width: 36px; height: 36px;">
                        ${window.EggEvolution.renderPetSVG(s.stars, s.status, group.color)}
                      </div>
                      <div>
                        <div style="font-weight: 800; font-size: 13px; color: #065F46;">${stage.title}</div>
                        <div style="font-size: 11px; color: #64748B;">Cấp ${stage.level} • Tiếp tục tiến hóa ✨</div>
                      </div>
                    </div>
                  </td>
                  <td style="text-align: center;">
                    <span style="background: #FEF3C7; color: #B45309; font-size: 14px; font-weight: 800; padding: 4px 10px; border-radius: 12px; border: 1px solid #FDE68A;">
                      ⭐ ${s.stars}
                    </span>
                  </td>
                  <td style="text-align: center;">
                    ${giftColHtml}
                  </td>
                  <td style="text-align: center;">
                    <button class="btn-fast-reward hand btn-reward-hatched" data-id="${s.id}" style="padding: 4px 10px; font-size: 12px; margin: 0 auto;">
                      👏 Khen Thưởng
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      if (hatchedSummaryText) {
        hatchedSummaryText.textContent = `Tổng cộng: ${hatchedList.length}/${students.length} bé đã nở linh thú`;
      }

      hatchedTableContainer.querySelectorAll('.btn-reward-hatched').forEach(btn => {
        btn.addEventListener('click', () => {
          hatchedListModal.classList.remove('active');
          openActionModal(btn.dataset.id);
        });
      });

      hatchedTableContainer.querySelectorAll('.btn-open-gift-for-student').forEach(btn => {
        btn.addEventListener('click', () => {
          hatchedListModal.classList.remove('active');
          openGiftClaimModal(btn.dataset.id);
        });
      });
    }

    hatchedListModal.classList.add('active');
  }

  if (btnHatchedList) {
    btnHatchedList.addEventListener('click', openHatchedListModal);
  }
  if (closeHatchedListBtn) {
    closeHatchedListBtn.addEventListener('click', () => hatchedListModal.classList.remove('active'));
  }
  if (btnCloseHatchedListModal) {
    btnCloseHatchedListModal.addEventListener('click', () => hatchedListModal.classList.remove('active'));
  }

  // --- BẢNG TỔNG HỢP QUÀ TẶNG ĐÃ QUAY (MODAL CHO GIÁO VIÊN) ---
  const btnGiftSummary = document.getElementById('btnGiftSummary');
  const giftSummaryModal = document.getElementById('giftSummaryModal');
  const closeGiftSummaryBtn = document.getElementById('closeGiftSummaryBtn');
  const btnCloseGiftSummaryModal = document.getElementById('btnCloseGiftSummaryModal');
  const btnCopyGiftSummary = document.getElementById('btnCopyGiftSummary');
  const giftSummaryTableContainer = document.getElementById('giftSummaryTableContainer');
  const giftSummaryCountText = document.getElementById('giftSummaryCountText');

  function openGiftSummaryModal() {
    const records = StorageManager.getGiftSummaryRecords();
    if (!records || records.length === 0) {
      giftSummaryTableContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 44px; margin-bottom: 8px;">🎁📋</div>
          <div style="font-size: 16px; font-weight: 800; color: #1E293B;">Chưa có phần quà nào được ghi nhận</div>
          <p style="font-size: 13px; color: #64748B; margin-top: 6px; max-width: 440px; margin-left: auto; margin-right: auto;">
            Khi học sinh đạt đủ 100 ⭐ và hoàn tất quay 2 lượt quà (trên máy cô hoặc phụ huynh), hệ thống sẽ tự động lưu vào bảng này và chuyển trứng của bé về 0 ⭐ để bắt đầu chu kỳ ấp mới.
          </p>
        </div>
      `;
      if (giftSummaryCountText) giftSummaryCountText.textContent = 'Tổng cộng: 0 lượt quay';
    } else {
      let html = `
        <table class="hatched-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">STT</th>
              <th>Học Sinh</th>
              <th>Tổ</th>
              <th>🎁 Quà Lượt 1</th>
              <th>🎁 Quà Lượt 2</th>
              <th style="text-align: center;">Thời Gian</th>
              <th style="text-align: center;">Nơi Quay</th>
              <th style="text-align: center; width: 120px;">Trạng Thái</th>
            </tr>
          </thead>
          <tbody>
      `;

      records.forEach((rec, idx) => {
        const sourceLabel = rec.claimedBy === 'parent' 
          ? '<span style="background: #E0E7FF; color: #4338CA; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">🏠 Phụ huynh</span>' 
          : '<span style="background: #FCE7F3; color: #BE185D; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">👩‍🏫 Tại lớp</span>';

        const isDelivered = !!rec.delivered;

        html += `
          <tr style="${isDelivered ? 'background: #F0FDF4;' : ''}">
            <td style="text-align: center; font-weight: 800; color: #64748B;">${idx + 1}</td>
            <td>
              <div style="font-weight: 800; color: #1E293B; font-size: 14px;">${rec.studentName}</div>
              <div style="font-size: 11px; font-weight: 700; color: ${rec.milestone === 200 ? '#D97706' : '#2563EB'};">
                ${rec.milestone === 200 ? '👑 Mốc 200 ⭐ (Đặc biệt)' : '🎁 Mốc 100 ⭐'}
              </div>
            </td>
            <td>
              <span style="background: ${rec.groupColor || '#64748B'}; color: #FFF; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 10px;">
                ${(rec.groupName || '').split('-')[0].trim()}
              </span>
            </td>
            <td>
              <span class="gift-tag-badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; font-weight: 700;">
                ${rec.gift1 ? `${rec.gift1.icon || '🎁'} ${rec.gift1.name}` : 'Quà 1'}
              </span>
            </td>
            <td>
              <span class="gift-tag-badge" style="background: ${rec.gift2 ? '#FEF3C7' : '#F1F5F9'}; color: ${rec.gift2 ? '#92400E' : '#64748B'}; border: 1px solid ${rec.gift2 ? '#FCD34D' : '#CBD5E1'}; font-weight: 700;">
                ${rec.gift2 ? `${rec.gift2.icon || '🎁'} ${rec.gift2.name}` : '⏳ Chờ quay lượt 2'}
              </span>
            </td>
            <td style="text-align: center; font-size: 12px; color: #64748B;">
              ${rec.timeStr || ''} (${rec.dateStr || ''})
            </td>
            <td style="text-align: center;">
              ${sourceLabel}
            </td>
            <td style="text-align: center;">
              <button class="btn-fast-reward btn-toggle-delivery" data-id="${rec.id}" style="padding: 4px 10px; font-size: 12px; margin: 0 auto; background: ${isDelivered ? '#10B981' : '#F1F5F9'}; color: ${isDelivered ? '#FFF' : '#475569'}; border: 1px solid ${isDelivered ? '#059669' : '#CBD5E1'}; cursor: pointer;">
                ${isDelivered ? '✅ Đã phát' : '⏳ Chờ phát'}
              </button>
            </td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      giftSummaryTableContainer.innerHTML = html;

      const deliveredCount = records.filter(r => r.delivered).length;
      if (giftSummaryCountText) {
        giftSummaryCountText.textContent = `Tổng cộng: ${records.length} bé đã quay quà | Đã trao quà: ${deliveredCount}/${records.length} bé`;
      }

      giftSummaryTableContainer.querySelectorAll('.btn-toggle-delivery').forEach(btn => {
        btn.addEventListener('click', async () => {
          await StorageManager.toggleGiftDelivery(btn.dataset.id);
          openGiftSummaryModal();
        });
      });
    }

    giftSummaryModal.classList.add('active');
  }

  if (btnGiftSummary) {
    btnGiftSummary.addEventListener('click', openGiftSummaryModal);
  }
  if (closeGiftSummaryBtn) {
    closeGiftSummaryBtn.addEventListener('click', () => giftSummaryModal.classList.remove('active'));
  }
  if (btnCloseGiftSummaryModal) {
    btnCloseGiftSummaryModal.addEventListener('click', () => giftSummaryModal.classList.remove('active'));
  }

  if (btnCopyGiftSummary) {
    btnCopyGiftSummary.addEventListener('click', async () => {
      const records = StorageManager.getGiftSummaryRecords();
      if (!records || records.length === 0) {
        alert('Chưa có dữ liệu quà tặng để sao chép!');
        return;
      }
      let text = '🎁 DANH SÁCH TỔNG HỢP QUÀ TẶNG TRỨNG NỞ CỦA CÁC BÉ:\n';
      records.forEach((r, idx) => {
        const q1 = r.gift1 ? `${r.gift1.icon || ''} ${r.gift1.name}` : 'Quà 1';
        const q2 = r.gift2 ? `${r.gift2.icon || ''} ${r.gift2.name}` : 'Quà 2';
        const status = r.delivered ? '[Đã trao quà]' : '[Chờ trao quà]';
        text += `${idx + 1}. Bé ${r.studentName} (${r.groupName}): ${q1} + ${q2} - ${status}\n`;
      });

      try {
        await navigator.clipboard.writeText(text);
        alert('🎉 Đã sao chép bảng tổng hợp quà thành công!\nCô có thể dán (Ctrl + V) vào Zalo hoặc ghi chú để chuẩn bị quà nhé.');
      } catch (e) {
        alert(text);
      }
    });
  }

  // ========================================================
  // --- BẢNG TỔNG HỢP ĐIỂM RÈN LUYỆN TẠI NHÀ (PHỤ HUYNH) ---
  // ========================================================
  const btnParentHomeworkSummary = document.getElementById('btnParentHomeworkSummary');
  const parentHomeworkSummaryModal = document.getElementById('parentHomeworkSummaryModal');
  const closeParentHwSummaryBtn = document.getElementById('closeParentHwSummaryBtn');
  const btnCloseParentHwModal = document.getElementById('btnCloseParentHwModal');
  const btnCopyParentHwMessage = document.getElementById('btnCopyParentHwMessage');
  const parentHwDateInput = document.getElementById('parentHwDateInput');
  const btnParentHwToday = document.getElementById('btnParentHwToday');
  const parentHwTableContainer = document.getElementById('parentHwTableContainer');
  const parentHwSubmittedCount = document.getElementById('parentHwSubmittedCount');
  const parentHwTotalStudents = document.getElementById('parentHwTotalStudents');
  const parentHwTotalStars = document.getElementById('parentHwTotalStars');

  let currentHwViewDate = StorageManager.getTodayDateString ? StorageManager.getTodayDateString() : new Date().toISOString().split('T')[0];
  let currentHwViewGroup = 'all';

  function renderParentHomeworkSummary(dateStr, groupFilter = 'all') {
    if (!parentHwTableContainer) return;
    const { students, groups } = state.data;
    const targetDate = dateStr || currentHwViewDate;
    
    if (parentHwDateInput) parentHwDateInput.value = targetDate;
    if (parentHwTotalStudents) parentHwTotalStudents.textContent = (students || []).length;

    // Lọc theo tổ
    let filteredStudents = students || [];
    if (groupFilter !== 'all') {
      const gId = parseInt(groupFilter, 10);
      filteredStudents = filteredStudents.filter(s => s.group === gId);
    }

    // Thu thập danh sách bé đã nộp trong ngày targetDate
    const submissions = [];
    let dayTotalStars = 0;

    (students || []).forEach(s => {
      const rec = s.homeworkRecords ? s.homeworkRecords[targetDate] : null;
      if (rec && rec.totalStars > 0) {
        dayTotalStars += (rec.totalStars || 0);
      }
    });

    if (parentHwTotalStars) parentHwTotalStars.textContent = dayTotalStars;

    filteredStudents.forEach(s => {
      const rec = s.homeworkRecords ? s.homeworkRecords[targetDate] : null;
      if (rec && rec.totalStars > 0) {
        submissions.push({ student: s, record: rec });
      }
    });

    if (parentHwSubmittedCount) {
      parentHwSubmittedCount.textContent = (students || []).filter(s => s.homeworkRecords && s.homeworkRecords[targetDate] && s.homeworkRecords[targetDate].totalStars > 0).length;
    }

    if (submissions.length === 0) {
      parentHwTableContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="font-size: 44px; margin-bottom: 8px;">📝✨</div>
          <div style="font-size: 16px; font-weight: 800; color: #1E293B;">Chưa có phụ huynh nào gửi điểm trong ngày ${targetDate}</div>
          <p style="font-size: 13px; color: #64748B; margin-top: 6px; max-width: 460px; margin-left: auto; margin-right: auto; line-height: 1.5;">
            Khi phụ huynh mở link Zalo trên điện thoại và tự chấm bài cho con (Đọc bài, Viết bài, Dặn dò), <strong>hệ thống sẽ tự động cộng sao vào hồ sơ ấp trứng</strong> của bé và lập tức hiển thị tại đây mà cô không cần thao tác thêm.
          </p>
        </div>
      `;
      return;
    }

    let html = `
      <table class="hatched-table" style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
        <thead style="background: #F8FAFC; position: sticky; top: 0;">
          <tr>
            <th style="width: 40px; text-align: center; padding: 10px; border-bottom: 2px solid #E2E8F0;">STT</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0;">Họ và Tên Học Sinh</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">Tổ</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">📖 Rèn Đọc</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">✍️ Rèn Viết</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">🏷️ Sticker</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">🎒 Dặn Dò</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">⭐ Tổng Ngày</th>
            <th style="padding: 10px; border-bottom: 2px solid #E2E8F0; text-align: center;">Trạng Thái</th>
          </tr>
        </thead>
        <tbody>
    `;

    submissions.forEach((item, idx) => {
      const { student: s, record: rec } = item;
      const group = (groups || []).find(g => g.id === s.group) || { name: `Tổ ${s.group}`, color: '#FF6B6B' };
      const readingText = rec.readingCount > 0 ? `${rec.readingCount} lần (+${rec.readingStars}⭐)` : 'Chưa đọc';
      const writingText = rec.writingStars > 0 ? `+${rec.writingStars} ⭐` : 'Chưa chấm';
      const stickerText = (rec.stickerCount > 0) ? `<span style="background: #FCE7F3; color: #BE185D; padding: 3px 8px; border-radius: 10px; font-weight: 800; font-size: 11px;">${rec.stickerCount} cái (+${rec.stickerStars || (rec.stickerCount * 5)}⭐)</span>` : '<span style="color: #94A3B8; font-size: 12px;">0</span>';
      const choreHtml = rec.choresDone 
        ? `<span style="background: #D1FAE5; color: #047857; padding: 3px 8px; border-radius: 10px; font-weight: 800; font-size: 11px;">✅ Đạt (+5⭐)</span>`
        : `<span style="color: #94A3B8; font-size: 12px;">Chưa</span>`;

      html += `
        <tr style="border-bottom: 1px solid #F1F5F9;">
          <td style="text-align: center; font-weight: 800; color: #64748B; padding: 10px 8px;">${idx + 1}</td>
          <td style="padding: 10px 8px;">
            <div style="font-weight: 800; color: #1E293B; font-size: 14px;">${s.name}</div>
            <div style="font-size: 11px; color: #64748B; font-weight: 600;">Tổng sao hiện có: <strong>${s.stars} ⭐</strong></div>
          </td>
          <td style="text-align: center; padding: 10px 8px;">
            <span style="font-size: 11px; padding: 3px 8px; border-radius: 10px; background: ${group.color}; color: #FFF; font-weight: 800;">
              ${group.name.split('-')[0].trim()}
            </span>
          </td>
          <td style="text-align: center; padding: 10px 8px; font-weight: 700; color: #2563EB;">
            ${readingText}
          </td>
          <td style="text-align: center; padding: 10px 8px; font-weight: 700; color: #7C3AED;">
            ${writingText}
          </td>
          <td style="text-align: center; padding: 10px 8px;">
            ${stickerText}
          </td>
          <td style="text-align: center; padding: 10px 8px;">
            ${choreHtml}
          </td>
          <td style="text-align: center; padding: 10px 8px;">
            <span style="font-size: 14px; font-weight: 900; color: #D97706; background: #FEF3C7; padding: 4px 10px; border-radius: 12px; border: 1px solid #FCD34D;">
              +${rec.totalStars} ⭐
            </span>
          </td>
          <td style="text-align: center; padding: 10px 8px;">
            <span style="background: #ECFDF5; color: #065F46; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 11px; border: 1px solid #A7F3D0;">
              ✅ Tự động cộng
            </span>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    parentHwTableContainer.innerHTML = html;
  }

  function openParentHomeworkModal() {
    currentHwViewDate = StorageManager.getTodayDateString ? StorageManager.getTodayDateString() : new Date().toISOString().split('T')[0];
    currentHwViewGroup = 'all';
    document.querySelectorAll('.btn-hw-filter').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.group === 'all');
      btn.style.background = btn.dataset.group === 'all' ? '#4F46E5' : '#FFF';
      btn.style.color = btn.dataset.group === 'all' ? '#FFF' : '#475569';
    });
    renderParentHomeworkSummary(currentHwViewDate, currentHwViewGroup);
    parentHomeworkSummaryModal.classList.add('active');
  }

  if (btnParentHomeworkSummary) {
    btnParentHomeworkSummary.addEventListener('click', openParentHomeworkModal);
  }
  if (closeParentHwSummaryBtn) {
    closeParentHwSummaryBtn.addEventListener('click', () => parentHomeworkSummaryModal.classList.remove('active'));
  }
  if (btnCloseParentHwModal) {
    btnCloseParentHwModal.addEventListener('click', () => parentHomeworkSummaryModal.classList.remove('active'));
  }

  if (parentHwDateInput) {
    parentHwDateInput.addEventListener('change', (e) => {
      if (e.target.value) {
        currentHwViewDate = e.target.value;
        renderParentHomeworkSummary(currentHwViewDate, currentHwViewGroup);
      }
    });
  }

  if (btnParentHwToday) {
    btnParentHwToday.addEventListener('click', () => {
      currentHwViewDate = StorageManager.getTodayDateString ? StorageManager.getTodayDateString() : new Date().toISOString().split('T')[0];
      if (parentHwDateInput) parentHwDateInput.value = currentHwViewDate;
      renderParentHomeworkSummary(currentHwViewDate, currentHwViewGroup);
    });
  }

  document.querySelectorAll('.btn-hw-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-hw-filter').forEach(b => {
        b.classList.remove('active');
        b.style.background = '#FFF';
        b.style.color = '#475569';
      });
      btn.classList.add('active');
      btn.style.background = '#4F46E5';
      btn.style.color = '#FFF';
      currentHwViewGroup = btn.dataset.group;
      renderParentHomeworkSummary(currentHwViewDate, currentHwViewGroup);
    });
  });

  if (btnCopyParentHwMessage) {
    btnCopyParentHwMessage.addEventListener('click', async () => {
      const [y, m, d] = currentHwViewDate.split('-');
      const submissions = [];
      (state.data.students || []).forEach(s => {
        const group = (state.data.groups || []).find(g => g.id === s.group) || { name: `Tổ ${s.group}` };
        const rec = s.homeworkRecords ? s.homeworkRecords[currentHwViewDate] : null;
        if (rec && rec.totalStars > 0) {
          submissions.push({ student: s, group, record: rec });
        }
      });

      if (submissions.length === 0) {
        alert('Chưa có học sinh nào nộp điểm rèn luyện trong ngày này!');
        return;
      }

      const className = state.data.className || 'Lớp 1A';
      let text = `🌸 BẢNG TUYÊN DƯƠNG RÈN LUYỆN TẠI NHÀ - ${className} 🌸\n`;
      text += `📅 Ngày ${d}/${m}/${y}\n`;
      text += `✨ Đã có ${submissions.length}/${state.data.students.length} bé hoàn thành xuất sắc và được tự động cộng sao ấp trứng:\n\n`;

      submissions.forEach((item, idx) => {
        const r = item.record;
        const choreText = r.choresDone ? ' • Dặn dò ✅' : '';
        const stickerText = (r.stickerCount > 0) ? ` • Sticker ${r.stickerCount} cái (+${r.stickerStars || (r.stickerCount * 5)}⭐)` : '';
        text += `${idx + 1}. Bé ${item.student.name} (${item.group.name.split('-')[0].trim()}): Đọc ${r.readingCount} lần, Viết ${r.writingStars}⭐${stickerText}${choreText} ➔ +${r.totalStars} ⭐\n`;
      });

      const dayTotalStars = submissions.reduce((sum, item) => sum + (item.record.totalStars || 0), 0);
      text += `\n🌟 Tổng số sao các con nhận được: +${dayTotalStars} ⭐`;
      text += `\n❤️ Cô giáo khen ngợi tinh thần tự giác của các con và cảm ơn quý phụ huynh đã đồng hành cùng con mỗi tối!`;

      try {
        await navigator.clipboard.writeText(text);
        alert('🎉 Đã sao chép báo cáo Zalo thành công!\nCô có thể dán (Ctrl + V) vào nhóm Zalo lớp để khen ngợi các con nhé.');
      } catch (err) {
        alert(text);
      }
    });
  }

  // ==========================================
  // --- QUẢN LÝ CÀI ĐẶT QUÀ TẶNG (TEACHER) ---
  // ==========================================
  const btnOpenGiftSettings = document.getElementById('btnOpenGiftSettings');
  const giftSettingsModal = document.getElementById('giftSettingsModal');
  const closeGiftSettingsBtn = document.getElementById('closeGiftSettingsBtn');
  const btnCloseGiftSettingsModal = document.getElementById('btnCloseGiftSettingsModal');
  const giftSettingsTableBody = document.getElementById('giftSettingsTableBody');
  const newGiftIconSelect = document.getElementById('newGiftIconSelect');
  const newGiftNameInput = document.getElementById('newGiftNameInput');
  const btnAddGiftItem = document.getElementById('btnAddGiftItem');
  const btnResetDefaultGifts = document.getElementById('btnResetDefaultGifts');
  const btnSaveGiftSettings = document.getElementById('btnSaveGiftSettings');

  let currentGiftListEditing = [];

  function renderGiftSettingsTable() {
    if (!giftSettingsTableBody) return;
    if (currentGiftListEditing.length === 0) {
      giftSettingsTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 20px; color: #94A3B8;">
            Chưa có phần quà nào trong danh sách. Hãy thêm món quà mới ở trên!
          </td>
        </tr>
      `;
      return;
    }

    giftSettingsTableBody.innerHTML = currentGiftListEditing.map((item, idx) => `
      <tr style="border-bottom: 1px solid #F1F5F9;">
        <td style="padding: 10px 14px; font-weight: 700; color: #64748B;">${idx + 1}</td>
        <td style="padding: 10px 14px; font-size: 20px;">${item.icon || '🎁'}</td>
        <td style="padding: 10px 14px; font-weight: 700; color: #1E293B;">
          <input type="text" class="edit-gift-name-input" data-idx="${idx}" value="${item.name}" style="width: 100%; padding: 6px 10px; border: 1px solid #E2E8F0; border-radius: 8px; font-family: inherit; font-size: 13px;">
        </td>
        <td style="padding: 10px 14px; text-align: center;">
          <button type="button" class="btn-remove-gift-item" data-idx="${idx}" style="background: #FEE2E2; color: #DC2626; border: none; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 800;" title="Xóa phần quà này">
            🗑️ Xóa
          </button>
        </td>
      </tr>
    `).join('');

    // Bắt sự kiện xóa
    giftSettingsTableBody.querySelectorAll('.btn-remove-gift-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const removeIdx = parseInt(btn.dataset.idx, 10);
        currentGiftListEditing.splice(removeIdx, 1);
        renderGiftSettingsTable();
      });
    });

    // Bắt sự kiện sửa tên trực tiếp
    giftSettingsTableBody.querySelectorAll('.edit-gift-name-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const editIdx = parseInt(input.dataset.idx, 10);
        if (currentGiftListEditing[editIdx]) {
          currentGiftListEditing[editIdx].name = input.value.trim();
        }
      });
    });
  }

  let currentGiftSettingsMilestone = 100;
  const tabGiftSettings100 = document.getElementById('tabGiftSettings100');
  const tabGiftSettings200 = document.getElementById('tabGiftSettings200');

  function switchGiftSettingsTab(milestone) {
    currentGiftSettingsMilestone = milestone;
    if (tabGiftSettings100 && tabGiftSettings200) {
      if (milestone === 200) {
        tabGiftSettings200.classList.add('active');
        tabGiftSettings100.classList.remove('active');
      } else {
        tabGiftSettings100.classList.add('active');
        tabGiftSettings200.classList.remove('active');
      }
    }
    currentGiftListEditing = JSON.parse(JSON.stringify(StorageManager.getGiftItems(milestone)));
    renderGiftSettingsTable();
  }

  if (tabGiftSettings100) {
    tabGiftSettings100.addEventListener('click', () => switchGiftSettingsTab(100));
  }
  if (tabGiftSettings200) {
    tabGiftSettings200.addEventListener('click', () => switchGiftSettingsTab(200));
  }

  if (btnOpenGiftSettings) {
    btnOpenGiftSettings.addEventListener('click', () => {
      switchGiftSettingsTab(100);
      giftSettingsModal.classList.add('active');
    });
  }

  if (closeGiftSettingsBtn) {
    closeGiftSettingsBtn.addEventListener('click', () => giftSettingsModal.classList.remove('active'));
  }
  if (btnCloseGiftSettingsModal) {
    btnCloseGiftSettingsModal.addEventListener('click', () => giftSettingsModal.classList.remove('active'));
  }

  if (btnAddGiftItem) {
    btnAddGiftItem.addEventListener('click', () => {
      const icon = newGiftIconSelect.value;
      const name = (newGiftNameInput.value || '').trim();
      if (!name) {
        alert('Cô vui lòng nhập tên món quà nhé!');
        newGiftNameInput.focus();
        return;
      }
      currentGiftListEditing.push({
        id: 'gift_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: name,
        icon: icon
      });
      newGiftNameInput.value = '';
      renderGiftSettingsTable();
    });
  }

  if (btnResetDefaultGifts) {
    btnResetDefaultGifts.addEventListener('click', () => {
      const is200 = currentGiftSettingsMilestone === 200;
      const msg = is200 
        ? 'Cô có chắc muốn khôi phục lại danh sách quà mẫu mốc 200⭐ (Lớp trưởng 3 ngày, đi siêu thị mua quà yêu thích, ăn món yêu thích, gấu bông, lê gô, cờ vua, cờ cá ngựa...)?'
        : 'Cô có chắc muốn khôi phục lại danh sách quà mẫu mặc định mốc 100⭐ (bút chì, lê gô mini, kẹp tóc, sổ tay, cục tẩy, tranh cát, quà yêu thích)?';
      if (confirm(msg)) {
        currentGiftListEditing = JSON.parse(JSON.stringify(is200 ? StorageManager.DEFAULT_GIFTS_200 : StorageManager.DEFAULT_GIFTS));
        renderGiftSettingsTable();
      }
    });
  }

  if (btnSaveGiftSettings) {
    btnSaveGiftSettings.addEventListener('click', async () => {
      if (currentGiftListEditing.length < 2) {
        alert('Danh sách quà nên có ít nhất 2 món để các em quay thưởng cô nhé!');
        return;
      }
      await StorageManager.saveGiftItems(currentGiftListEditing, currentGiftSettingsMilestone);
      giftSettingsModal.classList.remove('active');
      showSyncToast(`Đã lưu danh sách quà tặng mốc ${currentGiftSettingsMilestone}⭐ thành công!`, '🎁');
    });
  }

  // ========================================================
  // --- MODAL MỞ QUÀ NỞ TRỨNG (VÒNG QUAY & TÚI MÙ - 2 LƯỢT) ---
  // ========================================================
  const giftClaimModal = document.getElementById('giftClaimModal');
  const closeGiftClaimBtn = document.getElementById('closeGiftClaimBtn');
  const giftClaimStudentName = document.getElementById('giftClaimStudentName');
  const giftClaimTurnBadge = document.getElementById('giftClaimTurnBadge');
  const btnModeWheel = document.getElementById('btnModeWheel');
  const btnModeBlindBag = document.getElementById('btnModeBlindBag');
  const giftWheelArea = document.getElementById('giftWheelArea');
  const giftBlindBagArea = document.getElementById('giftBlindBagArea');
  const btnSpinGiftWheel = document.getElementById('btnSpinGiftWheel');
  const blindBagsGrid = document.getElementById('blindBagsGrid');
  const giftResultBox = document.getElementById('giftResultBox');
  const giftResultIcon = document.getElementById('giftResultIcon');
  const giftResultTitle = document.getElementById('giftResultTitle');
  const giftResultDesc = document.getElementById('giftResultDesc');
  const giftNextActionArea = document.getElementById('giftNextActionArea');
  const giftClaimCurrentHistoryList = document.getElementById('giftClaimCurrentHistoryList');

  let activeGiftStudentId = null;
  let giftLuckyWheel = null;
  let currentGiftMode = 'wheel'; // 'wheel' or 'blindbag'
  let isClaimingGift = false;

  function renderGiftClaimHistory(gifts) {
    if (!giftClaimCurrentHistoryList) return;
    if (!gifts || gifts.length === 0) {
      giftClaimCurrentHistoryList.innerHTML = '<span style="color: #94A3B8; font-style: italic;">Chưa mở quà lượt nào.</span>';
    } else {
      giftClaimCurrentHistoryList.innerHTML = gifts.map((g, i) => `
        <span class="gift-tag-badge" style="background: #FCE7F3; color: #BE185D; border-color: #FBCFE8; font-size: 13px; padding: 4px 10px;">
          Lượt ${i + 1}: ${g.icon || '🎁'} ${g.name}
        </span>
      `).join(' ');
    }
  }

  function initGiftLuckyWheel(giftItems) {
    if (!document.getElementById('giftWheelCanvas')) return;
    const wheelItems = giftItems.map(g => ({
      id: g.id,
      name: `${g.icon || '🎁'} ${g.name}`,
      giftData: g
    }));
    giftLuckyWheel = new LuckyWheel('giftWheelCanvas');
    giftLuckyWheel.setItems(wheelItems);
  }

  const BAG_COLORS = [
    { bg: 'linear-gradient(135deg, #FF6B8B, #FF8E53)', border: '#FF6B8B' },
    { bg: 'linear-gradient(135deg, #4FACFE, #00F2FE)', border: '#00F2FE' },
    { bg: 'linear-gradient(135deg, #43E97B, #38F9D7)', border: '#38F9D7' },
    { bg: 'linear-gradient(135deg, #FA709A, #FEE140)', border: '#FA709A' },
    { bg: 'linear-gradient(135deg, #A18CD1, #FBC2EB)', border: '#A18CD1' },
    { bg: 'linear-gradient(135deg, #F6D365, #FDA085)', border: '#FDA085' }
  ];

  function renderBlindBags(giftItems) {
    if (!blindBagsGrid) return;
    blindBagsGrid.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const colorScheme = BAG_COLORS[i % BAG_COLORS.length];
      const bag = document.createElement('div');
      bag.className = 'blind-bag-card';
      bag.style.background = colorScheme.bg;
      bag.style.borderColor = colorScheme.border;
      bag.innerHTML = `
        <div class="bag-icon">🎒</div>
        <div class="bag-label">Túi Mù #${i + 1}</div>
      `;

      bag.addEventListener('click', () => {
        if (bag.classList.contains('opened') || isClaimingGift) return;
        const student = (state.data.students || []).find(s => s.id === activeGiftStudentId);
        if (!student) return;
        const usedTurns = (student.giftHistory || []).length;
        if (usedTurns >= 2) return;

        bag.classList.add('opened');
        bag.querySelector('.bag-icon').textContent = '✨';

        // Chọn ngẫu nhiên 1 phần quà từ danh sách
        const randomGift = giftItems[Math.floor(Math.random() * giftItems.length)];
        handleGiftClaimAward(randomGift);
      });

      blindBagsGrid.appendChild(bag);
    }
  }

  let activeGiftMilestone = 100;

  async function handleGiftClaimAward(giftData) {
    if (isClaimingGift || !activeGiftStudentId) return;
    isClaimingGift = true;

    try {
      if (window.soundFx && typeof window.soundFx.playHatch === 'function') {
        window.soundFx.playHatch();
      } else if (window.soundFx && typeof window.soundFx.playStar === 'function') {
        window.soundFx.playStar();
      }

      // Tạo hiệu ứng hạt sao rơi rực rỡ
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          createFloatingStar(window.innerWidth / 2 + (Math.random() * 200 - 100), window.innerHeight / 2 + (Math.random() * 100 - 50), giftData.icon || '🎁');
        }, i * 120);
      }

      // Lưu lịch sử nhận quà cho học sinh qua StorageManager (source: teacher, milestone: activeGiftMilestone)
      const updatedStudent = await StorageManager.claimStudentGift(activeGiftStudentId, giftData, 'teacher', activeGiftMilestone);
      if (updatedStudent) {
        const studentInState = (state.data.students || []).find(s => s.id === activeGiftStudentId);
        if (studentInState) {
          studentInState.stars = updatedStudent.stars;
          studentInState.giftHistory = updatedStudent.giftHistory;
          studentInState.accumulateBonus = updatedStudent.accumulateBonus;
          studentInState.giftSessionSource = updatedStudent.giftSessionSource;
        }
      }

      const gifts = (updatedStudent && updatedStudent.giftHistory) || [];
      renderGiftClaimHistory(gifts);

      // Hiển thị khung kết quả
      giftResultBox.style.display = 'block';
      giftResultIcon.textContent = giftData.icon || '🎁';
      giftResultTitle.textContent = `Bé đã trúng: ${giftData.name}!`;

      // THÔNG BÁO CHO GIÁO VIÊN BIẾT ĐỂ CHUẨN BỊ QUÀ NGAY
      const curStudent = (state.data.students || []).find(s => s.id === activeGiftStudentId);
      showTeacherGiftNotification({
        studentName: curStudent ? curStudent.name : 'Học sinh',
        gift: giftData,
        milestone: activeGiftMilestone,
        source: 'teacher'
      });

      if (gifts.length < 2 && (!updatedStudent || updatedStudent.stars > 0 || gifts.length === 1)) {
        giftClaimTurnBadge.textContent = 'Lượt mở quà: 2 / 2';
        giftResultDesc.innerHTML = `
          <div style="font-size: 14px; font-weight: 700; color: #059669; margin-top: 4px;">
            🎉 Tuyệt vời! Bé vẫn còn <strong>1 lượt mở quà nữa</strong>!
          </div>
        `;
        giftNextActionArea.innerHTML = `
          <button type="button" id="btnContinueGiftTurn2" class="btn-header primary" style="background: linear-gradient(135deg, #EC4899, #BE185D); padding: 10px 24px; font-size: 14px; font-weight: 800; border-radius: 20px;">
            🎁 Mở Tiếp Lượt 2 Ngay!
          </button>
        `;

        document.getElementById('btnContinueGiftTurn2').addEventListener('click', () => {
          giftResultBox.style.display = 'none';
          isClaimingGift = false;
          // Vẽ lại 6 túi mù mới nếu đang ở mode túi mù
          if (currentGiftMode === 'blindbag') {
            const giftItems = StorageManager.getGiftItems(activeGiftMilestone);
            renderBlindBags(giftItems);
          }
        });
      } else {
        // Đã hoàn thành 2 lượt: TỰ ĐỘNG HOÀN VỀ 0 ĐIỂM KHÔNG CẦN THAO TÁC, KHÔNG CHO QUAY NỮA
        giftClaimTurnBadge.textContent = '✅ Đã hoàn thành 2 / 2 lượt';
        giftResultDesc.innerHTML = `
          <div style="font-size: 15px; font-weight: 800; color: #E11D48; margin-top: 6px;">
            🌟 CHÚC MỪNG CON ĐÃ MỞ XONG 2 LƯỢT QUÀ! 🌟
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #059669; margin-top: 6px; line-height: 1.5;">
            👉 Điểm đã được <strong>tự động hoàn về 0 ⭐</strong> để bắt đầu chu kỳ ấp mới! Không thể quay thêm nữa.
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #4F46E5; margin-top: 4px;">
            🎁 Quà đã lưu vào Bảng Tổng Hợp Quà của cô giáo để chuẩn bị trao thưởng!
          </div>
        `;
        giftNextActionArea.innerHTML = `
          <button type="button" id="btnFinishGiftClaim" class="btn-header primary" style="background: linear-gradient(135deg, #10B981, #059669); padding: 12px 28px; font-size: 15px; font-weight: 800; border-radius: 20px; cursor: pointer;">
            ✨ Hoàn Tất & Đóng Lại
          </button>
        `;
        document.getElementById('btnFinishGiftClaim').addEventListener('click', () => {
          giftClaimModal.classList.remove('active');
          refreshData();
        });

        // Khóa hoàn toàn vùng quay và túi mù (không cho quay thêm)
        giftWheelArea.style.display = 'none';
        giftBlindBagArea.style.display = 'none';
      }

      refreshData();
    } catch (err) {
      console.error('Lỗi khi nhận quà:', err);
    } finally {
      isClaimingGift = false;
    }
  }

  function openGiftClaimModal(studentId, forceMilestone = null) {
    activeGiftStudentId = studentId;
    isClaimingGift = false;
    const student = (state.data.students || []).find(s => s.id === studentId);
    if (!student) return;

    // Xác định mốc quay quà: 200⭐ nếu student.accumulateBonus hoặc student.stars >= 200, ngược lại 100⭐
    const milestone = forceMilestone || ((student.accumulateBonus && student.stars >= 200) || student.stars >= 200 ? 200 : 100);
    activeGiftMilestone = milestone;

    const milestoneBadge = document.getElementById('giftModalMilestoneBadge');
    if (milestoneBadge) {
      milestoneBadge.style.display = 'inline-block';
      if (milestone === 200) {
        milestoneBadge.textContent = '🏆 VÒNG QUAY ĐẶC BIỆT MỐC 200 ⭐';
        milestoneBadge.style.background = 'linear-gradient(135deg, #F59E0B, #DC2626)';
      } else {
        milestoneBadge.textContent = '🎁 VÒNG QUAY MỐC 100 ⭐';
        milestoneBadge.style.background = 'linear-gradient(135deg, #EC4899, #8B5CF6)';
      }
    }

    const gifts = student.giftHistory || [];
    giftClaimStudentName.textContent = student.name;
    renderGiftClaimHistory(gifts);

    // Tab default
    currentGiftMode = 'wheel';
    btnModeWheel.classList.add('active');
    btnModeBlindBag.classList.remove('active');

    // KHÓA QUAY CHÉO: Nếu đã quay ở trang phụ huynh thì không quay trang giáo viên nữa và danh sách quà được hiện lên!
    const claimedByParent = (student.giftSessionSource === 'parent') || gifts.some(g => g.claimedBy === 'parent');
    const parentLockedBox = document.getElementById('giftParentLockedBox');
    const parentLockedList = document.getElementById('giftParentLockedGiftsList');

    if (claimedByParent) {
      giftClaimTurnBadge.textContent = '🔒 Đã quay tại trang Phụ Huynh';
      giftWheelArea.style.display = 'none';
      giftBlindBagArea.style.display = 'none';
      giftResultBox.style.display = 'none';
      if (parentLockedBox) parentLockedBox.style.display = 'block';
      if (parentLockedList) {
        parentLockedList.innerHTML = gifts.map((g, idx) => `
          <div style="display: flex; align-items: center; gap: 10px; background: #FFF; padding: 10px 14px; border-radius: 12px; margin-bottom: 8px; border: 1.5px solid #FBCFE8;">
            <span style="font-size: 26px;">${g.icon || '🎁'}</span>
            <div style="flex: 1; text-align: left;">
              <div style="font-weight: 800; color: #1E293B;">Lượt ${idx + 1}: ${g.name}</div>
              <div style="font-size: 11px; color: #64748B;">Nhận lúc: ${g.claimedAt ? new Date(g.claimedAt).toLocaleString('vi-VN') : 'Vừa xong'} (Ba mẹ quay ở nhà)</div>
            </div>
          </div>
        `).join('');
      }
      giftClaimModal.classList.add('active');
      return;
    } else {
      if (parentLockedBox) parentLockedBox.style.display = 'none';
    }

    const giftItems = StorageManager.getGiftItems(milestone);

    if (gifts.length >= 2) {
      giftClaimTurnBadge.textContent = '✅ Đã hoàn thành 2 / 2 lượt';
      giftWheelArea.style.display = 'none';
      giftBlindBagArea.style.display = 'none';
      giftResultBox.style.display = 'block';
      giftResultIcon.textContent = '🏆';
      giftResultTitle.textContent = `Bé ${student.name} đã mở đủ 2 phần quà!`;
      giftResultDesc.innerHTML = `
        <div style="font-size: 14px; font-weight: 700; color: #059669; margin-top: 6px;">
          👉 Điểm đã được tự động hoàn về 0 ⭐ để bắt đầu chu kỳ ấp mới! Quà đã lưu trong Bảng Tổng Hợp Quà của cô giáo.
        </div>
      `;
      giftNextActionArea.innerHTML = `
        <button type="button" id="btnResetCycleFromModal" class="btn-header primary" style="background: linear-gradient(135deg, #10B981, #059669); padding: 12px 24px; font-size: 14px; font-weight: 800; border-radius: 20px; cursor: pointer;">
          ✨ Đóng Lại
        </button>
      `;
      document.getElementById('btnResetCycleFromModal').addEventListener('click', () => {
        giftClaimModal.classList.remove('active');
        refreshData();
      });
    } else {
      giftClaimTurnBadge.textContent = `Lượt mở quà: ${gifts.length + 1} / 2`;
      giftResultBox.style.display = 'none';
      giftWheelArea.style.display = 'flex';
      giftBlindBagArea.style.display = 'none';

      initGiftLuckyWheel(giftItems);
      renderBlindBags(giftItems);
    }

    giftClaimModal.classList.add('active');
  }

  // --- LỰA CHỌN MỐC 100⭐ HOẶC 200⭐: QUAY QUÀ HAY TÍCH ĐIỂM CỘNG DỒN ---
  let activeMilestoneStudentId = null;
  let activeMilestoneType = 100;

  function openMilestoneChoiceModal(studentId, milestone = 100) {
    const student = (state.data.students || []).find(s => s.id === studentId);
    if (!student) return;

    activeMilestoneStudentId = studentId;
    activeMilestoneType = milestone;

    const modal = document.getElementById('milestoneChoiceModal');
    if (!modal) {
      openGiftClaimModal(studentId, milestone);
      return;
    }

    const iconEl = document.getElementById('milestoneChoiceIcon');
    const titleEl = document.getElementById('milestoneChoiceTitle');
    const subtitleEl = document.getElementById('milestoneChoiceSubtitle');
    const studentNameEl = document.getElementById('milestoneStudentName');
    const choice1Title = document.getElementById('labelChoice1Title');
    const choice1Badge = document.getElementById('labelChoice1Badge');
    const choice1Desc = document.getElementById('labelChoice1Desc');
    const choice2Title = document.getElementById('labelChoice2Title');
    const choice2Badge = document.getElementById('labelChoice2Badge');
    const choice2Desc = document.getElementById('labelChoice2Desc');

    if (studentNameEl) studentNameEl.textContent = student.name;

    if (milestone === 200) {
      if (iconEl) iconEl.textContent = '🏆';
      if (titleEl) titleEl.textContent = 'CHÚC MỪNG BÉ ĐẠT KỶ LỤC 200 SAO!';
      if (subtitleEl) subtitleEl.innerHTML = `Bé <strong style="color: #4F46E5; font-size: 16px;">${student.name}</strong> đã xuất sắc tích đủ 200 sao! Mời con lựa chọn:`;
      if (choice1Title) choice1Title.textContent = 'LỰA CHỌN 1: QUAY VÒNG QUAY ĐẶC BIỆT 200 ⭐';
      if (choice1Badge) choice1Badge.textContent = 'QUÀ GIÁ TRỊ CAO 200 ⭐';
      if (choice1Desc) choice1Desc.innerHTML = 'Nhận ngay <strong>2 lượt quay quà SIÊU ĐẶC BIỆT</strong>: Được làm lớp trưởng 3 ngày, Được ba mẹ dắt đi siêu thị mua quà yêu thích, Được ăn món yêu thích, Gấu bông, Lego, Bộ cờ vua, Cờ cá ngựa...';
      if (choice2Title) choice2Title.textContent = 'LỰA CHỌN 2: TIẾP TỤC GIỮ ĐIỂM VINH DANH';
      if (choice2Badge) choice2Badge.textContent = 'GIỮ ĐIỂM KỶ LỤC';
      if (choice2Desc) choice2Desc.innerHTML = 'Giữ nguyên điểm số 200 ⭐ để vinh danh trên bảng vàng của lớp học và quay quà sau.';
    } else {
      if (iconEl) iconEl.textContent = '🐣';
      if (titleEl) titleEl.textContent = 'CHÚC MỪNG BÉ ĐẠT MỐC 100 SAO!';
      if (subtitleEl) subtitleEl.innerHTML = `Bé <strong style="color: #4F46E5; font-size: 16px;">${student.name}</strong> đã tích đủ 100 sao và linh thú đã nở! Con muốn lựa chọn:`;
      if (choice1Title) choice1Title.textContent = 'LỰA CHỌN 1: QUAY QUÀ NGAY (MỐC 100 ⭐)';
      if (choice1Badge) choice1Badge.textContent = 'MỐC 100 ⭐';
      if (choice1Desc) choice1Desc.innerHTML = 'Nhận ngay <strong>2 lượt quay quà may mắn</strong> (Bút chì, Lego mini, Kẹp tóc, Sổ tay, Cục tẩy, Tranh cát, Quà yêu thích...).';
      if (choice2Title) choice2Title.textContent = 'LỰA CHỌN 2: TÍCH ĐIỂM CỘNG DỒN ĐẾN 200 ⭐';
      if (choice2Badge) choice2Badge.textContent = 'SĂN MỐC 200 ⭐';
      if (choice2Desc) choice2Desc.innerHTML = 'Tiếp tục nuôi sao lên <strong>mốc 200 ⭐</strong> để mở vòng quay <strong>QUÀ GIÁ TRỊ CAO</strong>: Được làm lớp trưởng 3 ngày, Được ba mẹ dắt đi siêu thị mua quà yêu thích, Được ăn món yêu thích, Gấu bông, Xếp hình lê gô, Bộ cờ vua, Bộ cờ cá ngựa...';
    }

    modal.classList.add('active');
  }

  const btnChooseSpinNow = document.getElementById('btnChooseSpinNow');
  if (btnChooseSpinNow) {
    btnChooseSpinNow.addEventListener('click', () => {
      const modal = document.getElementById('milestoneChoiceModal');
      if (modal) modal.classList.remove('active');
      if (activeMilestoneStudentId) {
        openGiftClaimModal(activeMilestoneStudentId, activeMilestoneType);
      }
    });
  }

  const btnChooseAccumulate = document.getElementById('btnChooseAccumulate');
  if (btnChooseAccumulate) {
    btnChooseAccumulate.addEventListener('click', async () => {
      const modal = document.getElementById('milestoneChoiceModal');
      if (modal) modal.classList.remove('active');
      if (activeMilestoneStudentId) {
        const student = (state.data.students || []).find(s => s.id === activeMilestoneStudentId);
        if (activeMilestoneType === 200) {
          showSyncToast(`🏆 Bé <strong>${student ? student.name : ''}</strong> tiếp tục giữ điểm kỷ lục 200 ⭐!`, '⭐');
        } else {
          await StorageManager.setMilestoneChoice(activeMilestoneStudentId, 'accumulate');
          refreshData();
          showSyncToast(`🚀 Bé <strong>${student ? student.name : ''}</strong> đã chọn tích điểm cộng dồn đến mốc 200 ⭐ để săn quà Siêu Đặc Biệt!`, '🌟');
        }
      }
    });
  }

  const closeMilestoneChoiceBtn = document.getElementById('closeMilestoneChoiceBtn');
  if (closeMilestoneChoiceBtn) {
    closeMilestoneChoiceBtn.addEventListener('click', () => {
      const modal = document.getElementById('milestoneChoiceModal');
      if (modal) modal.classList.remove('active');
    });
  }

  // --- THÔNG BÁO CHO GIÁO VIÊN BIẾT HỌC SINH QUAY TRÚNG QUÀ GÌ ĐỂ CHUẨN BỊ ---
  function showTeacherGiftNotification({ studentName, gift, milestone, source }) {
    const banner = document.getElementById('teacherGiftNoticeBanner');
    const desc = document.getElementById('noticeGiftDesc');
    if (!banner || !desc) return;

    const sourceLabel = source === 'parent' ? 'Ba mẹ quay tại nhà (trang Phụ Huynh)' : 'Quay tại lớp học';
    const milestoneLabel = milestone === 200 ? 'Mốc Kỷ Lục 200 ⭐ (ĐẶC BIỆT)' : 'Mốc 100 ⭐';

    desc.innerHTML = `
      Bé <strong style="color: #4F46E5; font-size: 15px;">${studentName}</strong> vừa quay trúng: 
      <strong style="color: #E11D48; font-size: 15px;">${gift.icon || '🎁'} ${gift.name}</strong> 
      (${milestoneLabel} - ${sourceLabel}). 
      <strong>Thầy/Cô hãy chuẩn bị món quà này để trao cho bé nhé!</strong>
    `;

    banner.style.display = 'flex';

    if (window.soundFx && typeof window.soundFx.playHatch === 'function') {
      window.soundFx.playHatch();
    }

    showSyncToast(
      `🎁 <strong>THÔNG BÁO CHUẨN BỊ QUÀ:</strong> Bé <strong>${studentName}</strong> vừa trúng <strong>${gift.name}</strong>!`,
      '🎉'
    );
  }

  const btnCloseNoticeBanner = document.getElementById('btnCloseNoticeBanner');
  if (btnCloseNoticeBanner) {
    btnCloseNoticeBanner.addEventListener('click', () => {
      const banner = document.getElementById('teacherGiftNoticeBanner');
      if (banner) banner.style.display = 'none';
    });
  }

  const btnNoticeViewGifts = document.getElementById('btnNoticeViewGifts');
  if (btnNoticeViewGifts) {
    btnNoticeViewGifts.addEventListener('click', () => {
      if (typeof openGiftSummaryModal === 'function') {
        openGiftSummaryModal();
      }
    });
  }

  // --- MODAL CHIA SẺ LINK ĐIỆN THOẠI CHO GIÁO VIÊN ---
  const btnShareMobileLink = document.getElementById('btnShareMobileLink');
  const mobileLinkModal = document.getElementById('mobileLinkModal');
  const closeMobileLinkModalBtn = document.getElementById('closeMobileLinkModalBtn');
  const inputMobileUrlLink = document.getElementById('inputMobileUrlLink');
  const btnCopyMobileLink = document.getElementById('btnCopyMobileLink');
  const mobileQrCodeImg = document.getElementById('mobileQrCodeImg');

  if (btnShareMobileLink && mobileLinkModal) {
    btnShareMobileLink.addEventListener('click', async () => {
      let mobileUrl = `${window.location.origin}/mobile.html`;
      try {
        const infoRes = await fetch('/api/info');
        if (infoRes.ok) {
          const info = await infoRes.json();
          if (info.mobileUrl) mobileUrl = info.mobileUrl;
        }
      } catch (e) {}

      if (inputMobileUrlLink) inputMobileUrlLink.value = mobileUrl;
      if (mobileQrCodeImg) {
        mobileQrCodeImg.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mobileUrl)}" alt="QR Điện Thoại" style="border-radius: 12px; border: 2px solid #CBD5E1; box-shadow: 0 4px 12px rgba(0,0,0,0.08); width: 180px; height: 180px;">`;
      }
      mobileLinkModal.classList.add('active');
    });
  }

  if (closeMobileLinkModalBtn && mobileLinkModal) {
    closeMobileLinkModalBtn.addEventListener('click', () => {
      mobileLinkModal.classList.remove('active');
    });
  }

  if (btnCopyMobileLink && inputMobileUrlLink) {
    btnCopyMobileLink.addEventListener('click', () => {
      navigator.clipboard.writeText(inputMobileUrlLink.value).then(() => {
        showSyncToast('📋 Đã sao chép link giao diện điện thoại!', '✨');
      }).catch(() => {
        inputMobileUrlLink.select();
        document.execCommand('copy');
        showSyncToast('📋 Đã sao chép link giao diện điện thoại!', '✨');
      });
    });
  }

  if (closeGiftClaimBtn) {
    closeGiftClaimBtn.addEventListener('click', () => giftClaimModal.classList.remove('active'));
  }

  if (btnModeWheel && btnModeBlindBag) {
    btnModeWheel.addEventListener('click', () => {
      currentGiftMode = 'wheel';
      btnModeWheel.classList.add('active');
      btnModeBlindBag.classList.remove('active');
      const student = (state.data.students || []).find(s => s.id === activeGiftStudentId);
      const gifts = (student && student.giftHistory) || [];
      if (gifts.length < 2) {
        giftWheelArea.style.display = 'flex';
        giftBlindBagArea.style.display = 'none';
        if (giftLuckyWheel) giftLuckyWheel.draw();
      }
    });

    btnModeBlindBag.addEventListener('click', () => {
      currentGiftMode = 'blindbag';
      btnModeBlindBag.classList.add('active');
      btnModeWheel.classList.remove('active');
      const student = (state.data.students || []).find(s => s.id === activeGiftStudentId);
      const gifts = (student && student.giftHistory) || [];
      if (gifts.length < 2) {
        giftWheelArea.style.display = 'none';
        giftBlindBagArea.style.display = 'flex';
      }
    });
  }

  if (btnSpinGiftWheel) {
    btnSpinGiftWheel.addEventListener('click', () => {
      if (!giftLuckyWheel || giftLuckyWheel.isSpinning || isClaimingGift) return;
      const student = (state.data.students || []).find(s => s.id === activeGiftStudentId);
      if (!student || ((student.giftHistory || []).length >= 2)) return;

      giftLuckyWheel.spin((winner) => {
        if (winner && winner.giftData) {
          handleGiftClaimAward(winner.giftData);
        }
      });
    });
  }

  // Multi-tab sync event listener
  if (StorageManager.broadcast) {
    StorageManager.broadcast.onmessage = (e) => {
      if (e.data && e.data.type === 'DATA_CHANGED') {
        state.data = e.data.data;
        refreshData();
      }
    };
  }

  // Cross-window local storage sync listener (đồng bộ tức thì giữa tất cả các cửa sổ/tab trên máy)
  window.addEventListener('storage', (e) => {
    if (e.key === StorageManager.KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.students) {
          state.data = parsed;
          refreshData();
        }
      } catch (err) {}
    }
  });

  // Toast thông báo tức thì khi phụ huynh nộp bài tập về nhà
  function showSyncToast(htmlMessage, icon = '🎉') {
    const container = document.getElementById('liveSyncToastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'live-sync-toast';
    toast.innerHTML = `
      <span style="font-size: 26px;">${icon}</span>
      <div>${htmlMessage}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }

  // Kết nối Realtime tự động với máy chủ (Server-Sent Events)
  function setupRealtimeServerSync() {
    if (window.location.protocol.startsWith('http') && window.EventSource) {
      try {
        const sse = new EventSource('/api/events');

        sse.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.type === 'HOMEWORK_SUBMITTED') {
              if (payload.data && payload.data.students) {
                state.data = payload.data;
                localStorage.setItem(StorageManager.KEY, JSON.stringify(payload.data));
                refreshData(payload.data);

                // Phát âm thanh ting ting vui nhộn
                if (window.soundFx) window.soundFx.playStar();

                // Hiện thông báo nổi góc màn hình giáo viên
                const starsAdded = payload.diff || 0;
                showSyncToast(
                  `Bé <strong>${payload.studentName}</strong> vừa nộp bài tập: được tự động cộng <strong>+${starsAdded} ⭐</strong>!`,
                  '📝'
                );

                // Hiệu ứng nháy nổi bật thẻ học sinh vừa được cộng điểm
                const card = document.querySelector(`.student-card[data-id="${payload.studentId}"]`);
                if (card) {
                  card.style.transition = 'all 0.35s ease';
                  card.style.transform = 'scale(1.08)';
                  card.style.boxShadow = '0 0 25px #10B981';
                  setTimeout(() => {
                    card.style.transform = '';
                    card.style.boxShadow = '';
                  }, 1500);
                }
              }
            } else if (payload.type === 'GIFT_CLAIMED') {
              if (payload.data && payload.data.students) {
                state.data = payload.data;
                localStorage.setItem(StorageManager.KEY, JSON.stringify(payload.data));
                refreshData(payload.data);
              }
              showTeacherGiftNotification({
                studentName: payload.studentName,
                gift: payload.gift || { name: 'Phần quà bí mật', icon: '🎁' },
                milestone: payload.milestone || 100,
                source: payload.source || 'parent'
              });
            } else if (payload.type === 'CYCLE_RESET') {
              if (payload.data && payload.data.students) {
                state.data = payload.data;
                localStorage.setItem(StorageManager.KEY, JSON.stringify(payload.data));
                refreshData(payload.data);
                showSyncToast(`🎉 Bé <strong>${payload.studentName}</strong> đã hoàn thành mở quà và trở về 0 ⭐ bắt đầu chu kỳ ấp mới!`, '✨');
              }
            } else if (payload.type === 'DATA_CHANGED') {
              if (payload.data && payload.data.students) {
                state.data = payload.data;
                localStorage.setItem(StorageManager.KEY, JSON.stringify(payload.data));
                refreshData(payload.data);
              }
            }
          } catch (err) {
            console.warn('Lỗi phân tích SSE:', err);
          }
        };

        sse.onerror = () => {
          // Tự động kết nối lại
        };
      } catch (err) {
        console.warn('Không thể khởi tạo SSE:', err);
      }
    }

    // Dự phòng Polling mỗi 2s để đảm bảo 100% không bao giờ trễ
    setInterval(async () => {
      try {
        const remote = await StorageManager.pullFromServer();
        if (remote && remote.students) {
          const currentStars = (state.data && state.data.students) ? state.data.students.map(s => s.stars).join(',') : '';
          const remoteStars = remote.students.map(s => s.stars).join(',');
          if (currentStars !== remoteStars || remote.lastUpdated !== (state.data && state.data.lastUpdated)) {
            refreshData(remote);
          }
        }
      } catch (e) {}
    }, 2000);
  }

  // Khởi tạo Google Firebase Realtime Cloud Sync
  function setupFirebaseCloudSync() {
    const badge = document.getElementById('cloudSyncStatusBadge');
    const badgeText = document.getElementById('cloudSyncStatusText');

    if (window.FirebaseSync && typeof window.FirebaseSync.init === 'function') {
      const ok = window.FirebaseSync.init();
      if (ok) {
        if (badge && badgeText) {
          badge.style.background = '#ECFDF5';
          badge.style.color = '#065F46';
          badge.style.border = '1px solid #6EE7B7';
          badge.style.cursor = 'pointer';
          badgeText.textContent = 'Đám Mây: Đã kết nối 24/24 (Bấm để đồng bộ)';

          if (!badge.dataset.syncClickAttached) {
            badge.dataset.syncClickAttached = 'true';
            badge.addEventListener('click', async () => {
              if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
                badgeText.textContent = 'Đang đẩy lên Đám Mây...';
                await window.FirebaseSync.setClassData(state.data);
                badgeText.textContent = 'Đám Mây: Đã đồng bộ ✅';
                showSyncToast('🎉 Đã đồng bộ toàn bộ danh sách 36 học sinh lên Đám Mây cho phụ huynh!', '☁️');
                setTimeout(() => {
                  badgeText.textContent = 'Đám Mây: Đã kết nối 24/24 (Bấm để đồng bộ)';
                }, 3000);
              }
            });
          }
        }

        // Đảm bảo dữ liệu hiện tại được đẩy lên nếu Firebase đang trống hoặc đang chứa danh sách mẫu
        window.FirebaseSync.ensureInitialData(state.data);

        // Lắng nghe thay đổi trực tiếp từ Firebase (phụ huynh nộp bài tập từ nhà)
        window.FirebaseSync.onClassDataChange((fbData) => {
          if (fbData && fbData.students) {
            // Không nhận dữ liệu nếu Firebase ít học sinh hơn danh sách thực tế của lớp (ví dụ 16 em mẫu vs 36 em thật)
            if (state.data && state.data.students && state.data.students.length > fbData.students.length) {
              console.warn('Firebase có ít học sinh hơn danh sách thực tế, đồng bộ dữ liệu thật lên Cloud...');
              window.FirebaseSync.setClassData(state.data);
              return;
            }

            const oldMap = new Map((state.data.students || []).map(s => [s.id, s.stars || 0]));
            
            // Tìm bé vừa được cộng điểm từ nhà
            let diffStudent = null;
            let diffStars = 0;
            for (const s of fbData.students) {
              const oldStars = oldMap.get(s.id);
              if (oldStars !== undefined && (s.stars || 0) > oldStars) {
                diffStudent = s;
                diffStars = (s.stars || 0) - oldStars;
                break;
              }
            }

            // Kiểm tra quà mới từ nhà (giftSummaryRecords mới hoặc cập nhật lượt 2)
            const oldSummaries = state.data.giftSummaryRecords || [];
            const newSummaries = fbData.giftSummaryRecords || [];
            if (newSummaries.length > oldSummaries.length) {
              const latestRec = newSummaries[0];
              if (latestRec && latestRec.claimedBy === 'parent') {
                showTeacherGiftNotification({
                  studentName: latestRec.studentName,
                  gift: latestRec.gift2 || latestRec.gift1 || { name: 'Quà may mắn', icon: '🎁' },
                  milestone: latestRec.milestone || 100,
                  source: 'parent'
                });
              }
            } else if (newSummaries.length > 0 && newSummaries[0]) {
              const latestRec = newSummaries[0];
              const oldRec = oldSummaries.find(r => r.id === latestRec.id);
              if (oldRec && !oldRec.completed && latestRec.completed && latestRec.claimedBy === 'parent') {
                showTeacherGiftNotification({
                  studentName: latestRec.studentName,
                  gift: latestRec.gift2 || { name: 'Quà may mắn', icon: '🎁' },
                  milestone: latestRec.milestone || 100,
                  source: 'parent'
                });
              }
            }

            state.data = fbData;
            localStorage.setItem(StorageManager.KEY, JSON.stringify(fbData));
            refreshData(fbData);

            // Tự động vẽ lại Bảng Tổng Hợp Quà Đã Quay nếu đang mở
            const giftSummaryModalEl = document.getElementById('giftSummaryModal');
            if (giftSummaryModalEl && giftSummaryModalEl.classList.contains('active')) {
              openGiftSummaryModal();
            }

            // Đồng bộ dữ liệu sang local server để ghi vào file class_data.json
            StorageManager.syncToServer(fbData);

            if (diffStudent && diffStars > 0) {
              if (window.soundFx) window.soundFx.playStar();
              showSyncToast(
                `Bé <strong>${diffStudent.name}</strong> vừa gửi điểm: được cộng <strong>+${diffStars} ⭐</strong> qua Đám Mây!`,
                '☁️'
              );
              const card = document.querySelector(`.student-card[data-id="${diffStudent.id}"]`);
              if (card) {
                card.style.transition = 'all 0.35s ease';
                card.style.transform = 'scale(1.08)';
                card.style.boxShadow = '0 0 25px #10B981';
                setTimeout(() => {
                  card.style.transform = '';
                  card.style.boxShadow = '';
                }, 1500);
              }
            }
          }
        });
      } else {
        if (badge && badgeText) {
          badge.style.background = '#FFFBEB';
          badge.style.color = '#B45309';
          badge.style.border = '1px solid #FCD34D';
          badgeText.textContent = 'Đám Mây: Chưa kết nối';
        }
      }
    }
  }

  // Tải dữ liệu mới nhất từ server ngay khi mở trang
  StorageManager.pullFromServer().then(remote => {
    if (remote && remote.students) {
      state.data = remote;
      refreshData();
    }
  });

  setupFirebaseCloudSync();
  setupRealtimeServerSync();

  // Initial render
  refreshData();
});
