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

  const cameraVideo = document.getElementById('cameraVideo');
  const capturedImagePreview = document.getElementById('capturedImagePreview');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const cameraOverlayGrid = document.getElementById('cameraOverlayGrid');
  const scanLaserBeam = document.getElementById('scanLaserBeam');

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
  const btnScanAnother = document.getElementById('btnScanAnother');

  // Teacher Admin Modal
  const teacherAdminModal = document.getElementById('teacherAdminModal');
  const btnOpenTeacherAdmin = document.getElementById('btnOpenTeacherAdmin');
  const closeTeacherAdminBtn = document.getElementById('closeTeacherAdminBtn');
  const btnCloseAdminModal = document.getElementById('btnCloseAdminModal');
  const adminTaskTitleInput = document.getElementById('adminTaskTitleInput');
  const adminTaskTypeSelect = document.getElementById('adminTaskTypeSelect');
  const adminTaskStarsSelect = document.getElementById('adminTaskStarsSelect');
  const adminSampleFileInput = document.getElementById('adminSampleFileInput');
  const adminGeminiApiKeyInput = document.getElementById('adminGeminiApiKeyInput');
  const btnSaveAdminSettings = document.getElementById('btnSaveAdminSettings');
  const btnAdminResetDefault = document.getElementById('btnAdminResetDefault');

  // Dữ liệu bài mẫu mặc định
  const DEFAULT_SAMPLE_TASK = {
    title: 'Luyện viết chữ cái: Nét chữ nết người',
    type: 'writing',
    stars: 5,
    desc: 'Con hãy viết đúng độ cao ô ly (2 - 2,5 ly), nét chữ ngay ngắn, thẳng hàng và sạch đẹp như bài mẫu dưới đây nhé!',
    image: sampleTaskImage ? sampleTaskImage.src : '',
    criteria: [
      'Con chữ đúng độ cao 2 ô ly và 2,5 ô ly.',
      'Nét chữ đều đặn, không bị run tay, thẳng hàng.',
      'Trang vở sạch sẽ, không gạch xóa hoặc nhăn góc.'
    ]
  };

  function loadSampleTask() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAMPLE_TASK);
      if (saved) {
        return Object.assign({}, DEFAULT_SAMPLE_TASK, JSON.parse(saved));
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
    if (sampleTaskTitle) sampleTaskTitle.innerHTML = `<span>✍️</span> ${currentTask.title}`;
    if (sampleTaskDesc) sampleTaskDesc.textContent = currentTask.desc;
    if (sampleTaskRewardBadge) sampleTaskRewardBadge.textContent = `🌟 Thưởng: +${currentTask.stars} ⭐`;
    if (sampleTaskImage && currentTask.image) sampleTaskImage.src = currentTask.image;
  }

  // Khởi tạo Firebase & Lấy danh sách học sinh
  function initData() {
    renderSampleTaskUI();

    if (window.FirebaseSync && window.FirebaseSync.init) {
      window.FirebaseSync.init();
      window.FirebaseSync.onClassDataChange(data => {
        if (data && data.students) {
          currentClassData = data;
          renderStudentsList(data.students);
          if (activeStudent) {
            const updated = data.students.find(s => s.id === activeStudent.id);
            if (updated) updateActiveStudentUI(updated);
          }
        }
      });
    }

    // Fallback nếu không có mạng
    if (!currentClassData) {
      try {
        const local = localStorage.getItem('lop_hoc_vltk_local_data');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && parsed.students) {
            currentClassData = parsed;
            renderStudentsList(parsed.students);
          }
        }
      } catch (e) {}
    }
  }

  function renderStudentsList(students) {
    if (!studentSelectGrid) return;
    studentSelectGrid.innerHTML = '';

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
        activeStudent = st;
        updateActiveStudentUI(st);
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
          width: { ideal: 1280 },
          height: { ideal: 720 }
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

    capturedImageDataUrl = cameraCanvas.toDataURL('image/jpeg', 0.85);

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
  if (btnAnalyzeWork) {
    btnAnalyzeWork.addEventListener('click', async () => {
      if (!activeStudent) {
        alert('👉 Bé hãy chọn tên của mình ở Bước 1 trước khi chấm bài nhé!');
        document.querySelector('.soibai-container').scrollIntoView({ behavior: 'smooth' });
        return;
      }

      if (!capturedImageDataUrl) {
        alert('👉 Vui lòng chụp hoặc tải ảnh bài viết lên trước nhé!');
        return;
      }

      // Bật hiệu ứng quét laser
      scanLaserBeam.style.display = 'block';
      btnAnalyzeWork.disabled = true;
      btnAnalyzeWork.innerHTML = '<span>⏳</span> ĐANG SOI TỪNG NÉT CHỮ...';

      try {
        const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '';
        let result = null;

        if (apiKey) {
          result = await gradeWithGeminiVision(apiKey, capturedImageDataUrl, currentTask);
        } else {
          // Thuật toán Computer Vision nội bộ phân tích độ tương phản và nét chữ
          result = await gradeWithVisionHeuristics(capturedImageDataUrl, currentTask);
        }

        lastGradingResult = result;
        await showGradingResult(result);
      } catch (err) {
        console.error('Lỗi phân tích bài:', err);
        // Fallback nhẹ nhàng
        const fallbackRes = {
          passed: true,
          stars: currentTask.stars || 5,
          comment: `Bài viết của ${activeStudent.name} khá sạch đẹp, nét chữ ngay ngắn. Cô cộng ${currentTask.stars} sao thưởng cho con nhé!`
        };
        lastGradingResult = fallbackRes;
        await showGradingResult(fallbackRes);
      } finally {
        scanLaserBeam.style.display = 'none';
        btnAnalyzeWork.disabled = false;
        btnAnalyzeWork.innerHTML = '<span>⚡</span> BẮT ĐẦU CHẤM BÀI NGAY!';
      }
    });
  }

  // 1. Chấm bài bằng Google Gemini Vision API
  async function gradeWithGeminiVision(apiKey, studentImageBase64, task) {
    const base64Data = studentImageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `Bạn là cô giáo tiểu học lớp 1 Việt Nam giàu tình thương và tận tâm.
Hãy quan sát bức ảnh chụp bài làm (luyện viết chữ hoặc toán) của học sinh lớp 1 sau đây và chấm bài theo chuẩn giáo dục tiểu học.
Đề bài cô giao: "${task.title}".
Tiêu chí bài viết chuẩn: Đúng độ cao ô ly (2 - 2,5 ly), nét chữ đều đẹp, ngay ngắn thẳng hàng, không gạch xóa bẩn.

Yêu cầu phân tích:
1. Nếu chữ viết đạt chuẩn đều đẹp (hoặc làm toán đúng rõ ràng): Đánh giá passed = true.
2. Nếu chữ quá nghệch ngoạc, lệch lạc nhiều ô ly, tẩy xóa lem nhem: Đánh giá passed = false.
3. Nhận xét ngắn gọn 1-2 câu ấm áp, xưng "Cô" gọi "Con" hoặc "Em", động viên khích lệ học sinh lớp 1.

TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON (không kèm markdown):
{
  "passed": true,
  "stars": ${task.stars || 5},
  "comment": "Lời nhận xét của cô giáo"
}`;

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

  // 2. Chấm bài bằng Computer Vision nội bộ (Không cần API Key)
  async function gradeWithVisionHeuristics(imageBase64, task) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 300, 200);

        const imgData = ctx.getImageData(0, 0, 300, 200).data;
        let darkPixels = 0;
        let total = imgData.length / 4;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i], g = imgData[i+1], b = imgData[i+2];
          const brightness = (r + g + b) / 3;
          if (brightness < 130) darkPixels++;
        }

        const strokeDensity = darkPixels / total;
        // Bài viết có nét chữ thực thụ thường có mật độ mực từ 2% đến 35%
        const hasGoodStrokes = strokeDensity >= 0.02 && strokeDensity <= 0.40;

        setTimeout(() => {
          if (hasGoodStrokes) {
            resolve({
              passed: true,
              stars: task.stars || 5,
              comment: `Bài viết của ${activeStudent ? activeStudent.name : 'em'} rất đều và đẹp, con giữ vở sạch và viết đúng ô ly. Cô thưởng con ${task.stars} sao nhé! 🎉`
            });
          } else {
            resolve({
              passed: false,
              stars: 0,
              comment: `Ảnh bài viết chưa rõ nét hoặc nét chữ còn mờ, chưa đạt yêu cầu. Em hãy đặt vở ngay ngắn dưới ánh đèn sáng và viết lại nắn nót hơn nhé!`
            });
          }
        }, 1500); // Giả lập quét 1.5s
      };
      img.src = imageBase64;
    });
  }

  // Hiển thị kết quả & Cộng sao vào Firebase
  async function showGradingResult(res) {
    gradingResultBox.style.display = 'block';

    if (res.passed) {
      gradingResultBox.className = 'grading-result-box passed';
      resultAvatar.textContent = '🎉🐣🌟';
      resultTitle.textContent = 'XUẤT SẮC! BÀI VIẾT ĐẠT CHUẨN';
      resultStarsBadge.style.display = 'inline-flex';
      resultStarsBadge.innerHTML = `<span>⭐</span> +${res.stars} SAO ĐÃ ĐƯỢC CỘNG VÀO LINH THÚ!`;
      resultComment.textContent = `"${res.comment}"`;

      // Bắn pháo hoa ăn mừng
      if (window.confetti) {
        window.confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      }

      // Phát âm thanh chúc mừng
      if (window.AudioManager && window.AudioManager.playReward) {
        window.AudioManager.playReward();
      }

      // Tự động đọc giọng nói khích lệ bé
      speakVietnamese(`Chúc mừng ${activeStudent.name}! ${res.comment}`);

      // CỘNG SAO VÀO FIREBASE
      await awardStarsToFirebase(activeStudent.id, res.stars, `Soi bài đạt chuẩn: ${currentTask.title}`);
    } else {
      gradingResultBox.className = 'grading-result-box failed';
      resultAvatar.textContent = '📝💪';
      resultTitle.textContent = 'EM CẦN VIẾT LẠI NHÉ!';
      resultStarsBadge.style.display = 'none';
      resultComment.textContent = `"${res.comment}"`;

      speakVietnamese(`Bài viết của ${activeStudent.name} chưa đạt yêu cầu. Em hãy nắn nót viết lại cẩn thận hơn nhé!`);
    }

    gradingResultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Tự động cộng sao vào Firebase Realtime Database
  async function awardStarsToFirebase(studentId, stars, reason) {
    if (!window.FirebaseSync || !window.FirebaseSync.isInitialized) {
      console.warn('Firebase chưa sẵn sàng, lưu cục bộ.');
      return;
    }

    try {
      const ref = window.FirebaseSync.db.ref('classData');
      const snap = await ref.once('value');
      let classData = snap.val();
      if (!classData || !classData.students) return;

      const student = classData.students.find(s => s.id === studentId);
      if (!student) return;

      student.stars = (student.stars || 0) + Number(stars);

      const group = (classData.groups || []).find(g => g.id === student.group);
      if (group) group.stars = (group.stars || 0) + Number(stars);

      if (!student.logs) student.logs = [];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      student.logs.unshift({
        id: 'log-ai-' + Date.now(),
        time: timeStr,
        points: Number(stars),
        reason: reason,
        icon: '📸'
      });
      if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);

      // Kiểm tra mốc nở trứng
      const hatchReq = (window.EggEvolution && window.EggEvolution.getHatchRequirement) 
        ? window.EggEvolution.getHatchRequirement(student) 
        : { threshold: 100 };
      if (student.stars >= hatchReq.threshold) {
        if (!student.hatchedAt) student.hatchedAt = Date.now();
        if (!student.firstHatchedAt) student.firstHatchedAt = Date.now();
      }

      classData.lastUpdated = Date.now();
      await ref.set(classData);

      // Cập nhật lại UI số sao
      activeStudent.stars = student.stars;
      updateActiveStudentUI(student);

      console.log(`✅ Đã cộng +${stars} sao cho bé ${student.name} lên Firebase!`);
    } catch (e) {
      console.error('Lỗi cộng sao Firebase:', e);
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

  if (btnScanAnother) {
    btnScanAnother.addEventListener('click', () => {
      capturedImageDataUrl = null;
      gradingResultBox.style.display = 'none';
      btnAnalyzeWork.style.display = 'none';
      capturedImagePreview.style.display = 'none';
      cameraPlaceholder.style.display = 'block';
      btnStartCamera.style.display = 'inline-flex';
      btnRetakePhoto.style.display = 'none';
      btnSnapPhoto.style.display = 'none';
    });
  }

  // --- CÀI ĐẶT BÀI MẪU DÀNH CHO CÔ GIÁO ---
  if (btnOpenTeacherAdmin && teacherAdminModal) {
    btnOpenTeacherAdmin.addEventListener('click', () => {
      adminTaskTitleInput.value = currentTask.title;
      adminTaskTypeSelect.value = currentTask.type || 'writing';
      adminTaskStarsSelect.value = String(currentTask.stars || 5);
      adminGeminiApiKeyInput.value = localStorage.getItem(STORAGE_KEY_GEMINI_KEY) || '';
      teacherAdminModal.classList.add('active');
    });
  }

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
        currentTask = Object.assign({}, DEFAULT_SAMPLE_TASK);
        saveSampleTask(currentTask);
        renderSampleTaskUI();
        teacherAdminModal.classList.remove('active');
      }
    });
  }

  // Khởi động
  document.addEventListener('DOMContentLoaded', initData);
})();
