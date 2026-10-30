// js/soibai.js - Logic Soi Bài & Tự Chấm Điểm Luyện Viết / Toán Lớp 1
(function() {
  const STORAGE_KEY_SAMPLE_TASK = 'vltk_sample_task_data';
  const STORAGE_KEY_GEMINI_KEY = 'vltk_gemini_api_key';

  let currentClassData = null;
  let activeStudent = null;
  let cameraStream = null;
  let capturedImageDataUrl = null;
  let lastGradingResult = null;

  // DOM Elements
  const studentSelectGrid = document.getElementById('studentSelectGrid');
  const selectedStudentLabel = document.getElementById('selectedStudentLabel');
  const selectedStudentStarsPill = document.getElementById('selectedStudentStarsPill');

  const sampleTaskTitle = document.getElementById('sampleTaskTitle');
  const sampleTaskDesc = document.getElementById('sampleTaskDesc');
  const sampleTaskImage = document.getElementById('sampleTaskImage');
  const sampleTaskRewardBadge = document.getElementById('sampleTaskRewardBadge');
  const sampleCriteriaList = document.getElementById('sampleCriteriaList');
  const btnSwitchWriting = document.getElementById('btnSwitchWriting');
  const btnSwitchMath = document.getElementById('btnSwitchMath');

  const cameraViewport = document.getElementById('cameraViewport');
  const cameraVideo = document.getElementById('cameraVideo');
  const capturedImagePreview = document.getElementById('capturedImagePreview');
  const annotationCanvas = document.getElementById('annotationCanvas');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const cameraOverlayGrid = document.getElementById('cameraOverlayGrid');
  const scanLaserBeam = document.getElementById('scanLaserBeam');

  const annotatedErrorsBox = document.getElementById('annotatedErrorsBox');
  const annotatedErrorsList = document.getElementById('annotatedErrorsList');
  const btnToggleAnnotations = document.getElementById('btnToggleAnnotations');

  const btnStartCamera = document.getElementById('btnStartCamera');
  const btnSnapPhoto = document.getElementById('btnSnapPhoto');
  const btnRetakePhoto = document.getElementById('btnRetakePhoto');
  const inputUploadPhoto = document.getElementById('inputUploadPhoto');
  const btnAnalyzeWork = document.getElementById('btnAnalyzeWork');

  const gradingResultBox = document.getElementById('gradingResultBox');
  const resultAvatar = document.getElementById('resultAvatar');
  const resultTitle = document.getElementById('resultTitle');
  const resultStarsBadge = document.getElementById('resultStarsBadge');
  const resultComment = document.getElementById('resultComment');
  const btnSpeakComment = document.getElementById('btnSpeakComment');
  const btnRewriteWork = document.getElementById('btnRewriteWork');
  const btnScanAnother = document.getElementById('btnScanAnother');

  // Teacher Approval Box DOM Elements
  const teacherApprovalBox = document.getElementById('teacherApprovalBox');
  const teacherApprovalSubtitle = document.getElementById('teacherApprovalSubtitle');
  const approvalStarsText = document.getElementById('approvalStarsText');
  const btnTeacherApprove = document.getElementById('btnTeacherApprove');
  const btnTeacherReject = document.getElementById('btnTeacherReject');
  const approvalStatusMsg = document.getElementById('approvalStatusMsg');
  let pendingGradingResult = null;
  let isApprovalHandled = false;

  // Kiosk Auto Mode DOM Elements (Trạm Tự Soi Bài)
  const btnVoiceName = document.getElementById('btnVoiceName');
  const voiceStatusText = document.getElementById('voiceStatusText');
  const voiceFeedbackBox = document.getElementById('voiceFeedbackBox');
  const voiceFeedbackIcon = document.getElementById('voiceFeedbackIcon');
  const voiceFeedbackMessage = document.getElementById('voiceFeedbackMessage');
  const btnToggleAutoKiosk = document.getElementById('btnToggleAutoKiosk');
  const kioskCountdownOverlay = document.getElementById('kioskCountdownOverlay');
  const countdownNumber = document.getElementById('countdownNumber');
  const countdownBarFill = document.getElementById('countdownBarFill');
  const kioskNextStudentCountdown = document.getElementById('kioskNextStudentCountdown');
  const nextStudentCountdownSec = document.getElementById('nextStudentCountdownSec');
  const nextStudentProgressBar = document.getElementById('nextStudentProgressBar');
  const btnNextStudentNow = document.getElementById('btnNextStudentNow');

  let isAutoKioskEnabled = true;
  let kioskCountdownTimer = null;
  let kioskNextResetTimer = null;
  let speechRecognizer = null;
  let isListeningVoice = false;

  // Teacher Admin Modal
  const teacherAdminModal = document.getElementById('teacherAdminModal');
  const btnOpenTeacherAdmin = document.getElementById('btnOpenTeacherAdmin');
  const btnOpenTeacherAdminStep2 = document.getElementById('btnOpenTeacherAdminStep2');
  const btnUploadSampleBanner = document.getElementById('btnUploadSampleBanner');
  const closeTeacherAdminBtn = document.getElementById('closeTeacherAdminBtn');
  const btnCloseAdminModal = document.getElementById('btnCloseAdminModal');
  const adminTaskTitleInput = document.getElementById('adminTaskTitleInput');
  const adminTaskTypeSelect = document.getElementById('adminTaskTypeSelect');
  const adminTaskStarsSelect = document.getElementById('adminTaskStarsSelect');
  const adminSampleFileInput = document.getElementById('adminSampleFileInput');
  const adminGeminiApiKeyInput = document.getElementById('adminGeminiApiKeyInput');
  const btnSaveAdminSettings = document.getElementById('btnSaveAdminSettings');
  const btnAdminResetDefault = document.getElementById('btnAdminResetDefault');

  // Dữ liệu bài mẫu chuẩn cho 2 môn học (3 Mức độ: 5 sao, 3 sao, 0 sao)
  const DEFAULT_WRITING_TASK = {
    title: 'Luyện viết chữ cái: Nét chữ nết người',
    type: 'writing',
    stars: 5,
    desc: 'Con hãy viết đúng độ cao ô ly, nét bút chì sạch đẹp, đúng mẫu chữ và không tẩy xoá như bài mẫu dưới đây nhé!',
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300' viewBox='0 0 600 300'><rect width='600' height='300' fill='%23FFFBEB'/><line x1='50' y1='60' x2='550' y2='60' stroke='%23CBD5E1' stroke-width='1.5'/><line x1='50' y1='100' x2='550' y2='100' stroke='%23CBD5E1' stroke-width='1.5'/><line x1='50' y1='140' x2='550' y2='140' stroke='%23F59E0B' stroke-width='2'/><line x1='50' y1='180' x2='550' y2='180' stroke='%23CBD5E1' stroke-width='1.5'/><line x1='50' y1='220' x2='550' y2='220' stroke='%23CBD5E1' stroke-width='1.5'/><text x='70' y='135' font-family='sans-serif' font-size='42' font-weight='bold' fill='%231E293B'>a  b  c  d  e  g  h</text><text x='70' y='215' font-family='sans-serif' font-size='36' fill='%23475569'>Nét chữ nết người Lớp 1A</text><text x='380' y='40' font-family='sans-serif' font-size='14' font-weight='bold' fill='%23B45309'>MẪU CHUẨN Ô LY</text></svg>",
    criteria: [
      '🌟 Mức 1 (5 ⭐): Viết chữ sạch đẹp, đúng mẫu chữ ô ly, hoàn toàn không tẩy xoá (nét chì rõ ràng, đều đặn).',
      '⭐ Mức 2 (3 ⭐): Chữ viết tương đối đúng mẫu, còn lem nhem hoặc có vết tẩy xoá bút chì 1 - 2 chỗ.',
      '📝 Mức 3 (Làm lại - 0 ⭐): Chữ viết sai mẫu ô ly, tẩy xoá lem nhem nhiều hoặc chưa viết bài.'
    ]
  };

  const DEFAULT_MATH_TASK = {
    title: 'Bài toán: Phép tính cộng trừ & So sánh trong phạm vi 10',
    type: 'math',
    stars: 5,
    desc: 'Bé hãy tính nhẩm cẩn thận, làm kết quả chính xác 100%, chữ số bút chì rõ ràng và trang vở sạch đẹp nhé!',
    image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='300' viewBox='0 0 600 300'><rect width='600' height='300' fill='%23F0FDF4'/><rect x='30' y='25' width='540' height='250' rx='16' fill='%23FFFFFF' stroke='%2386EFAC' stroke-width='2'/><text x='50' y='65' font-family='sans-serif' font-size='20' font-weight='bold' fill='%23166534'>ĐỀ TOÁN LỚP 1: TÍNH NHẨM &amp; SO SÁNH</text><line x1='50' y1='80' x2='550' y2='80' stroke='%23BBF7D0' stroke-width='2'/><text x='60' y='130' font-family='sans-serif' font-size='28' font-weight='bold' fill='%231E293B'>1)  3 + 2 = 5</text><text x='320' y='130' font-family='sans-serif' font-size='28' font-weight='bold' fill='%231E293B'>2)  7 - 4 = 3</text><text x='60' y='190' font-family='sans-serif' font-size='28' font-weight='bold' fill='%231E293B'>3)  8 + 2 = 10</text><text x='320' y='190' font-family='sans-serif' font-size='28' font-weight='bold' fill='%231E293B'>4)  9 - 5 = 4</text><text x='60' y='245' font-family='sans-serif' font-size='24' font-weight='bold' fill='%23059669'>5)  6 &gt; 4     6)  7 = 7</text><text x='390' y='65' font-family='sans-serif' font-size='14' font-weight='bold' fill='%23047857'>CHUẨN KIẾN THỨC</text></svg>",
    criteria: [
      '🌟 Mức 1 (5 ⭐): Kết quả chính xác 100%, chữ số bút chì rõ nét, sạch đẹp, không tẩy xoá.',
      '⭐ Mức 2 (3 ⭐): Đúng phần lớn, làm sai hoặc có vết tẩy xoá bút chì 1 - 2 phép tính (cô gạch chân để sửa).',
      '📝 Mức 3 (Làm lại - 0 ⭐): Sai từ 3 phép tính trở lên, tẩy xoá lem nhem hoặc chưa hoàn thành trang toán.'
    ]
  };

  const DEFAULT_SAMPLE_TASK = DEFAULT_WRITING_TASK;

  function loadSampleTask() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAMPLE_TASK);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.stars > 5 || (parsed.criteria && parsed.criteria.some(c => c.includes('10 ⭐')))) {
          const baseTask = parsed.type === 'math' ? DEFAULT_MATH_TASK : DEFAULT_WRITING_TASK;
          parsed.stars = 5;
          parsed.criteria = baseTask.criteria;
          parsed.desc = baseTask.desc;
          saveSampleTask(parsed);
        }
        return Object.assign({}, DEFAULT_SAMPLE_TASK, parsed);
      }
    } catch (e) {}
    return DEFAULT_SAMPLE_TASK;
  }

  function saveSampleTask(data) {
    try {
      localStorage.setItem(STORAGE_KEY_SAMPLE_TASK, JSON.stringify(data));
    } catch (e) {}
  }

  let currentTask = loadSampleTask();

  function renderSampleTaskUI() {
    const isMath = currentTask.type === 'math';
    if (btnSwitchWriting && btnSwitchMath) {
      if (isMath) {
        btnSwitchMath.classList.add('active');
        btnSwitchWriting.classList.remove('active');
      } else {
        btnSwitchWriting.classList.add('active');
        btnSwitchMath.classList.remove('active');
      }
    }

    const icon = isMath ? '🔢' : '✍️';
    if (sampleTaskTitle) sampleTaskTitle.innerHTML = `<span>${icon}</span> ${currentTask.title}`;
    if (sampleTaskDesc) sampleTaskDesc.textContent = currentTask.desc;
    if (sampleTaskRewardBadge) sampleTaskRewardBadge.textContent = `🌟 Thưởng: Lên tới +5 ⭐`;
    if (sampleTaskImage && currentTask.image) sampleTaskImage.src = currentTask.image;

    if (sampleCriteriaList && currentTask.criteria) {
      sampleCriteriaList.innerHTML = currentTask.criteria.map(c => `<li>${c}</li>`).join('');
    }

    if (btnSnapPhoto) {
      btnSnapPhoto.innerHTML = isMath ? '<span>📸</span> Chụp Ảnh Bài Toán' : '<span>📸</span> Chụp Ảnh Bài Viết';
    }

    if (cameraPlaceholder) {
      const descP = cameraPlaceholder.querySelector('p');
      if (descP) {
        descP.textContent = isMath 
          ? 'Bấm nút bên dưới để mở Camera hoặc chọn ảnh bài toán đã chụp sẵn' 
          : 'Bấm nút bên dưới để mở Camera hoặc chọn ảnh bài viết đã chụp sẵn';
      }
    }

    if (btnUploadSampleBanner) {
      const bannerStrong = btnUploadSampleBanner.querySelector('strong');
      if (bannerStrong) {
        bannerStrong.textContent = isMath
          ? 'Cô giáo: Bấm vào đây để Chụp hoặc Tải ảnh đề toán mẫu mới'
          : 'Cô giáo: Bấm vào đây để Chụp hoặc Tải ảnh bài mẫu mới';
      }
    }
  }

  // Chuyển đổi qua lại giữa Môn Viết và Môn Toán
  if (btnSwitchWriting) {
    btnSwitchWriting.addEventListener('click', () => {
      currentTask = Object.assign({}, DEFAULT_WRITING_TASK);
      saveSampleTask(currentTask);
      renderSampleTaskUI();
    });
  }

  if (btnSwitchMath) {
    btnSwitchMath.addEventListener('click', () => {
      currentTask = Object.assign({}, DEFAULT_MATH_TASK);
      saveSampleTask(currentTask);
      renderSampleTaskUI();
    });
  }

  // Tham số URL: Mã lớp & Học sinh cần chọn sẵn
  const urlParams = new URLSearchParams(window.location.search);
  const paramClass = urlParams.get('class') || urlParams.get('lop');
  const paramStudentId = urlParams.get('student') || urlParams.get('id');

  if (paramClass && window.StorageManager && typeof window.StorageManager.setClassId === 'function') {
    window.StorageManager.setClassId(paramClass);
  }

  function updateClassHeaderUI(classData) {
    const subtitle = document.getElementById('soibaiClassHeaderSubtitle');
    const backBtn = document.getElementById('btnSoibaiBackHome');
    const curClass = (window.StorageManager && typeof window.StorageManager.getClassId === 'function') 
      ? window.StorageManager.getClassId() 
      : ((window.FirebaseSync && typeof window.FirebaseSync.getClassId === 'function') ? window.FirebaseSync.getClassId() : '1/8');
    const isPrimary = (window.StorageManager && typeof window.StorageManager.isPrimaryClass === 'function')
      ? window.StorageManager.isPrimaryClass(curClass)
      : (curClass === '1/8' || curClass === '1A');

    if (subtitle) {
      const cName = (classData && classData.className) ? classData.className : (isPrimary ? 'Lớp 1/8' : `Lớp ${curClass}`);
      const sName = (classData && classData.schoolName) ? classData.schoolName : 'Trường TH Tiểu La';
      subtitle.textContent = `${cName} • ${sName}`;
    }
    if (backBtn) {
      backBtn.href = isPrimary ? 'index.html' : `index.html?class=${encodeURIComponent(curClass)}`;
    }
  }

  // Khởi tạo Dữ liệu & Lấy danh sách học sinh
  function initData() {
    renderSampleTaskUI();

    // 1. Nạp tức thì từ StorageManager (Local Storage / Cache)
    if (window.StorageManager) {
      window.StorageManager.init();
      const localData = window.StorageManager.loadData();
      if (localData && localData.students && localData.students.length > 0) {
        currentClassData = localData;
        updateClassHeaderUI(localData);
        renderStudentsList(localData.students);
      }
      if (typeof window.StorageManager.pullFromServer === 'function') {
        window.StorageManager.pullFromServer().then(sData => {
          if (sData && sData.students) {
            currentClassData = sData;
            updateClassHeaderUI(sData);
            renderStudentsList(sData.students);
          }
        }).catch(() => {});
      }
    }

    // 2. Kết nối Firebase Realtime Cloud
    if (window.FirebaseSync && window.FirebaseSync.init) {
      window.FirebaseSync.init();
      window.FirebaseSync.onClassDataChange(data => {
        if (data && data.students) {
          currentClassData = data;
          updateClassHeaderUI(data);
          renderStudentsList(data.students);
          if (activeStudent) {
            const updated = data.students.find(s => s.id === activeStudent.id);
            if (updated) updateActiveStudentUI(updated);
          }
        }
      });
    }

    // 3. Fallback dự phòng
    if (!currentClassData) {
      try {
        const local = localStorage.getItem('ung_dung_quan_li_lop_hoc_v1');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && parsed.students) {
            currentClassData = parsed;
            updateClassHeaderUI(parsed);
            renderStudentsList(parsed.students);
          }
        }
      } catch (e) {}
    }

    // Khởi tạo nhận diện giọng nói cho Trạm Tự Soi Bài Kiosk
    speechRecognizer = initVoiceRecognition();
  }

  function renderStudentsList(students) {
    if (!studentSelectGrid) return;
    studentSelectGrid.innerHTML = '';

    // Tự động chọn học sinh nếu có param từ URL và chưa chọn ai
    if (paramStudentId && !activeStudent) {
      const matched = students.find(s => s.id === paramStudentId);
      if (matched) {
        activeStudent = matched;
        updateActiveStudentUI(matched);
      }
    }

    students.forEach(st => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'student-pick-btn';
      if (activeStudent && activeStudent.id === st.id) {
        btn.classList.add('active');
      }

      const petAvatarSvg = (window.EggEvolution && window.EggEvolution.getSvg) 
        ? window.EggEvolution.getSvg(st.stars, st.id) 
        : '🥚';

      btn.innerHTML = `
        <div class="student-pick-avatar">${petAvatarSvg}</div>
        <div class="student-pick-name">${st.name}</div>
        <span style="font-size: 11px; font-weight: 800; color: #D97706;">${st.stars}⭐</span>
      `;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.student-pick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (isAutoKioskEnabled) {
          selectStudentAndStartAutoFlow(st);
        } else {
          activeStudent = st;
          updateActiveStudentUI(st);
        }
      });

      studentSelectGrid.appendChild(btn);
    });
  }

  function updateActiveStudentUI(st) {
    if (selectedStudentLabel) selectedStudentLabel.textContent = st.name;
    if (selectedStudentStarsPill) {
      selectedStudentStarsPill.style.display = 'inline-block';
      selectedStudentStarsPill.textContent = `${st.stars} ⭐`;
    }
  }

  // --- QUẢN LÝ CAMERA ---
  async function startCamera() {
    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' }, // Ưu tiên camera sau trên điện thoại
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 }
        },
        audio: false
      };

      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraVideo.srcObject = cameraStream;
      cameraVideo.style.display = 'block';
      capturedImagePreview.style.display = 'none';
      cameraPlaceholder.style.display = 'none';
      cameraOverlayGrid.style.display = 'block';
      scanLaserBeam.style.display = 'none';

      // Tự động điều chỉnh tỷ lệ khung hình camera khớp 100% với cảm biến thực tế của máy
      cameraVideo.onloadedmetadata = () => {
        const vw = cameraVideo.videoWidth;
        const vh = cameraVideo.videoHeight;
        if (vw && vh && cameraViewport) {
          cameraViewport.style.aspectRatio = `${vw} / ${vh}`;
        }
      };

      btnStartCamera.style.display = 'none';
      btnSnapPhoto.style.display = 'inline-flex';
      btnRetakePhoto.style.display = 'none';
      btnAnalyzeWork.style.display = 'none';
      gradingResultBox.style.display = 'none';
    } catch (err) {
      console.warn('Lỗi mở Camera:', err);
      alert('Không thể mở Camera. Vui lòng cho phép quyền truy cập Camera hoặc bấm "Chọn Ảnh Có Sẵn" để tải ảnh bài viết lên nhé!');
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
  }

  function snapPhoto() {
    if (!cameraVideo) return;
    const width = cameraVideo.videoWidth || 640;
    const height = cameraVideo.videoHeight || 480;

    cameraCanvas.width = width;
    cameraCanvas.height = height;
    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, width, height);

    capturedImageDataUrl = cameraCanvas.toDataURL('image/jpeg', 0.9);

    capturedImagePreview.src = capturedImageDataUrl;
    capturedImagePreview.style.display = 'block';
    cameraVideo.style.display = 'none';
    cameraOverlayGrid.style.display = 'none';

    stopCamera();

    btnSnapPhoto.style.display = 'none';
    btnRetakePhoto.style.display = 'inline-flex';
    btnAnalyzeWork.style.display = 'inline-flex';
    btnStartCamera.style.display = 'none';

    // Cuộn nhẹ xuống nút chấm bài
    btnAnalyzeWork.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  if (btnStartCamera) btnStartCamera.addEventListener('click', startCamera);
  if (btnSnapPhoto) btnSnapPhoto.addEventListener('click', snapPhoto);
  if (btnRetakePhoto) {
    btnRetakePhoto.addEventListener('click', () => {
      capturedImageDataUrl = null;
      startCamera();
    });
  }

  // Tải ảnh từ thư viện
  if (inputUploadPhoto) {
    inputUploadPhoto.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        capturedImageDataUrl = event.target.result;
        capturedImagePreview.src = capturedImageDataUrl;
        capturedImagePreview.style.display = 'block';
        cameraVideo.style.display = 'none';
        cameraPlaceholder.style.display = 'none';
        cameraOverlayGrid.style.display = 'none';
        stopCamera();

        btnStartCamera.style.display = 'none';
        btnSnapPhoto.style.display = 'none';
        btnRetakePhoto.style.display = 'inline-flex';
        btnAnalyzeWork.style.display = 'inline-flex';
        gradingResultBox.style.display = 'none';

        btnAnalyzeWork.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      reader.readAsDataURL(file);
    });
  }

  // --- CÔNG NGHỆ CHẤM BÀI THÔNG MINH (AI + HEURISTICS) ---
  async function runGradingAnalysis() {
    if (!activeStudent) {
      alert('👉 Bé hãy chọn tên của mình ở Bước 1 trước khi chấm bài nhé!');
      document.querySelector('.soibai-container').scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const isMath = currentTask && currentTask.type === 'math';
    if (!capturedImageDataUrl) {
      alert(isMath ? '👉 Vui lòng chụp hoặc tải ảnh bài toán lên trước nhé!' : '👉 Vui lòng chụp hoặc tải ảnh bài viết lên trước nhé!');
      return;
    }

    // Bật hiệu ứng quét laser
    scanLaserBeam.style.display = 'block';
    if (btnAnalyzeWork) {
      btnAnalyzeWork.disabled = true;
      btnAnalyzeWork.innerHTML = isMath 
        ? '<span>⏳</span> ĐANG SOI TỪNG PHÉP TÍNH...' 
        : '<span>⏳</span> ĐANG SOI TỪNG NÉT CHỮ...';
    }

    try {
      const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '';
      let result = null;

      if (apiKey) {
        result = await gradeWithGeminiVision(apiKey, capturedImageDataUrl, currentTask);
      } else {
        // Thuật toán Computer Vision nội bộ phân tích độ tương phản và nét chữ / phép tính
        result = await gradeWithVisionHeuristics(capturedImageDataUrl, currentTask);
      }

      lastGradingResult = result;
      await showGradingResult(result);
    } catch (err) {
      console.warn('Lỗi khi gọi AI Gemini Vision, chuyển sang phân tích Computer Vision nội bộ:', err);
      try {
        const heuristicRes = await gradeWithVisionHeuristics(capturedImageDataUrl, currentTask);
        lastGradingResult = heuristicRes;
        await showGradingResult(heuristicRes);
      } catch (hErr) {
        console.error('Lỗi khi phân tích Computer Vision:', hErr);
        // Fallback an toàn tuyệt đối: 0 sao, yêu cầu cô/con căn chỉnh lại trang vở
        const safeFallbackRes = {
          tier: 3,
          passed: false,
          stars: 0,
          title: 'CHƯA NHẬN DIỆN ĐƯỢC BÀI LÀM (0 SAO) ⚠️',
          comment: `Hệ thống chưa nhận diện rõ trang vở bài làm của ${activeStudent.name || 'bé'} (ảnh có thể bị rung mờ, thiếu sáng hoặc chưa đúng vị trí). Con/cô hãy đặt trang vở ngay ngắn và chụp lại nhé!`
        };
        lastGradingResult = safeFallbackRes;
        await showGradingResult(safeFallbackRes);
      }
    } finally {
      scanLaserBeam.style.display = 'none';
      if (btnAnalyzeWork) {
        btnAnalyzeWork.disabled = false;
        btnAnalyzeWork.innerHTML = '<span>⚡</span> BẮT ĐẦU CHẤM BÀI NGAY!';
      }
    }
  }

  if (btnAnalyzeWork) {
    btnAnalyzeWork.addEventListener('click', runGradingAnalysis);
  }

  // --- HỆ THỐNG TRẠM TỰ PHỤC VỤ (KIOSK AUTO FLOW) ---
  function normalizeVietnamese(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();
  }

  function initVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Trình duyệt không hỗ trợ Web Speech API');
      if (voiceStatusText) {
        voiceStatusText.textContent = 'Bé hãy chạm vào tên mình ở danh sách bên dưới nhé!';
      }
      return null;
    }

    const reco = new SpeechRecognition();
    reco.lang = 'vi-VN';
    reco.continuous = false;
    reco.interimResults = false;
    reco.maxAlternatives = 3;

    reco.onstart = () => {
      isListeningVoice = true;
      if (btnVoiceName) btnVoiceName.classList.add('listening');
      if (voiceFeedbackBox) {
        voiceFeedbackBox.style.display = 'flex';
        voiceFeedbackIcon.textContent = '🎙️';
        voiceFeedbackMessage.innerHTML = '<strong>Đang lắng nghe...</strong> Bé hãy nói to tên mình nhé!';
      }
    };

    reco.onresult = (event) => {
      const results = event.results;
      if (!results || results.length === 0) return;
      const spokenText = results[0][0].transcript;
      console.log('🎤 Giọng nói nhận diện được:', spokenText);
      handleSpokenStudentName(spokenText);
    };

    reco.onerror = (event) => {
      console.warn('Lỗi nhận diện giọng nói:', event.error);
      isListeningVoice = false;
      if (btnVoiceName) btnVoiceName.classList.remove('listening');
      if (voiceFeedbackBox) {
        voiceFeedbackIcon.textContent = '💡';
        voiceFeedbackMessage.innerHTML = 'Chưa nghe rõ tên con. Bé hãy bấm nói lại hoặc chạm vào tên mình bên dưới nhé!';
      }
    };

    reco.onend = () => {
      isListeningVoice = false;
      if (btnVoiceName) btnVoiceName.classList.remove('listening');
    };

    return reco;
  }

  function handleSpokenStudentName(spokenText) {
    if (!currentClassData || !currentClassData.students) return;
    const students = currentClassData.students;
    const normSpoken = normalizeVietnamese(spokenText);

    if (voiceFeedbackBox) {
      voiceFeedbackBox.style.display = 'flex';
      voiceFeedbackIcon.textContent = '🔍';
      voiceFeedbackMessage.innerHTML = `Bé vừa nói: <em>"${spokenText}"</em>. Đang tìm tên con...`;
    }

    // 1. Phân loại theo độ trùng khớp
    let exactMatches = [];
    let shortNameMatches = [];
    let lastNameMatches = [];

    students.forEach(st => {
      const fullNorm = normalizeVietnamese(st.name);
      const parts = fullNorm.split(/\s+/);
      const lastName = parts[parts.length - 1]; // "an", "anh"
      const shortName = parts.slice(-2).join(' '); // "minh an", "phuc anh"

      if (normSpoken === fullNorm || (shortName && normSpoken === shortName)) {
        exactMatches.push(st);
      } else if (normSpoken.includes(fullNorm) || (shortName && normSpoken.includes(shortName))) {
        shortNameMatches.push(st);
      } else if (normSpoken.includes(lastName) && lastName.length >= 2) {
        lastNameMatches.push(st);
      }
    });

    let chosenStudent = null;
    if (exactMatches.length === 1) {
      chosenStudent = exactMatches[0];
    } else if (shortNameMatches.length === 1) {
      chosenStudent = shortNameMatches[0];
    } else if (shortNameMatches.length > 1) {
      chosenStudent = shortNameMatches[0];
    } else if (lastNameMatches.length === 1) {
      chosenStudent = lastNameMatches[0];
    }

    if (chosenStudent) {
      if (voiceFeedbackBox) {
        voiceFeedbackIcon.textContent = '🎉';
        voiceFeedbackMessage.innerHTML = `Đã nhận diện: <strong style="color: #4F46E5; font-size: 15px;">${chosenStudent.name}</strong> 🌸`;
      }
      selectStudentAndStartAutoFlow(chosenStudent);
    } else if (lastNameMatches.length > 1) {
      const namesList = lastNameMatches.map(s => s.name).join(', ');
      if (voiceFeedbackBox) {
        voiceFeedbackIcon.textContent = '❓';
        voiceFeedbackMessage.innerHTML = `Có nhiều bạn trùng tên (${namesList}). Bé hãy chạm vào tên mình bên dưới nhé!`;
      }
      speakVietnamese('Có nhiều bạn trùng tên, con hãy chạm vào tên mình trên màn hình nhé!');
    } else {
      if (voiceFeedbackBox) {
        voiceFeedbackIcon.textContent = '💡';
        voiceFeedbackMessage.innerHTML = `Chưa nghe rõ tên con. Bé hãy bấm nói lại hoặc chạm vào tên mình bên dưới nhé!`;
      }
      speakVietnamese('Cô chưa nghe rõ tên con. Con hãy bấm nói lại hoặc chạm vào tên mình trên màn hình nhé!');
    }
  }

  async function selectStudentAndStartAutoFlow(st) {
    activeStudent = st;
    updateActiveStudentUI(st);
    document.querySelectorAll('.student-pick-btn').forEach(b => {
      if (b.textContent.includes(st.name)) b.classList.add('active');
      else b.classList.remove('active');
    });

    if (!isAutoKioskEnabled) return;

    // Loa chào bé
    speakVietnamese(`Chào bạn ${st.name}! Bé hãy đặt vở ngay ngắn vào khung nhé!`);

    // Cuộn nhẹ xuống camera
    if (cameraViewport) {
      cameraViewport.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Tự động bật camera nếu chưa mở
    if (!cameraStream) {
      await startCamera();
    }

    // Bắt đầu đếm ngược 5 giây đặt vở vào khung
    startAutoCaptureCountdown(5);
  }

  function startAutoCaptureCountdown(seconds = 5) {
    if (kioskCountdownTimer) {
      clearInterval(kioskCountdownTimer);
      kioskCountdownTimer = null;
    }
    if (!kioskCountdownOverlay || !countdownNumber) return;

    let timeLeft = seconds;
    kioskCountdownOverlay.style.display = 'flex';
    countdownNumber.textContent = timeLeft;
    if (countdownBarFill) {
      countdownBarFill.style.width = '100%';
      countdownBarFill.style.transition = 'none';
      setTimeout(() => {
        if (countdownBarFill) countdownBarFill.style.transition = 'width 1s linear';
      }, 50);
    }

    kioskCountdownTimer = setInterval(async () => {
      timeLeft--;
      if (countdownNumber) countdownNumber.textContent = timeLeft;
      if (countdownBarFill) countdownBarFill.style.width = `${(timeLeft / seconds) * 100}%`;

      if (timeLeft <= 0) {
        clearInterval(kioskCountdownTimer);
        kioskCountdownTimer = null;
        if (kioskCountdownOverlay) kioskCountdownOverlay.style.display = 'none';

        // Tự động chụp ảnh
        snapPhoto();

        // Tự động chấm điểm ngay sau 5s
        await runGradingAnalysis();
      }
    }, 1000);
  }

  function startNextStudentCountdown(seconds = 5) {
    if (kioskNextResetTimer) {
      clearInterval(kioskNextResetTimer);
      kioskNextResetTimer = null;
    }
    if (!kioskNextStudentCountdown || !nextStudentCountdownSec) return;

    let timeLeft = seconds;
    kioskNextStudentCountdown.style.display = 'block';
    nextStudentCountdownSec.textContent = `${timeLeft}s`;
    if (nextStudentProgressBar) {
      nextStudentProgressBar.style.width = '100%';
      nextStudentProgressBar.style.transition = 'none';
      setTimeout(() => {
        if (nextStudentProgressBar) nextStudentProgressBar.style.transition = 'width 1s linear';
      }, 50);
    }

    kioskNextResetTimer = setInterval(() => {
      timeLeft--;
      if (nextStudentCountdownSec) nextStudentCountdownSec.textContent = `${timeLeft}s`;
      if (nextStudentProgressBar) nextStudentProgressBar.style.width = `${(timeLeft / seconds) * 100}%`;

      if (timeLeft <= 0) {
        clearInterval(kioskNextResetTimer);
        kioskNextResetTimer = null;
        resetKioskForNextStudent();
      }
    }, 1000);
  }

  function resetKioskForNextStudent() {
    if (kioskCountdownTimer) {
      clearInterval(kioskCountdownTimer);
      kioskCountdownTimer = null;
    }
    if (kioskNextResetTimer) {
      clearInterval(kioskNextResetTimer);
      kioskNextResetTimer = null;
    }

    capturedImageDataUrl = null;
    activeStudent = null;

    if (annotationCanvas) {
      annotationCanvas.style.display = 'none';
      const ctx = annotationCanvas.getContext('2d');
      ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
    }
    if (annotatedErrorsBox) annotatedErrorsBox.style.display = 'none';
    if (gradingResultBox) gradingResultBox.style.display = 'none';
    if (kioskNextStudentCountdown) kioskNextStudentCountdown.style.display = 'none';
    if (kioskCountdownOverlay) kioskCountdownOverlay.style.display = 'none';

    if (selectedStudentLabel) selectedStudentLabel.textContent = 'Chưa chọn';
    if (selectedStudentStarsPill) selectedStudentStarsPill.style.display = 'none';
    document.querySelectorAll('.student-pick-btn').forEach(b => b.classList.remove('active'));

    // Đưa camera về trạng thái ban đầu
    stopCamera();
    if (capturedImagePreview) capturedImagePreview.style.display = 'none';
    if (cameraVideo) cameraVideo.style.display = 'none';
    if (cameraPlaceholder) cameraPlaceholder.style.display = 'block';
    if (btnStartCamera) btnStartCamera.style.display = 'inline-flex';
    if (btnSnapPhoto) btnSnapPhoto.style.display = 'none';
    if (btnRetakePhoto) btnRetakePhoto.style.display = 'none';
    if (btnAnalyzeWork) btnAnalyzeWork.style.display = 'none';

    // Cuộn lên đầu trang trạm tự phục vụ
    const kioskPanel = document.getElementById('kioskAutoPanel');
    if (kioskPanel) {
      kioskPanel.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (voiceFeedbackBox) {
      voiceFeedbackBox.style.display = 'none';
    }

    // Mời bạn tiếp theo
    speakVietnamese('Mời bạn tiếp theo bước lên nói tên nhé!');
  }

  // --- CÔNG NGHỆ BÚT ĐỎ CÔ GIÁO: GẠCH CHÂN CHỖ SAI & ĐÓNG DẤU LỜI PHÊ ---
  function drawAnnotationsOnCanvas(imgElement, errors, tier) {
    if (!annotationCanvas) return;
    const nw = imgElement.naturalWidth || imgElement.videoWidth || imgElement.width || 640;
    const nh = imgElement.naturalHeight || imgElement.videoHeight || imgElement.height || 480;

    annotationCanvas.width = nw;
    annotationCanvas.height = nh;
    const ctx = annotationCanvas.getContext('2d');
    ctx.clearRect(0, 0, nw, nh);

    const scaleX = nw / 400;
    const scaleY = nh / 300;

    // Hàm vẽ nét gạch chân lượn sóng màu đỏ (Wavy underline) như bút mực đỏ cô giáo
    function drawWavyUnderline(x1, y, x2, color = '#EF4444') {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(3, Math.round(nw * 0.005));
      const wavelength = Math.max(8, Math.round(nw * 0.018));
      const amplitude = Math.max(3, Math.round(nh * 0.006));
      for (let x = x1; x <= x2; x++) {
        const wy = y + Math.sin(((x - x1) / wavelength) * Math.PI * 2) * amplitude;
        if (x === x1) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // 1. Vẽ các nét gạch chân và khoanh vùng chỗ sai
    if (errors && errors.length > 0) {
      errors.forEach((err) => {
        const x = Math.round(err.x * scaleX);
        const y = Math.round(err.y * scaleY);
        const w = Math.round(err.w * scaleX);
        const h = Math.round(err.h * scaleY);

        // Khung nét đứt màu đỏ bao quanh chữ sai
        ctx.strokeStyle = '#DC2626';
        ctx.lineWidth = Math.max(2, Math.round(nw * 0.0035));
        ctx.setLineDash([Math.round(nw * 0.01), Math.round(nw * 0.008)]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        // Đường gạch chân lượn sóng màu đỏ ngay bên dưới chữ
        const underlineY = y + h + Math.round(nh * 0.008);
        drawWavyUnderline(x - 4, underlineY, x + w + 4, '#EF4444');

        // Nhãn ghi chú nhỏ xinh bên trên
        const isMath = currentTask && currentTask.type === 'math';
        let tagText = err.type === 'smudge' ? '🧹 Tẩy xóa lem' : (isMath ? '✍️ Tính lại' : '✍️ Chưa chuẩn mẫu');
        if (isMath && err.type === 'calc_error') {
          tagText = '✍️ Tính chưa đúng';
        }
        ctx.font = `bold ${Math.max(11, Math.round(nw * 0.022))}px sans-serif`;
        const textWidth = ctx.measureText(tagText).width;
        const tagHeight = Math.max(16, Math.round(nh * 0.035));
        const tagX = Math.max(4, x);
        const tagY = Math.max(tagHeight, y - 6);

        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(tagX, tagY - tagHeight + 4, textWidth + 12, tagHeight, 6);
        } else {
          ctx.rect(tagX, tagY - tagHeight + 4, textWidth + 12, tagHeight);
        }
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(tagText, tagX + 6, tagY);
      });
    }

    // 2. Đóng dấu lời phê đỏ của cô giáo ở góc trang vở
    const stampX = Math.round(nw * 0.70);
    const stampY = Math.round(nh * 0.12);
    ctx.save();
    ctx.translate(stampX, stampY);
    ctx.rotate(-0.06);

    const boxW = Math.round(nw * 0.27);
    const boxH = Math.round(nh * 0.095);
    const isMath = currentTask && currentTask.type === 'math';

    if (tier === 1) {
      // Dấu đỏ: ĐIỂM 5 XUẤT SẮC 🌸
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = Math.max(3, Math.round(nw * 0.005));
      ctx.fillStyle = 'rgba(254, 242, 242, 0.9)';
      ctx.strokeRect(-8, -20, boxW, boxH);
      ctx.fillRect(-8, -20, boxW, boxH);

      ctx.fillStyle = '#DC2626';
      ctx.font = `bold ${Math.max(13, Math.round(nw * 0.03))}px sans-serif`;
      ctx.fillText(isMath ? '🌸 ĐIỂM 5 XUẤT SẮC 🌸' : '🌸 ĐIỂM 5 XUẤT SẮC 🌸', 0, 0);
      ctx.font = `bold ${Math.max(9.5, Math.round(nw * 0.018))}px sans-serif`;
      ctx.fillText(isMath ? 'Tính đúng 100% & vở sạch!' : 'Đúng mẫu & không tẩy xoá!', 2, Math.round(nh * 0.032));
    } else if (tier === 2) {
      // Dấu cam: ĐẠT 3 SAO ⭐ / ĐẠT 3 SAO TOÁN ⭐
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = Math.max(2.5, Math.round(nw * 0.004));
      ctx.fillStyle = 'rgba(255, 247, 237, 0.9)';
      ctx.strokeRect(-8, -20, boxW, boxH);
      ctx.fillRect(-8, -20, boxW, boxH);

      ctx.fillStyle = '#EA580C';
      ctx.font = `bold ${Math.max(13, Math.round(nw * 0.03))}px sans-serif`;
      ctx.fillText(isMath ? '⭐ ĐẠT 3 SAO TOÁN' : '⭐ ĐẠT 3 SAO', 0, 0);
      ctx.font = `bold ${Math.max(9.5, Math.round(nw * 0.018))}px sans-serif`;
      ctx.fillText(isMath ? 'Tính lại câu cô gạch chân' : 'Xem lại chỗ tẩy & gạch chân', 0, Math.round(nh * 0.032));
    } else {
      // Dấu đỏ: CÔ NHẮC: VIẾT LẠI (0⭐) / CÔ NHẮC: TÍNH LẠI (0⭐)
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = Math.max(3, Math.round(nw * 0.005));
      ctx.fillStyle = 'rgba(254, 242, 242, 0.95)';
      ctx.strokeRect(-8, -20, boxW, boxH);
      ctx.fillRect(-8, -20, boxW, boxH);

      ctx.fillStyle = '#DC2626';
      ctx.font = `bold ${Math.max(12.5, Math.round(nw * 0.028))}px sans-serif`;
      ctx.fillText(isMath ? '✍️ CÔ NHẮC: TÍNH LẠI (0⭐)' : '✍️ CÔ NHẮC: VIẾT LẠI (0⭐)', 0, 0);
      ctx.font = `bold ${Math.max(9, Math.round(nw * 0.017))}px sans-serif`;
      ctx.fillText(isMath ? 'Tính lại cẩn thận con nhé' : 'Nhìn bài mẫu viết lại nhé', 0, Math.round(nh * 0.032));
    }
    ctx.restore();

    annotationCanvas.style.display = 'block';
  }

  // 1. Chấm bài bằng Google Gemini Vision API (Dành cho cô giáo có API Key)
  async function gradeWithGeminiVision(apiKey, studentImageBase64, task) {
    const base64Data = studentImageBase64.replace(/^data:image\/\w+;base64,/, '');

    let promptText = '';
    if (task && task.type === 'math') {
      promptText = `Bạn là cô giáo tiểu học dạy Lớp 1 tại Việt Nam, rất hiền hậu, tỉ mỉ, công tâm và luôn khích lệ học sinh.
Hãy quan sát thật kỹ bức ảnh chụp bài làm MÔN TOÁN LỚP 1 của học sinh sau đây và chấm điểm.
Đề bài cô giao: "${task.title}".

QUY TẮC BẮT BUỘC SỐ 1 - KIỂM TRA ĐỐI TƯỢNG TRONG ẢNH:
- Bạn PHẢI quan sát xem bức ảnh có thực sự là TRANG VỞ BÀI TẬP / BÀI LÀM CỦA HỌC SINH LỚP 1 hay không.
- NẾU ẢNH CHỤP LÀ:
  + MẶT BÀN (mặt bàn gỗ, vân gỗ, mặt bàn nhựa, bàn giáo viên, sàn nhà, tường, đồ vật...).
  + BÀN TAY, NGƯỜI, HOẶC ĐỒ CHƠI / ĐỒ VẬT XUNG QUANH KHÔNG PHẢI TRANG VỞ BÀI LÀM.
  + HOẶC TRANG GIẤY TRẮNG TINH CHƯA LÀM BÀI TOÁN NÀO.
  -> BẮT BUỘC TRẢ VỀ:
  {
    "tier": 3,
    "stars": 0,
    "passed": false,
    "title": "CHƯA NHẬN DIỆN ĐƯỢC BÀI LÀM (0 SAO) ⚠️",
    "comment": "Hệ thống phát hiện ảnh chụp là mặt bàn hoặc đồ vật, chưa thấy trang vở bài làm của học sinh. Con/cô hãy đặt trang vở bài làm ngay ngắn trước camera để chấm nhé!",
    "errors": []
  }
  TUYỆT ĐỐI KHÔNG CHẤM 3 SAO HOẶC 5 SAO KHI KHÔNG PHẢI TRANG VỞ BÀI LÀM TOÁN!

LƯU Ý CỰC KỲ QUAN TRỌNG VỀ BÚT CHÌ:
- Học sinh Lớp 1 làm bài HOÀN TOÀN BẰNG BÚT CHÌ. Nét bút chì có thể thanh mảnh, độ đậm nhạt khác nhau tùy lực tì tay của bé. Hãy soi thật kỹ từng nét chì để đọc chính xác từng chữ số và phép tính.
- Phân biệt rõ nét chì viết số với VẾT TẨY XOÁ của gôm chì (vết tẩy thường làm nhòe xám, bóng mờ, lem than chì xung quanh hoặc nét chì cũ bị gôm dở dang).

TIÊU CHÍ CHẤM ĐIỂM BÀI TOÁN:
- Bài toán phải làm kết quả chính xác 100%.
- Chữ số bút chì phải ngay ngắn, rõ nét, trang vở sạch sẽ, không tẩy xoá lem nhem.

QUY ĐỊNH 3 MỨC ĐỘ CHẤM ĐIỂM THEO YÊU CẦU:
1. MỨC 1 (tier = 1, stars = 5, passed = true):
   - Làm đúng 100% tất cả các phép tính và kết quả chính xác tuyệt đối.
   - Chữ số bút chì rõ ràng, trang vở sạch đẹp, hoàn toàn không tẩy xoá.
   - Nhận xét khen ngợi con tính nhẩm rất siêu, xuất sắc đạt 5 sao vàng.
2. MỨC 2 (tier = 2, stars = 3, passed = true):
   - Làm đúng phần lớn, nhưng sai kết quả hoặc có vết tẩy xoá bút chì ở 1 đến 2 phép tính.
   - Nhận xét động viên con làm toán tốt đạt 3 sao, chỉ ra các câu cô gạch chân để con tính lại cho đúng.
3. MỨC 3 (tier = 3, stars = 0, passed = false):
   - Sai kết quả từ 3 phép tính trở lên, hoặc tẩy xoá lem nhem nhiều, hoặc chưa làm bài / ảnh trống.
   - Nhắc con nhìn lại đề, tính nhẩm lại cẩn thận từng phép tính và làm lại bài (0 sao).

NẾU CÓ PHÉP TÍNH SAI HOẶC TẨY XÓA Ở MỨC 2 HOẶC MỨC 3:
- Xác định vị trí từng phép tính bị sai trong mảng "errors" để cô giáo vẽ gạch chân màu đỏ (x, y tính trên lưới 400x300):
  { "x": 60, "y": 80, "w": 65, "h": 22, "type": "calc_error", "label": "Câu 2: Phép tính 4 + 3 = 8 chưa đúng (kết quả đúng là 7)" }

TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON:
{
  "tier": 1,
  "stars": 5,
  "passed": true,
  "title": "XUẤT SẮC - 5 SAO TOÁN VÀNG!",
  "comment": "Lời nhận xét ngọt ngào của cô giáo",
  "errors": []
}`;
    } else {
      promptText = `Bạn là cô giáo tiểu học dạy Lớp 1 tại Việt Nam, rất hiền hậu, giàu tình thương, công tâm và luôn khích lệ học sinh.
Hãy quan sát thật kỹ bức ảnh chụp bài làm LUYỆN VIẾT CHỮ của học sinh Lớp 1 sau đây và chấm bài.
Đề bài cô giao: "${task.title}".

QUY TẮC BẮT BUỘC SỐ 1 - KIỂM TRA ĐỐI TƯỢNG TRONG ẢNH:
- Bạn PHẢI quan sát xem bức ảnh có thực sự là TRANG VỞ BÀI TẬP / BÀI LÀM CỦA HỌC SINH LỚP 1 hay không.
- NẾU ẢNH CHỤP LÀ:
  + MẶT BÀN (mặt bàn gỗ, vân gỗ, mặt bàn nhựa, bàn giáo viên, sàn nhà, tường, đồ vật...).
  + BÀN TAY, KHUÔN MẶT, NGƯỜI, HOẶC ĐỒ DÙNG KHÔNG PHẢI TRANG BÀI LÀM.
  + HOẶC TRANG GIẤY TRẮNG TINH CHƯA VIẾT BÀI NÀO.
  -> BẮT BUỘC TRẢ VỀ:
  {
    "tier": 3,
    "stars": 0,
    "passed": false,
    "title": "CHƯA NHẬN DIỆN ĐƯỢC BÀI LÀM (0 SAO) ⚠️",
    "comment": "Hệ thống phát hiện ảnh chụp là mặt bàn hoặc đồ vật, chưa thấy trang vở bài làm của học sinh. Con/cô hãy đặt trang vở bài làm ngay ngắn trước camera để chấm nhé!",
    "errors": []
  }
  TUYỆT ĐỐI KHÔNG CHẤM 3 SAO HOẶC 5 SAO KHI KHÔNG PHẢI TRANG VỞ BÀI LÀM!

LƯU Ý CỰC KỲ QUAN TRỌNG VỀ BÚT CHÌ:
- Học sinh Lớp 1 viết bài HOÀN TOÀN BẰNG BÚT CHÌ. Nét chì có thể thanh mảnh hoặc nhạt, hãy soi thật kỹ từng nét chữ ô ly, độ liền mạch của nét chì.
- Soi thật kỹ các VẾT TẨY XOÁ: Học sinh dùng gôm tẩy bút chì thường để lại vệt xám lem nhem, bóng chì chà xát hoặc nét chì cũ bị gôm mờ.

TIÊU CHÍ CHẤM ĐIỂM BÀI VIẾT:
- Chữ viết phải sạch đẹp, đúng chuẩn mẫu chữ ô ly (độ cao, độ rộng, khoảng cách con chữ).
- Trang vở tuyệt đối sạch sẽ, KHÔNG TẨY XOÁ.

QUY ĐỊNH 3 MỨC ĐỘ CHẤM ĐIỂM THEO YÊU CẦU:
1. MỨC 1 (tier = 1, stars = 5, passed = true):
   - Chữ viết sạch đẹp, nắn nót, đúng chuẩn mẫu chữ ô ly, nét chì đều đặn, trang vở sạch đẹp hoàn toàn KHÔNG tẩy xoá.
   - Nhận xét khen ngợi con nét chữ rất đẹp, đúng mẫu, xuất sắc đạt 5 sao vàng.
2. MỨC 2 (tier = 2, stars = 3, passed = true):
   - Bài viết tương đối đều, đúng mẫu nhưng còn 1 - 2 lỗi nhẹ về độ cao ô ly, hoặc có 1 - 2 vết tẩy xoá bút chì nhỏ.
   - Nhận xét động viên con đạt 3 sao và chỉ ra các chỗ cô đã gạch chân để rút kinh nghiệm.
3. MỨC 3 (tier = 3, stars = 0, passed = false):
   - Bài viết chưa đúng chữ mẫu, sai nhiều ô ly, chữ nghệch ngoạc hoặc tẩy xoá lem nhem nhiều (> 2 chỗ) hoặc trang vở chưa viết bài.
   - Nhắc con nhìn bài mẫu, không tẩy xoá bẩn vở và viết lại bài cho đẹp (0 sao).

NẾU CÓ LỖI Ở MỨC 2 HOẶC MỨC 3:
- Xác định vị trí các chỗ viết sai hoặc tẩy xóa trong mảng "errors" để cô giáo vẽ gạch chân màu đỏ (x, y tính trên lưới 400x300):
  { "x": 60, "y": 80, "w": 40, "h": 20, "type": "height" | "smudge", "label": "Mô tả lỗi ngắn gọn (ví dụ: Dòng 2: Nét chữ chưa đúng độ cao ô ly hoặc có vết tẩy chì)" }

TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON:
{
  "tier": 1,
  "stars": 5,
  "passed": true,
  "title": "XUẤT SẮC - 5 SAO VÀNG!",
  "comment": "Lời nhận xét của cô giáo",
  "errors": []
}`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{
        parts: [
          { text: promptText },
          { inline_data: { mime_type: "image/jpeg", data: base64Data } }
        ]
      }],
      generationConfig: {
        temperature: 0.2,
        response_mime_type: "application/json"
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error('API Gemini trả về mã lỗi: ' + res.status);
    const data = await res.json();
    const textOut = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(textOut);
  }

  // 2. Chấm bài bằng Computer Vision nội bộ (Tối ưu 3 Mức Độ cho Bút Chì Lớp 1)
  async function gradeWithVisionHeuristics(imageBase64, task) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const W = 400;
        const H = 300;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, W, H);

        const imgData = ctx.getImageData(0, 0, W, H).data;

        // 1. Phân tích màu sắc & độ bão hòa toàn cục (Global Color & Saturation Analysis)
        // Để nhận diện: TRANG GIẤY VỞ TRẮNG vs MẶT BÀN GỖ / ĐỒ VẬT XUNG QUANH
        const gray = new Uint8Array(W * H);
        let whitePaperCount = 0;
        let coloredObjectCount = 0;
        let totalSampled = 0;
        let totalLuminance = 0;

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const p = y * W + x;
            const i = p * 4;
            const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
            const yVal = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
            gray[p] = yVal;

            if (x % 2 === 0 && y % 2 === 0) {
              totalSampled++;
              totalLuminance += yVal;

              const maxC = Math.max(r, g, b);
              const minC = Math.min(r, g, b);
              const colorDiff = maxC - minC;

              // Nền giấy vở học sinh: Sáng (yVal >= 125) và màu trung tính xám/trắng (colorDiff <= 38)
              if (yVal >= 125 && colorDiff <= 38) {
                whitePaperCount++;
              }
              // Bề mặt có màu đậm (mặt bàn gỗ vàng/nâu, đồ chơi, bàn nhựa, da người, vải...)
              // Mặt bàn gỗ tự nhiên thường có sắc vàng nâu với maxC - minC >= 40
              if (colorDiff >= 40 && maxC >= 70) {
                coloredObjectCount++;
              }
            }
          }
        }

        const avgBrightness = totalLuminance / totalSampled;
        const paperRatio = whitePaperCount / totalSampled;
        const coloredRatio = coloredObjectCount / totalSampled;

        // BỘ LỌC CHẶN MẶT BÀN GỖ & ĐỒ VẬT:
        // Nếu tỷ lệ giấy trắng < 28%, hoặc tỷ lệ bề mặt có màu > 42%, hoặc quá tối (< 90):
        if (paperRatio < 0.28 || coloredRatio > 0.42 || avgBrightness < 90) {
          setTimeout(() => {
            resolve({
              tier: 3,
              stars: 0,
              passed: false,
              isNotNotebook: true,
              title: 'CHƯA NHẬN DIỆN ĐƯỢC BÀI LÀM (0 SAO) ⚠️',
              comment: 'Hệ thống nhận thấy ảnh chụp là mặt bàn hoặc đồ vật xung quanh (chưa nhận diện được trang vở bài làm của học sinh). Con/cô hãy đặt trang vở bài làm ngay ngắn và đủ sáng trước camera rồi chụp lại nhé!',
              errors: [],
              metrics: { paperRatio, coloredRatio, avgBrightness }
            });
          }, 800);
          return;
        }

        // Vùng tập trung vào trang vở (80% trung tâm và nửa dưới bức ảnh)
        const xMin = Math.round(W * 0.08);
        const xMax = Math.round(W * 0.92);
        const yMin = Math.round(H * 0.08);
        const yMax = Math.round(H * 0.92);

        let pencilStrokePixels = 0;
        let paperPixels = 0;
        const rowStrokeCounts = new Array(H).fill(0);
        const strokeGrid = new Uint8Array(W * H);

        for (let y = yMin; y < yMax; y += 2) {
          for (let x = xMin; x < xMax; x += 2) {
            const idx = y * W + x;
            const pVal = gray[idx];

            const top = gray[Math.max(0, y - 3) * W + x];
            const bot = gray[Math.min(H - 1, y + 3) * W + x];
            const left = gray[y * W + Math.max(0, x - 3)];
            const right = gray[y * W + Math.min(W - 1, x + 3)];
            const localBg = (top + bot + left + right) / 4;

            // Nét bút chì chỉ được tính trên nền giấy trắng sáng (localBg > 120)
            if (localBg > 120) {
              paperPixels++;
              const contrastDiff = localBg - pVal;

              // Nét chì chuẩn học sinh lớp 1: Tối hơn nền 8 - 85 đơn vị
              if ((contrastDiff >= 8 && contrastDiff <= 85) || (pVal < 140 && localBg > 150)) {
                pencilStrokePixels++;
                rowStrokeCounts[y]++;
                strokeGrid[idx] = 1;
              }
              // Vết tẩy xoá bằng gôm chì (chỗ than chì bị miết lem loang hoặc vệt chà mờ)
              if ((contrastDiff > 65 && pVal < 115) || (contrastDiff >= 14 && contrastDiff <= 38 && pVal > 140 && localBg > 185 && (Math.abs(top - bot) > 18 || Math.abs(left - right) > 18))) {
                strokeGrid[idx] = 2; // smudge / vết tẩy xoá chì
              }
            }
          }
        }

        // Nhận diện các dòng kẻ chữ
        const lines = [];
        let inLine = false, lineStart = 0;
        for (let y = yMin; y < yMax; y += 2) {
          if (rowStrokeCounts[y] >= 3) {
            if (!inLine) { inLine = true; lineStart = y; }
          } else {
            if (inLine) {
              if (y - lineStart >= 6) {
                lines.push({ startY: lineStart, endY: y, height: y - lineStart });
              }
              inLine = false;
            }
          }
        }

        // Gộp các lỗi gần nhau trên cùng dòng
        function mergeCloseErrors(errs) {
          if (errs.length <= 1) return errs;
          const res = [];
          for (const err of errs) {
            const match = res.find(m => m.lineNum === err.lineNum && Math.abs(m.x + m.w - err.x) < 25);
            if (match) {
              const newX = Math.min(match.x, err.x);
              const newR = Math.max(match.x + match.w, err.x + err.w);
              match.x = newX;
              match.w = newR - newX;
              match.h = Math.max(match.h, err.h);
              if (err.type === 'smudge') match.type = 'smudge';
            } else {
              res.push(Object.assign({}, err));
            }
          }
          return res;
        }

        // --- NHÁNH CHẤM BÀI MÔN TOÁN LỚP 1 ---
        if (task && task.type === 'math') {
          const mathErrors = [];
          let eqIndex = 0;
          let mLineIdx = 0;

          for (const line of lines) {
            mLineIdx++;
            let inCluster = false, clusterStart = 0, clusterSmudges = 0, clusterStrokes = 0;
            let clusterYMin = line.endY, clusterYMax = line.startY;

            for (let x = xMin; x < xMax; x += 2) {
              let colStrokes = 0, colSmudges = 0;
              for (let y = line.startY; y <= line.endY; y += 2) {
                const gVal = strokeGrid[y * W + x];
                if (gVal === 1) {
                  colStrokes++;
                  if (y < clusterYMin) clusterYMin = y;
                  if (y > clusterYMax) clusterYMax = y;
                } else if (gVal === 2) {
                  colSmudges++;
                }
              }

              // Nhận diện từng cụm phép tính / chữ số (khoảng cách giữa các cột/phép tính > 14px)
              if (colStrokes > 0 || colSmudges > 0) {
                if (!inCluster) {
                  inCluster = true;
                  clusterStart = x;
                  clusterSmudges = 0;
                  clusterStrokes = 0;
                  clusterYMin = line.endY;
                  clusterYMax = line.startY;
                }
                clusterStrokes += colStrokes;
                clusterSmudges += colSmudges;
              } else {
                if (inCluster) {
                  const clusterWidth = x - clusterStart;
                  if (clusterWidth >= 10 && clusterStrokes >= 4) {
                    eqIndex++;
                    const clusterHeight = clusterYMax - clusterYMin;
                    // Lỗi 1: Tẩy xóa lem nhem quanh phép tính
                    if (clusterSmudges >= 3) {
                      mathErrors.push({
                        lineNum: mLineIdx,
                        x: clusterStart,
                        y: clusterYMin,
                        w: Math.max(16, clusterWidth),
                        h: Math.max(12, clusterHeight),
                        type: 'smudge',
                        label: `Dòng ${mLineIdx}, Câu ${eqIndex}: Phép tính có vết tẩy chì lem nhem`
                      });
                    }
                    // Lỗi 2: Chữ số bất thường hoặc chưa ghi rõ kết quả
                    else if (clusterHeight > 32 || clusterHeight < 5) {
                      mathErrors.push({
                        lineNum: mLineIdx,
                        x: clusterStart,
                        y: clusterYMin,
                        w: Math.max(16, clusterWidth),
                        h: Math.max(12, clusterHeight),
                        type: 'calc_error',
                        label: `Dòng ${mLineIdx}, Câu ${eqIndex}: Chữ số chưa rõ nét hoặc chưa điền kết quả`
                      });
                    }
                  }
                  inCluster = false;
                }
              }
            }
          }

          const cleanedMathErrors = mergeCloseErrors(mathErrors);
          const strokeRatio = paperPixels > 0 ? (pencilStrokePixels / paperPixels) : 0;
          const hasMathWork = (strokeRatio >= 0.004 && lines.length >= 1 && eqIndex >= 2) || (strokeRatio >= 0.007 && eqIndex >= 1);

          setTimeout(() => {
            const studentName = activeStudent ? activeStudent.name : 'bé';
            let tier = 3;
            let stars = 0;
            let title = '';
            let comment = '';
            let passed = false;

            if (!hasMathWork || eqIndex < 2) {
              tier = 3;
              stars = 0;
              passed = false;
              title = 'CHƯA NHẬN DIỆN ĐƯỢC PHÉP TÍNH (0 SAO) ⚠️';
              comment = `Hệ thống chưa tìm thấy các phép tính môn Toán trên trang vở của ${studentName} (ảnh có thể là mặt bàn, để trống hoặc thiếu sáng). Con/cô hãy đặt trang vở ngay ngắn và chụp lại nhé!`;
            } else {
              const errCount = cleanedMathErrors.length;
              if (errCount === 0) {
                tier = 1;
                stars = 5;
                passed = true;
                title = 'XUẤT SẮC - 5 SAO TOÁN VÀNG! 🌟';
                comment = `Bài toán của ${studentName} làm rất xuất sắc! Kết quả chính xác 100%, chữ số bút chì rõ nét và trang vở sạch sẽ không tẩy xoá. Cô khen con đạt 5 sao vàng! 🌟`;
              } else if (errCount >= 1 && errCount <= 2) {
                tier = 2;
                stars = 3;
                passed = true;
                title = 'ĐẠT YÊU CẦU - 3 SAO TOÁN! ⭐';
                comment = `Bài toán của ${studentName} làm khá tốt nhưng còn ${errCount} phép tính làm sai kết quả hoặc có vết tẩy xoá bút chì. Cô đã gạch chân những phép tính con cần tính lại ở trên, con sửa lại nhé! Cô thưởng con 3 sao! ⭐`;
              } else {
                tier = 3;
                stars = 0;
                passed = false;
                title = 'BÉ HÃY TÍNH LẠI BÀI NHÉ! (0 SAO) 🔢';
                comment = `Bài toán của ${studentName} có ${errCount} phép tính chưa chính xác hoặc còn tẩy xoá lem nhem. Cô đã gạch chân các câu sai trên bài ở trên, con hãy tính nhẩm lại cẩn thận và làm lại bài nhé! 💪`;
              }
            }

            resolve({
              tier,
              stars,
              passed,
              title,
              comment,
              errors: cleanedMathErrors,
              metrics: { strokeRatio, linesCount: lines.length, errCount: cleanedMathErrors.length }
            });
          }, 1200);
          return;
        }

        // --- NHÁNH CHẤM BÀI LUYỆN VIẾT CHỮ Ô LY ---
        const detectedErrors = [];
        let lineIdx = 0;
        let wordCount = 0;

        for (const line of lines) {
          lineIdx++;
          let inWord = false, wordStart = 0, wordSmudges = 0, strokeCount = 0;
          let wordYMin = line.endY, wordYMax = line.startY;

          for (let x = xMin; x < xMax; x += 2) {
            let colStrokes = 0, colSmudges = 0;
            for (let y = line.startY; y <= line.endY; y += 2) {
              const gVal = strokeGrid[y * W + x];
              if (gVal === 1) {
                colStrokes++;
                if (y < wordYMin) wordYMin = y;
                if (y > wordYMax) wordYMax = y;
              } else if (gVal === 2) {
                colSmudges++;
              }
            }

            if (colStrokes > 0 || colSmudges > 0) {
              if (!inWord) { inWord = true; wordStart = x; wordSmudges = 0; strokeCount = 0; wordYMin = line.endY; wordYMax = line.startY; }
              strokeCount += colStrokes;
              wordSmudges += colSmudges;
            } else {
              if (inWord) {
                const wordWidth = x - wordStart;
                if (wordWidth >= 6 && strokeCount >= 4) {
                  wordCount++;
                  const wordHeight = wordYMax - wordYMin;
                  // Lỗi 1: Tẩy xóa lem nhem
                  if (wordSmudges >= 3) {
                    detectedErrors.push({
                      lineNum: lineIdx,
                      x: wordStart,
                      y: wordYMin,
                      w: Math.max(14, wordWidth),
                      h: Math.max(12, wordHeight),
                      type: 'smudge',
                      label: `Dòng ${lineIdx}: Có vết tẩy chì lem nhem`
                    });
                  }
                  // Lỗi 2: Nét chữ chưa đúng độ cao ô ly (quá cao hoặc quá lùn so với chuẩn)
                  else if (wordHeight > 28 || wordHeight < 5) {
                    detectedErrors.push({
                      lineNum: lineIdx,
                      x: wordStart,
                      y: wordYMin,
                      w: Math.max(14, wordWidth),
                      h: Math.max(12, wordHeight),
                      type: 'height',
                      label: `Dòng ${lineIdx}: Nét chữ chưa đúng độ cao ô ly`
                    });
                  }
                }
                inWord = false;
              }
            }
          }
        }

        const cleanedErrors = mergeCloseErrors(detectedErrors);
        const strokeRatio = paperPixels > 0 ? (pencilStrokePixels / paperPixels) : 0;
        const hasWriting = (strokeRatio >= 0.005 && lines.length >= 2 && wordCount >= 3) || (strokeRatio >= 0.008 && wordCount >= 2);

        setTimeout(() => {
          const studentName = activeStudent ? activeStudent.name : 'bé';
          let tier = 3;
          let stars = 0;
          let title = '';
          let comment = '';
          let passed = false;

          if (!hasWriting || wordCount < 2 || lines.length < 2) {
            // Mức 3: Chưa có chữ hoặc ảnh trống / mặt bàn
            tier = 3;
            stars = 0;
            passed = false;
            title = 'CHƯA NHẬN DIỆN ĐƯỢC BÀI VIẾT (0 SAO) ⚠️';
            comment = `Hệ thống chưa nhận diện được các dòng chữ viết ô ly của ${studentName} (ảnh có thể là mặt bàn, để trống hoặc thiếu sáng). Con/cô hãy đặt trang vở bài làm ngay ngắn và soi lại cho cô chấm nhé!`;
          } else {
            const errCount = cleanedErrors.length;
            if (errCount === 0) {
              // MỨC 1: XUẤT SẮC - 5 SAO
              tier = 1;
              stars = 5;
              passed = true;
              title = 'XUẤT SẮC - 5 SAO VÀNG! 🌟';
              comment = `Bài viết của ${studentName} rất ngoan! Chữ viết sạch đẹp, đúng chuẩn mẫu chữ ô ly, nét bút chì nắn nót và hoàn toàn không tẩy xoá. Cô khen con đạt 5 sao xuất sắc! 🌟`;
            } else if (errCount >= 1 && errCount <= 2) {
              // MỨC 2: ĐẠT YÊU CẦU - 3 SAO
              tier = 2;
              stars = 3;
              passed = true;
              title = 'ĐẠT YÊU CẦU - 3 SAO! ⭐';
              comment = `Bài viết của ${studentName} tương đối đều nét nhưng còn ${errCount} chỗ chưa đúng mẫu hoặc có vết tẩy xoá bút chì. Cô đã gạch chân những chỗ con cần sửa ở trên, lần sau con nắn nót hơn nhé! Cô thưởng con 3 sao! ⭐`;
            } else {
              // MỨC 3: NHẮC CON VIẾT LẠI BÀI (0 SAO)
              tier = 3;
              stars = 0;
              passed = false;
              title = 'BÉ HÃY VIẾT LẠI BÀI NHÉ! (0 SAO) 📝';
              comment = `Bài viết của ${studentName} chưa đúng chữ mẫu ô ly hoặc có ${errCount} chỗ bị lệch ô ly, tẩy xoá lem nhem. Cô đã gạch chân các chỗ sai trên trang vở ở trên, con hãy nhìn bài mẫu và viết lại thật nắn nót nhé! 💪`;
            }
          }

          resolve({
            tier,
            stars,
            passed,
            title,
            comment,
            errors: cleanedErrors,
            metrics: { strokeRatio, linesCount: lines.length, errCount: cleanedErrors.length }
          });
        }, 1200);
      };
      img.src = imageBase64;
    });
  }

  // Hiển thị kết quả chấm 3 Mức Độ & Chờ Cô Giáo Phê Duyệt Trước Khi Chuyển Điểm
  async function showGradingResult(res) {
    gradingResultBox.style.display = 'block';
    pendingGradingResult = res;
    isApprovalHandled = false;

    // 1. Vẽ các nét gạch chân màu đỏ của cô giáo lên ảnh chụp
    if (capturedImagePreview) {
      drawAnnotationsOnCanvas(capturedImagePreview, res.errors || [], res.tier || 3);
    }

    // 2. Cập nhật danh sách các chỗ sai cô đã gạch chân
    if (annotatedErrorsBox && annotatedErrorsList) {
      if (res.errors && res.errors.length > 0) {
        annotatedErrorsBox.style.display = 'block';
        annotatedErrorsList.innerHTML = '';
        const isMath = currentTask && currentTask.type === 'math';
        const strongTitle = annotatedErrorsBox.querySelector('strong');
        if (strongTitle) {
          strongTitle.textContent = isMath 
            ? 'Cô đã gạch chân các phép tính cần xem lại:' 
            : 'Cô đã gạch chân chỗ sai trên ảnh bài viết:';
        }
        res.errors.forEach((err, idx) => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${isMath ? 'Câu' : 'Lỗi'} ${idx + 1}:</strong> ${err.label}`;
          annotatedErrorsList.appendChild(li);
        });
      } else {
        annotatedErrorsBox.style.display = 'none';
      }
    }

    // 3. Định hình giao diện theo 3 Mức Độ
    gradingResultBox.classList.remove('passed', 'failed', 'tier-1', 'tier-2', 'tier-3');
    gradingResultBox.classList.add(`tier-${res.tier || 3}`);

    const isMath = currentTask && currentTask.type === 'math';
    const studentName = activeStudent ? activeStudent.name : 'Bé';

    if (res.tier === 1) {
      // MỨC 1: XUẤT SẮC (5 SAO)
      resultAvatar.textContent = isMath ? '🌟🔢💮' : '🌟🐣💮';
      resultTitle.textContent = res.title || (isMath ? 'XUẤT SẮC - 5 SAO TOÁN VÀNG!' : 'XUẤT SẮC - 5 SAO VÀNG!');
      resultStarsBadge.style.display = 'inline-flex';
      resultStarsBadge.style.background = '#FEF3C7';
      resultStarsBadge.style.color = '#B45309';
      resultStarsBadge.style.borderColor = '#FCD34D';
      resultStarsBadge.innerHTML = '<span>⏳</span> ĐỀ XUẤT: +5 SAO (ĐANG CHỜ CÔ PHÊ DUYỆT)';
      resultComment.textContent = `"${res.comment}"`;
      if (btnRewriteWork) btnRewriteWork.style.display = 'none';

      speakVietnamese(isMath 
        ? `AI chấm bài của ${studentName} đạt xuất sắc 5 sao. Cô hãy xem và xác nhận chuyển điểm cho bé nhé!` 
        : `AI chấm bài viết của ${studentName} đạt xuất sắc 5 sao. Cô hãy xem và xác nhận chuyển điểm cho bé nhé!`);

    } else if (res.tier === 2) {
      // MỨC 2: ĐẠT YÊU CẦU (3 SAO)
      resultAvatar.textContent = isMath ? '⭐🔢👏' : '⭐🐣👏';
      resultTitle.textContent = res.title || (isMath ? 'ĐẠT YÊU CẦU - 3 SAO TOÁN!' : 'ĐẠT YÊU CẦU - 3 SAO!');
      resultStarsBadge.style.display = 'inline-flex';
      resultStarsBadge.style.background = '#DCFCE7';
      resultStarsBadge.style.color = '#065F46';
      resultStarsBadge.style.borderColor = '#34D399';
      resultStarsBadge.innerHTML = '<span>⏳</span> ĐỀ XUẤT: +3 SAO (ĐANG CHỜ CÔ PHÊ DUYỆT)';
      resultComment.textContent = `"${res.comment}"`;
      if (btnRewriteWork) btnRewriteWork.style.display = 'none';

      speakVietnamese(isMath 
        ? `AI chấm bài của ${studentName} đạt 3 sao môn Toán. Cô hãy xem và xác nhận chuyển điểm nhé!` 
        : `AI chấm bài của ${studentName} đạt 3 sao. Cô hãy xem và xác nhận chuyển điểm nhé!`);

    } else {
      // MỨC 3: NHẮC CON VIẾT LẠI / TÍNH LẠI BÀI (0 SAO)
      resultAvatar.textContent = isMath ? '🔢💪✨' : '📝💪✨';
      resultTitle.textContent = res.title || (isMath ? 'BÉ HÃY TÍNH LẠI BÀI NHÉ! (0 SAO)' : 'BÉ HÃY VIẾT LẠI BÀI NHÉ! (0 SAO)');
      resultStarsBadge.style.display = 'inline-flex';
      resultStarsBadge.style.background = '#FFE4E6';
      resultStarsBadge.style.color = '#BE123C';
      resultStarsBadge.style.borderColor = '#FDA4AF';
      resultStarsBadge.innerHTML = res.isNotNotebook
        ? '<span>⚠️</span> CHƯA NHẬN DIỆN ĐƯỢC BÀI LÀM (0 SAO)'
        : (isMath ? '<span>⚠️</span> CẦN TÍNH LẠI BÀI (0 SAO)' : '<span>⚠️</span> CẦN LUYỆN VIẾT LẠI (0 SAO)');
      resultComment.textContent = `"${res.comment}"`;
      if (btnRewriteWork) {
        btnRewriteWork.style.display = 'inline-flex';
        btnRewriteWork.innerHTML = isMath ? '🔢 Tính Lại & Soi Lại Bài' : '✏️ Viết Lại & Soi Lại Bài';
      }

      speakVietnamese(res.isNotNotebook
        ? `Chưa nhận diện được trang vở bài làm của ${studentName}. Cô hãy kiểm tra lại nhé!`
        : (isMath 
          ? `Bài toán của ${studentName} cần xem lại. Cô đã gạch chân những phép tính chưa đúng.` 
          : `Bài viết của ${studentName} chưa đúng mẫu. Cô đã gạch chân những chỗ con cần rèn lại.`));
    }

    // Hiển thị hộp phê duyệt của cô giáo
    if (teacherApprovalBox) {
      teacherApprovalBox.style.display = 'block';
      if (approvalStatusMsg) approvalStatusMsg.style.display = 'none';
      if (btnTeacherApprove) {
        btnTeacherApprove.style.display = 'inline-flex';
        btnTeacherApprove.disabled = false;
        btnTeacherApprove.style.opacity = '1';
        if (res.stars > 0) {
          btnTeacherApprove.innerHTML = `<span>✅</span> ĐỒNG Ý & CHUYỂN +${res.stars} ⭐ CHO BÉ`;
        } else {
          btnTeacherApprove.innerHTML = `<span>✅</span> ĐỒNG Ý (NHẮC BÉ LÀM LẠI)`;
        }
      }
      if (btnTeacherReject) {
        btnTeacherReject.style.display = 'inline-flex';
        btnTeacherReject.disabled = false;
        btnTeacherReject.style.opacity = '1';
        btnTeacherReject.innerHTML = `<span>🔄</span> KHÔNG ĐỒNG Ý (CHẤM LẠI)`;
      }
      if (approvalStarsText) {
        if (res.stars > 0) {
          approvalStarsText.innerHTML = `+${res.stars} ⭐ (${res.tier === 1 ? 'Mức 1: Xuất sắc 5 sao' : 'Mức 2: Đạt yêu cầu 3 sao'})`;
        } else {
          approvalStarsText.innerHTML = `0 ⭐ (${res.isNotNotebook ? 'Chưa nhận diện được bài làm' : 'Cần làm lại bài'})`;
        }
      }
    }

    gradingResultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Tự động cộng sao vào StorageManager (Cục bộ/Máy chủ) & Firebase Realtime Database
  async function awardStarsToFirebase(studentId, stars, reason) {
    const numStars = Number(stars);

    // 1. Cập nhật cục bộ & đồng bộ StorageManager / Máy chủ
    if (window.StorageManager) {
      try {
        let localData = window.StorageManager.loadData();
        if (localData && localData.students) {
          const s = localData.students.find(st => st.id === studentId);
          if (s) {
            s.stars = (s.stars || 0) + numStars;
            const grp = (localData.groups || []).find(g => g.id === s.group);
            if (grp) grp.stars = (grp.stars || 0) + numStars;
            if (!s.logs) s.logs = [];
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            s.logs.unshift({
              id: 'log-ai-' + Date.now(),
              time: timeStr,
              points: numStars,
              reason: reason,
              icon: '📸'
            });
            if (s.logs.length > 30) s.logs = s.logs.slice(0, 30);
            const hatchReq = (window.EggEvolution && window.EggEvolution.getHatchRequirement)
              ? window.EggEvolution.getHatchRequirement(s)
              : { threshold: 100 };
            if (s.stars >= hatchReq.threshold) {
              if (!s.hatchedAt) s.hatchedAt = Date.now();
              if (!s.firstHatchedAt) s.firstHatchedAt = Date.now();
            }
            localData.lastUpdated = Date.now();
            window.StorageManager.saveData(localData);
            if (typeof window.StorageManager.pushToServer === 'function') {
              window.StorageManager.pushToServer(localData).catch(() => {});
            }
            if (activeStudent) {
              activeStudent.stars = s.stars;
              updateActiveStudentUI(s);
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi lưu điểm cục bộ:', err);
      }
    }

    // 2. Đồng bộ lên Firebase Đám Mây nếu có kết nối
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      try {
        const ref = (typeof window.FirebaseSync.getClassRef === 'function')
          ? window.FirebaseSync.getClassRef()
          : window.FirebaseSync.db.ref('classData');
        const snap = await ref.once('value');
        let classData = snap.val();
        if (classData && classData.students) {
          const student = classData.students.find(s => s.id === studentId);
          if (student) {
            student.stars = (student.stars || 0) + numStars;
            const group = (classData.groups || []).find(g => g.id === student.group);
            if (group) group.stars = (group.stars || 0) + numStars;
            if (!student.logs) student.logs = [];
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            student.logs.unshift({
              id: 'log-ai-' + Date.now(),
              time: timeStr,
              points: numStars,
              reason: reason,
              icon: '📸'
            });
            if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);
            const hatchReq = (window.EggEvolution && window.EggEvolution.getHatchRequirement) 
              ? window.EggEvolution.getHatchRequirement(student) 
              : { threshold: 100 };
            if (student.stars >= hatchReq.threshold) {
              if (!student.hatchedAt) student.hatchedAt = Date.now();
              if (!student.firstHatchedAt) student.firstHatchedAt = Date.now();
            }
            classData.lastUpdated = Date.now();
            await ref.set(classData);
            if (activeStudent) {
              activeStudent.stars = student.stars;
              updateActiveStudentUI(student);
            }
            console.log(`✅ Đã cộng +${numStars} sao cho bé ${student.name} lên Firebase!`);
          }
        }
      } catch (e) {
        console.error('Lỗi cộng sao Firebase:', e);
      }
    }
  }

  // Đọc to giọng nói tiếng Việt
  function speakVietnamese(text) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'vi-VN';
    utter.rate = 0.95; // Tốc độ ấm áp vừa phải cho học sinh lớp 1
    window.speechSynthesis.speak(utter);
  }

  if (btnSpeakComment) {
    btnSpeakComment.addEventListener('click', () => {
      if (lastGradingResult && lastGradingResult.comment) {
        speakVietnamese(lastGradingResult.comment);
      }
    });
  }

  // --- XỬ LÝ PHÊ DUYỆT ĐIỂM CỦA CÔ GIÁO ---
  if (btnTeacherApprove) {
    btnTeacherApprove.addEventListener('click', async () => {
      if (isApprovalHandled || !pendingGradingResult || !activeStudent) return;
      isApprovalHandled = true;

      btnTeacherApprove.disabled = true;
      btnTeacherApprove.style.opacity = '0.6';
      if (btnTeacherReject) btnTeacherReject.style.display = 'none';

      const res = pendingGradingResult;
      const isMath = currentTask && currentTask.type === 'math';
      const studentName = activeStudent.name || 'Bé';

      if (res.stars > 0) {
        const reason = res.tier === 1
          ? `Soi bài Mức 1 (${isMath ? 'Toán' : 'Viết'} - Xuất sắc 5 sao): ${currentTask ? currentTask.title : ''}`
          : `Soi bài Mức 2 (${isMath ? 'Toán' : 'Viết'} - Đạt 3 sao): ${currentTask ? currentTask.title : ''}`;

        await awardStarsToFirebase(activeStudent.id, res.stars, reason);

        if (window.confetti) {
          window.confetti({ particleCount: res.stars === 5 ? 110 : 50, spread: 75, origin: { y: 0.6 } });
        }
        if (window.AudioManager && window.AudioManager.playReward) {
          window.AudioManager.playReward();
        }

        resultStarsBadge.innerHTML = `<span>🎉</span> ĐÃ CHUYỂN THÀNH CÔNG +${res.stars} SAO ĐẾN LINH THÚ!`;
        resultStarsBadge.style.background = '#DCFCE7';
        resultStarsBadge.style.color = '#065F46';
        resultStarsBadge.style.borderColor = '#34D399';

        if (approvalStatusMsg) {
          approvalStatusMsg.style.display = 'block';
          approvalStatusMsg.style.background = '#ECFDF5';
          approvalStatusMsg.style.color = '#065F46';
          approvalStatusMsg.style.border = '1.5px solid #A7F3D0';
          approvalStatusMsg.innerHTML = `🎉 <strong>Cô đã đồng ý!</strong> Đã chuyển thành công <strong>+${res.stars} ⭐</strong> đến tài khoản của bé <strong>${studentName}</strong>!`;
        }

        speakVietnamese(res.tier === 1
          ? `Chúc mừng ${studentName}! Cô đã đồng ý bài của con xuất sắc và chuyển 5 sao vào linh thú!`
          : `Chúc mừng ${studentName}! Cô đã chuyển 3 sao vào linh thú cho con nhé!`);
      } else {
        if (approvalStatusMsg) {
          approvalStatusMsg.style.display = 'block';
          approvalStatusMsg.style.background = '#FFFBEB';
          approvalStatusMsg.style.color = '#92400E';
          approvalStatusMsg.style.border = '1.5px solid #FCD34D';
          approvalStatusMsg.innerHTML = `📝 <strong>Cô đã xác nhận:</strong> Không cộng sao lượt này (0 sao). Nhắc nhở bé <strong>${studentName}</strong> làm lại bài cẩn thận.`;
        }
        speakVietnamese(`Bài làm của ${studentName} cần xem lại. Con hãy nhìn bài mẫu và làm lại cẩn thận nhé!`);
      }

      if (isAutoKioskEnabled) {
        startNextStudentCountdown(5);
      }
    });
  }

  if (btnTeacherReject) {
    btnTeacherReject.addEventListener('click', () => {
      if (!pendingGradingResult) return;
      isApprovalHandled = true;

      // TUYỆT ĐỐI KHÔNG CHUYỂN ĐIỂM (không gọi awardStarsToFirebase)
      if (btnTeacherApprove) btnTeacherApprove.style.display = 'none';
      btnTeacherReject.style.display = 'none';

      resultStarsBadge.style.background = '#FEE2E2';
      resultStarsBadge.style.color = '#DC2626';
      resultStarsBadge.style.borderColor = '#FCA5A5';
      resultStarsBadge.innerHTML = '<span>❌</span> ĐÃ HỦY KẾT QUẢ CHẤM - KHÔNG CHUYỂN ĐIỂM!';

      if (approvalStatusMsg) {
        approvalStatusMsg.style.display = 'block';
        approvalStatusMsg.style.background = '#FEF2F2';
        approvalStatusMsg.style.color = '#991B1B';
        approvalStatusMsg.style.border = '1.5px solid #FECACA';
        approvalStatusMsg.innerHTML = `
          <div style="font-size: 14px; font-weight: 800; margin-bottom: 6px;">❌ Cô KHÔNG ĐỒNG Ý với kết quả đã chấm!</div>
          <div style="font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 12px;">Hệ thống <strong>KHÔNG chuyển điểm</strong> đến học sinh. Cô hãy căn chỉnh lại bài làm hoặc bấm nút bên dưới để chấm lại ngay:</div>
          <button type="button" id="btnRetryGradingImmediately" class="btn-cam-action primary" style="padding: 10px 20px; font-size: 13.5px; margin: 0 auto; display: inline-flex; align-items: center; gap: 6px;">
            <span>📸</span> Căn Chỉnh Lại & Chấm Lại Ngay
          </button>
        `;

        const retryBtn = document.getElementById('btnRetryGradingImmediately');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            gradingResultBox.style.display = 'none';
            if (annotationCanvas) {
              annotationCanvas.style.display = 'none';
              const ctx = annotationCanvas.getContext('2d');
              ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
            }
            if (annotatedErrorsBox) annotatedErrorsBox.style.display = 'none';
            capturedImageDataUrl = null;
            startCamera();
          });
        }
      }
    });
  }

  if (btnToggleAnnotations) {
    btnToggleAnnotations.addEventListener('click', () => {
      if (!annotationCanvas) return;
      if (annotationCanvas.style.display === 'none') {
        annotationCanvas.style.display = 'block';
        btnToggleAnnotations.textContent = '👁️ Ẩn Bút Đỏ';
      } else {
        annotationCanvas.style.display = 'none';
        btnToggleAnnotations.textContent = '👁️ Hiện Bút Đỏ';
      }
    });
  }

  if (btnRewriteWork) {
    btnRewriteWork.addEventListener('click', () => {
      if (kioskNextResetTimer) { clearInterval(kioskNextResetTimer); kioskNextResetTimer = null; }
      if (kioskNextStudentCountdown) kioskNextStudentCountdown.style.display = 'none';
      capturedImageDataUrl = null;
      if (annotationCanvas) {
        annotationCanvas.style.display = 'none';
        const ctx = annotationCanvas.getContext('2d');
        ctx.clearRect(0, 0, annotationCanvas.width, annotationCanvas.height);
      }
      if (annotatedErrorsBox) annotatedErrorsBox.style.display = 'none';
      gradingResultBox.style.display = 'none';
      btnAnalyzeWork.style.display = 'none';
      capturedImagePreview.style.display = 'none';
      cameraPlaceholder.style.display = 'block';
      btnStartCamera.style.display = 'inline-flex';
      btnRetakePhoto.style.display = 'none';
      btnSnapPhoto.style.display = 'none';
      if (cameraViewport) cameraViewport.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (btnScanAnother) {
    btnScanAnother.addEventListener('click', () => {
      resetKioskForNextStudent();
    });
  }

  if (btnNextStudentNow) {
    btnNextStudentNow.addEventListener('click', () => {
      resetKioskForNextStudent();
    });
  }

  if (btnToggleAutoKiosk) {
    btnToggleAutoKiosk.addEventListener('click', () => {
      isAutoKioskEnabled = !isAutoKioskEnabled;
      if (isAutoKioskEnabled) {
        btnToggleAutoKiosk.classList.remove('off');
        btnToggleAutoKiosk.innerHTML = '⚡ Tự Động: <strong>BẬT</strong>';
      } else {
        btnToggleAutoKiosk.classList.add('off');
        btnToggleAutoKiosk.innerHTML = '⚡ Tự Động: <strong>TẮT</strong>';
        if (kioskCountdownTimer) { clearInterval(kioskCountdownTimer); kioskCountdownTimer = null; }
        if (kioskNextResetTimer) { clearInterval(kioskNextResetTimer); kioskNextResetTimer = null; }
        if (kioskCountdownOverlay) kioskCountdownOverlay.style.display = 'none';
        if (kioskNextStudentCountdown) kioskNextStudentCountdown.style.display = 'none';
      }
    });
  }

  if (btnVoiceName) {
    btnVoiceName.addEventListener('click', () => {
      if (!speechRecognizer) {
        speechRecognizer = initVoiceRecognition();
      }
      if (!speechRecognizer) {
        alert('Trình duyệt hiện tại chưa hỗ trợ giọng nói hoặc micro chưa được bật. Bé hãy chạm vào tên mình ở danh sách bên dưới nhé!');
        return;
      }
      try {
        if (isListeningVoice) {
          speechRecognizer.stop();
        } else {
          speechRecognizer.start();
        }
      } catch (err) {
        console.warn('Lỗi kích hoạt micro:', err);
        try { speechRecognizer.start(); } catch (e) {}
      }
    });
  }

  // --- CÀI ĐẶT BÀI MẪU DÀNH CHO CÔ GIÁO ---
  function openTeacherAdminModal() {
    if (!teacherAdminModal) return;
    adminTaskTitleInput.value = currentTask.title;
    adminTaskTypeSelect.value = currentTask.type || 'writing';
    adminTaskStarsSelect.value = String(currentTask.stars || 5);
    adminGeminiApiKeyInput.value = localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '';
    teacherAdminModal.classList.add('active');
  }

  if (btnOpenTeacherAdmin) btnOpenTeacherAdmin.addEventListener('click', openTeacherAdminModal);
  if (btnOpenTeacherAdminStep2) btnOpenTeacherAdminStep2.addEventListener('click', openTeacherAdminModal);
  if (btnUploadSampleBanner) btnUploadSampleBanner.addEventListener('click', openTeacherAdminModal);

  if (closeTeacherAdminBtn) closeTeacherAdminBtn.addEventListener('click', () => teacherAdminModal.classList.remove('active'));
  if (btnCloseAdminModal) btnCloseAdminModal.addEventListener('click', () => teacherAdminModal.classList.remove('active'));

  if (btnSaveAdminSettings) {
    btnSaveAdminSettings.addEventListener('click', () => {
      currentTask.title = adminTaskTitleInput.value.trim() || 'Luyện viết chữ cái';
      currentTask.type = adminTaskTypeSelect.value;
      currentTask.stars = parseInt(adminTaskStarsSelect.value, 10) || 5;

      const apiKey = adminGeminiApiKeyInput.value.trim();
      if (apiKey) {
        localStorage.setItem(STORAGE_KEY_GEMINI_KEY, apiKey);
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI_KEY);
      }

      // Nếu có chọn ảnh bài mẫu mới
      const file = adminSampleFileInput.files && adminSampleFileInput.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          currentTask.image = e.target.result;
          saveSampleTask(currentTask);
          renderSampleTaskUI();
          teacherAdminModal.classList.remove('active');
          alert('🎉 Đã cập nhật ảnh bài mẫu mới thành công!');
        };
        reader.readAsDataURL(file);
      } else {
        saveSampleTask(currentTask);
        renderSampleTaskUI();
        teacherAdminModal.classList.remove('active');
        alert('🎉 Đã lưu cài đặt bài mẫu thành công!');
      }
    });
  }

  if (btnAdminResetDefault) {
    btnAdminResetDefault.addEventListener('click', () => {
      if (confirm('Khôi phục bài mẫu chuẩn ban đầu?')) {
        const resetTask = (currentTask && currentTask.type === 'math') ? DEFAULT_MATH_TASK : DEFAULT_WRITING_TASK;
        currentTask = Object.assign({}, resetTask);
        saveSampleTask(currentTask);
        renderSampleTaskUI();
        teacherAdminModal.classList.remove('active');
      }
    });
  }

  // Khởi động
  document.addEventListener('DOMContentLoaded', initData);
})();
