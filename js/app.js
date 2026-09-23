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
    if (window.soundFx.isMuted) {
      btnMute.innerHTML = '🔇 <span>Đã tắt âm</span>';
    } else {
      btnMute.innerHTML = '🔊 <span>Âm thanh</span>';
    }
  }
  updateMuteBtn();

  btnMute.addEventListener('click', () => {
    window.soundFx.toggleMute();
    updateMuteBtn();
  });

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

  // --- Render Individual Students View ---
  function renderStudents() {
    const { students, groups } = state.data;
    studentsContainer.innerHTML = '';

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

    students.forEach(student => {
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

        <div class="stars-display">
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
          ${student.stars >= 100 ? `
            <button class="btn-fast-reward btn-card-open-gift fast-action" data-action="gift" data-id="${student.id}" style="width: 100%; background: linear-gradient(135deg, #EC4899, #BE185D); color: #fff; font-weight: 800; padding: 7px 10px; font-size: 11px;" title="Bé đã đạt 100 ⭐ - Bấm mở 2 phần quà!">
              🎁 ĐÃ NỞ - MỞ 2 QUÀ NGAY (100⭐)
            </button>
          ` : `
            <button class="btn-fast-reward focus fast-action" data-action="focus" data-id="${student.id}" title="Tập trung chú ý nghe giảng (+3 ⭐)">
              👀 Chú ý (+3)
            </button>
            <button class="btn-fast-reward hand fast-action" data-action="hand" data-id="${student.id}" title="Giơ tay phát biểu (+2 ⭐)">
              ✋ Phát biểu (+2)
            </button>
          `}
        </div>
      `;

      // Click on Card opens full reward action sheet
      card.addEventListener('click', (e) => {
        // Prevent opening if clicked specific action buttons
        if (e.target.closest('.btn-qr-parent') || e.target.closest('.btn-zalo-card') || e.target.closest('.fast-action') || e.target.closest('.btn-edit-student') || e.target.closest('.btn-delete-student')) {
          return;
        }
        if (student.stars >= 100) {
          openGiftClaimModal(student.id);
          return;
        }
        openActionModal(student.id);
      });

      // Quick Fast Buttons
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

      const giftBtn = card.querySelector('.fast-action[data-action="gift"]');
      if (giftBtn) {
        giftBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openGiftClaimModal(student.id);
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
    studentsContainer.style.display = 'grid';
    groupsContainer.style.display = 'none';
  });

  tabGroupsBtn.addEventListener('click', () => {
    state.activeTab = 'groups';
    tabGroupsBtn.classList.add('active');
    tabStudentsBtn.classList.remove('active');
    studentsContainer.style.display = 'none';
    groupsContainer.style.display = 'grid';
  });

  // --- Refresh View from state ---
  function refreshData(newData) {
    if (newData && newData.students) {
      state.data = newData;
    } else if (!state.data || !state.data.students) {
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
  const chkKeepModalOpen = document.getElementById('chkKeepModalOpen');
  const presetButtons = document.querySelectorAll('.btn-preset-pts');

  function updateActivePreset(val) {
    presetButtons.forEach(btn => {
      const pts = parseInt(btn.dataset.pts, 10);
      if (pts === val) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
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
      if (cur < 50) {
        cur++;
        inputCustomRewardPoints.value = cur;
        updateActivePreset(cur);
      }
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
  btnWheel.addEventListener('click', () => {
    wheelModal.classList.add('active');
    const canvas = document.getElementById('luckyWheelCanvas');
    canvas.width = 340;
    canvas.height = 340;

    luckyWheel = new LuckyWheel('luckyWheelCanvas');
    luckyWheel.setItems(state.data.students);

    document.getElementById('wheelWinnerBox').style.display = 'none';
  });

  document.getElementById('spinWheelBtn').addEventListener('click', () => {
    if (!luckyWheel || luckyWheel.isSpinning) return;
    document.getElementById('wheelWinnerBox').style.display = 'none';

    luckyWheel.spin((winner) => {
      const winnerBox = document.getElementById('wheelWinnerBox');
      const winnerName = document.getElementById('wheelWinnerName');
      winnerName.textContent = `🎉 Xin chúc mừng: ${winner.name}!`;
      winnerBox.style.display = 'block';

      document.getElementById('btnAwardWinner').onclick = () => {
        window.soundFx.playStar();
        StorageManager.addPointsToStudent(winner.id, 1, 'Bốc thăm trúng phát biểu', '🎲');
        refreshData();
        wheelModal.classList.remove('active');
      };
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
              <span class="gift-tag-badge" style="background: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; font-weight: 700;">
                ${rec.gift2 ? `${rec.gift2.icon || '🎁'} ${rec.gift2.name}` : 'Quà 2'}
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
        const choreText = r.choresDone ? ' • Dặn dò/Việc nhà ✅' : '';
        text += `${idx + 1}. Bé ${item.student.name} (${item.group.name.split('-')[0].trim()}): Đọc ${r.readingCount} lần, Viết ${r.writingStars}⭐${choreText} ➔ +${r.totalStars} ⭐\n`;
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

  if (btnOpenGiftSettings) {
    btnOpenGiftSettings.addEventListener('click', () => {
      currentGiftListEditing = JSON.parse(JSON.stringify(StorageManager.getGiftItems()));
      renderGiftSettingsTable();
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
      if (confirm('Cô có chắc muốn khôi phục lại danh sách quà mẫu mặc định (bút chì, lê gô, kẹp tóc, sổ tay, cục tẩy, tranh cát, quà yêu thích)?')) {
        currentGiftListEditing = JSON.parse(JSON.stringify(StorageManager.DEFAULT_GIFTS));
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
      await StorageManager.saveGiftItems(currentGiftListEditing);
      giftSettingsModal.classList.remove('active');
      showSyncToast('Đã lưu danh sách quà tặng nở trứng thành công!', '🎁');
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

      // Lưu lịch sử nhận quà cho học sinh qua StorageManager (source: teacher)
      const updatedStudent = await StorageManager.claimStudentGift(activeGiftStudentId, giftData, 'teacher');
      if (updatedStudent) {
        const studentInState = (state.data.students || []).find(s => s.id === activeGiftStudentId);
        if (studentInState) {
          studentInState.giftHistory = updatedStudent.giftHistory;
        }
      }

      const gifts = (updatedStudent && updatedStudent.giftHistory) || [];
      renderGiftClaimHistory(gifts);

      // Hiển thị khung kết quả
      giftResultBox.style.display = 'block';
      giftResultIcon.textContent = giftData.icon || '🎁';
      giftResultTitle.textContent = `Bé đã trúng: ${giftData.name}!`;

      if (gifts.length < 2) {
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
            const giftItems = StorageManager.getGiftItems();
            renderBlindBags(giftItems);
          }
        });
      } else {
        // Đã hoàn thành cả 2 lượt quay: nút hoàn tất chuyển về 0 sao
        giftClaimTurnBadge.textContent = '✅ Đã hoàn thành 2 / 2 lượt';
        giftResultDesc.innerHTML = `
          <div style="font-size: 15px; font-weight: 800; color: #E11D48; margin-top: 6px;">
            🌟 CHÚC MỪNG CON ĐÃ MỞ XONG 2 LƯỢT QUÀ! 🌟
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #059669; margin-top: 6px; line-height: 1.5;">
            👉 Quà đã được lưu vào Bảng Tổng Hợp Quà của cô giáo!
          </div>
        `;
        giftNextActionArea.innerHTML = `
          <button type="button" id="btnFinishGiftClaim" class="btn-header primary" style="background: linear-gradient(135deg, #10B981, #059669); padding: 12px 28px; font-size: 15px; font-weight: 800; border-radius: 20px; cursor: pointer;">
            🎉 Hoàn Tất Mở Quà & Về 0 ⭐ Bắt Đầu Chu Kỳ Mới
          </button>
        `;
        document.getElementById('btnFinishGiftClaim').addEventListener('click', async () => {
          const studentId = activeGiftStudentId;
          const student = (state.data.students || []).find(s => s.id === studentId);
          giftClaimModal.classList.remove('active');
          await StorageManager.finishAndResetStudentCycle(studentId);
          refreshData();
          if (student) {
            showSyncToast(`🎉 Bé <strong>${student.name}</strong> đã nhận đủ 2 quà và được chuyển về 0 ⭐ bắt đầu chu kỳ ấp mới!`, '🏆');
          }
        });

        // Ẩn khu vực quay/mở túi khi đã xong 2 lượt
        giftWheelArea.style.display = 'none';
        giftBlindBagArea.style.display = 'none';
      }

      refreshData();
    } catch (err) {
      console.error('Lỗi khi nhận quà:', err);
    } finally {
      if ((updatedStudent && updatedStudent.giftHistory && updatedStudent.giftHistory.length >= 2)) {
        isClaimingGift = false;
      }
    }
  }

  function openGiftClaimModal(studentId) {
    activeGiftStudentId = studentId;
    isClaimingGift = false;
    const student = (state.data.students || []).find(s => s.id === studentId);
    if (!student) return;

    const giftItems = StorageManager.getGiftItems();
    giftClaimStudentName.textContent = student.name;

    const gifts = student.giftHistory || [];
    renderGiftClaimHistory(gifts);

    // Tab default
    currentGiftMode = 'wheel';
    btnModeWheel.classList.add('active');
    btnModeBlindBag.classList.remove('active');

    if (gifts.length >= 2) {
      giftClaimTurnBadge.textContent = '✅ Đã hoàn thành 2 / 2 lượt';
      giftWheelArea.style.display = 'none';
      giftBlindBagArea.style.display = 'none';
      giftResultBox.style.display = 'block';
      giftResultIcon.textContent = '🏆';
      giftResultTitle.textContent = `Bé ${student.name} đã mở đủ 2 phần quà!`;
      giftResultDesc.innerHTML = `
        <div style="font-size: 14px; font-weight: 700; color: #059669; margin-top: 6px;">
          👉 Quà đã lưu trong Bảng Tổng Hợp Quà của cô giáo! Bấm nút bên dưới để đưa bé về 0 ⭐ bắt đầu chu kỳ ấp mới.
        </div>
      `;
      giftNextActionArea.innerHTML = `
        <button type="button" id="btnResetCycleFromModal" class="btn-header primary" style="background: linear-gradient(135deg, #10B981, #059669); padding: 12px 24px; font-size: 14px; font-weight: 800; border-radius: 20px; cursor: pointer;">
          🎉 Hoàn Tất & Về 0 ⭐ Bắt Đầu Chu Kỳ Mới
        </button>
      `;
      document.getElementById('btnResetCycleFromModal').addEventListener('click', async () => {
        giftClaimModal.classList.remove('active');
        await StorageManager.finishAndResetStudentCycle(student.id);
        refreshData();
        showSyncToast(`🎉 Bé <strong>${student.name}</strong> đã chuyển về 0 ⭐ để bắt đầu chu kỳ ấp mới!`, '✨');
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

            state.data = fbData;
            localStorage.setItem(StorageManager.KEY, JSON.stringify(fbData));
            refreshData(fbData);

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
