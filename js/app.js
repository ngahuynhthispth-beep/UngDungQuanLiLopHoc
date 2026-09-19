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

    students.forEach(student => {
      const group = groups.find(g => g.id === student.group) || { name: 'Tổ 1', color: '#FF6B6B' };
      const stage = window.EggEvolution.getStage(student.stars);
      const milestone = window.EggEvolution.getNextMilestone(student.stars);
      const isSleeping = student.status === 'sleeping';

      const card = document.createElement('div');
      card.className = `student-card ${isSleeping ? 'sleeping' : ''}`;
      card.dataset.id = student.id;

      card.innerHTML = `
        <div class="group-badge" style="background: ${group.color}">
          ${group.name.split('-')[0].trim()}
        </div>

        <div class="card-top-actions">
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

        <div class="evo-progress-container">
          <div class="evo-progress-label">
            <span>${student.stars >= 71 ? 'Tiến hóa' : 'Ấp trứng'}</span>
            <span style="${student.stars < 71 ? 'color: #E11D48; font-weight: 800;' : ''}">${student.stars < 71 ? `Còn ${milestone.neededToHatch} ⭐ để nở` : (milestone.nextStage ? `Còn ${milestone.needed} ⭐` : 'Tối đa!')}</span>
          </div>
          <div class="evo-progress-bar">
            <div class="evo-progress-fill" style="width: ${student.stars < 71 ? Math.min(100, Math.round((student.stars / 71) * 100)) : milestone.progress}%; background: ${student.stars >= 71 ? 'linear-gradient(90deg, #10B981, #3B82F6)' : 'linear-gradient(90deg, #F59E0B, #EF4444)'};"></div>
          </div>
        </div>

        <div class="card-quick-btn-row">
          <button class="btn-fast-reward hand fast-action" data-action="hand" data-id="${student.id}" title="Giơ tay phát biểu (+1)">
            ✋ Phát biểu (+1)
          </button>
          <button class="btn-fast-reward quiet fast-action" data-action="quiet" data-id="${student.id}" title="Giữ trật tự (+1)">
            🤫 Trật tự (+1)
          </button>
        </div>
      `;

      // Click on Card opens full reward action sheet
      card.addEventListener('click', (e) => {
        // Prevent opening if clicked specific action buttons
        if (e.target.closest('.btn-qr-parent') || e.target.closest('.btn-zalo-card') || e.target.closest('.fast-action')) {
          return;
        }
        openActionModal(student.id);
      });

      // Quick Fast Buttons
      card.querySelector('.fast-action[data-action="hand"]').addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        createFloatingStar(rect.left + rect.width / 2, rect.top, '✋');
        window.soundFx.playStar();
        StorageManager.addPointsToStudent(student.id, 1, 'Giơ tay phát biểu sôi nổi', '✋');
        refreshData();
      });

      card.querySelector('.fast-action[data-action="quiet"]').addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        createFloatingStar(rect.left + rect.width / 2, rect.top, '🤫');
        window.soundFx.playStar();
        StorageManager.addPointsToStudent(student.id, 1, 'Giữ trật tự và ngồi ngoan', '🤫');
        refreshData();
      });

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
  function refreshData() {
    state.data = StorageManager.loadData();
    renderStudents();
    renderGroups();
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
      } else {
        const points = parseInt(btn.dataset.points || '1', 10);
        const reason = btn.dataset.reason || 'Khen thưởng';
        const icon = btn.dataset.icon || '⭐';

        window.soundFx.playStar();
        StorageManager.addPointsToStudent(studentId, points, reason, icon);
      }

      actionModal.classList.remove('active');
      refreshData();
    });
  });

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
    if (serverNetworkInfo && serverNetworkInfo.primaryIp) {
      baseUrl = `http://${serverNetworkInfo.primaryIp}:${serverNetworkInfo.port || 3000}`;
    } else if (window.location.origin && window.location.origin !== 'null' && !isFileProtocol) {
      baseUrl = window.location.origin;
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
    if (serverNetworkInfo && serverNetworkInfo.publicUrl) {
      baseUrl = serverNetworkInfo.publicUrl;
    } else if (serverNetworkInfo && serverNetworkInfo.primaryIp) {
      baseUrl = `http://${serverNetworkInfo.primaryIp}:${serverNetworkInfo.port || 3000}`;
    } else if (window.location.origin && window.location.origin !== 'null' && !window.location.protocol.startsWith('file')) {
      baseUrl = window.location.origin;
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

    StorageManager.importStudentsList(lines, autoGroup, replaceOld);
    window.soundFx.playCheer();
    pasteStudentsTextarea.value = '';
    importModal.classList.remove('active');
    refreshData();
    alert(`🎉 Đã cập nhật thành công ${lines.length} học sinh vào lớp!`);
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

    StorageManager.importStudentsList(lines, true, true);
    window.soundFx.playCheer();
    importModal.classList.remove('active');
    refreshData();
    alert(`🎉 Đã nhập thành công ${lines.length} học sinh từ file!`);
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
          <td style="padding: 8px 10px; text-align: center;">
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

    // Attach delete student
    currentStudentsTableContainer.querySelectorAll('.btn-delete-student').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const studentId = btn.dataset.id;
        if (confirm('Cô có chắc muốn xóa học sinh này khỏi lớp?')) {
          StorageManager.deleteStudent(studentId);
          renderCurrentStudentsTable();
          refreshData();
        }
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

  // Multi-tab sync event listener
  if (StorageManager.broadcast) {
    StorageManager.broadcast.onmessage = (e) => {
      if (e.data && e.data.type === 'DATA_CHANGED') {
        state.data = e.data.data;
        renderStudents();
        renderGroups();
      }
    };
  }

  // Initial render
  refreshData();
});
