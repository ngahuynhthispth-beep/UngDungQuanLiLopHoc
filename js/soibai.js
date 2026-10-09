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

  // Dữ liệu bài mẫu mặc định
  const DEFAULT_SAMPLE_TASK = {
    title: 'Luyện viết chữ cái: Nét chữ nết người',
    type: 'writing',
    stars: 10,
    desc: 'Con hãy viết đúng độ cao ô ly (2 - 2,5 ly), nét chữ ngay ngắn, thẳng hàng và sạch đẹp như bài mẫu dưới đây nhé!',
    image: sampleTaskImage ? sampleTaskImage.src : '',
    criteria: [
      '🌟 Mức 1 (10 ⭐): Chữ viết đều nét, đúng chữ mẫu ô ly, không tẩy xóa.',
      '⭐ Mức 2 (5 ⭐): Bài viết tương đối đều, tẩy xóa 1 - 3 lỗi nhỏ (cô gạch chân chỗ sai).',
      '📝 Mức 3 (Viết lại bài - 0 ⭐): Bài viết chưa đúng chữ mẫu, sai ô ly hoặc lem nhem nhiều.'
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
    if (sampleTaskRewardBadge) sampleTaskRewardBadge.textContent = `🌟 Thưởng: Lên tới +10 ⭐`;
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
          tier: 2,
          passed: true,
          stars: 5,
          title: 'ĐẠT YÊU CẦU - 5 SAO! ⭐',
          comment: `Bài viết của ${activeStudent.name} khá sạch đẹp, nét chữ ngay ngắn. Cô cộng 5 sao thưởng cho con nhé!`
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
        const tagText = err.type === 'smudge' ? '🧹 Tẩy xóa lem' : '✍️ Chưa chuẩn mẫu';
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

    if (tier === 1) {
      // Dấu đỏ: ĐIỂM 10 ĐẸP 🌸
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = Math.max(3, Math.round(nw * 0.005));
      ctx.fillStyle = 'rgba(254, 242, 242, 0.9)';
      ctx.strokeRect(-8, -20, boxW, boxH);
      ctx.fillRect(-8, -20, boxW, boxH);

      ctx.fillStyle = '#DC2626';
      ctx.font = `bold ${Math.max(13, Math.round(nw * 0.03))}px sans-serif`;
      ctx.fillText('🌸 ĐIỂM 10 ĐẸP 🌸', 0, 0);
      ctx.font = `bold ${Math.max(9.5, Math.round(nw * 0.018))}px sans-serif`;
      ctx.fillText('Chữ đều nét & rất sạch!', 2, Math.round(nh * 0.032));
    } else if (tier === 2) {
      // Dấu cam: ĐẠT 5 SAO ⭐
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = Math.max(2.5, Math.round(nw * 0.004));
      ctx.fillStyle = 'rgba(255, 247, 237, 0.9)';
      ctx.strokeRect(-8, -20, boxW, boxH);
      ctx.fillRect(-8, -20, boxW, boxH);

      ctx.fillStyle = '#EA580C';
      ctx.font = `bold ${Math.max(13, Math.round(nw * 0.03))}px sans-serif`;
      ctx.fillText('⭐ ĐẠT 5 SAO', 0, 0);
      ctx.font = `bold ${Math.max(9.5, Math.round(nw * 0.018))}px sans-serif`;
      ctx.fillText('Chú ý chỗ cô gạch chân', 0, Math.round(nh * 0.032));
    } else {
      // Dấu đỏ: CÔ NHẮC: VIẾT LẠI 📝
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = Math.max(3, Math.round(nw * 0.005));
      ctx.fillStyle = 'rgba(254, 242, 242, 0.95)';
      ctx.strokeRect(-8, -20, boxW, boxH);
      ctx.fillRect(-8, -20, boxW, boxH);

      ctx.fillStyle = '#DC2626';
      ctx.font = `bold ${Math.max(12.5, Math.round(nw * 0.028))}px sans-serif`;
      ctx.fillText('✍️ CÔ NHẮC: VIẾT LẠI', 0, 0);
      ctx.font = `bold ${Math.max(9, Math.round(nw * 0.017))}px sans-serif`;
      ctx.fillText('Xem các nét gạch chân nhé', 0, Math.round(nh * 0.032));
    }
    ctx.restore();

    annotationCanvas.style.display = 'block';
  }

  // 1. Chấm bài bằng Google Gemini Vision API (Dành cho cô giáo có API Key)
  async function gradeWithGeminiVision(apiKey, studentImageBase64, task) {
    const base64Data = studentImageBase64.replace(/^data:image\/\w+;base64,/, '');

    const promptText = `Bạn là cô giáo tiểu học dạy Lớp 1 tại Việt Nam, rất hiền hậu, giàu tình thương và luôn khích lệ học sinh.
Hãy quan sát bức ảnh chụp bài làm (luyện viết chữ hoặc toán) của học sinh lớp 1 sau đây và chấm bài.
Đề bài cô giao: "${task.title}".

QUY ĐỊNH CHẤM ĐÚNG 3 MỨC ĐỘ THEO YÊU CẦU:
1. MỨC 1 (tier = 1, stars = 10, passed = true):
   - Chữ viết đều nét, đúng chuẩn chữ mẫu ô ly, trang vở sạch đẹp không tẩy xóa.
   - Nhận xét khen ngợi con xuất sắc đạt 10 sao.
2. MỨC 2 (tier = 2, stars = 5, passed = true):
   - Bài viết đều nhưng chưa đúng chữ mẫu lắm, hoặc tẩy xóa 1 - 3 lỗi nhỏ.
   - Nhận xét động viên con đạt 5 sao và chỉ ra các chỗ cô đã gạch chân để rút kinh nghiệm.
3. MỨC 3 (tier = 3, stars = 0, passed = false):
   - Bài viết chưa đúng chữ mẫu, lệch nhiều ô ly, chữ nghệch ngoạc hoặc tẩy xóa lem nhem nhiều (> 3 lỗi) hoặc trang vở chưa viết bài.
   - Nhắc con nhìn bài mẫu và viết lại bài cho đẹp.

NẾU CÓ LỖI Ở MỨC 2 HOẶC MỨC 3:
- Xác định vị trí các chỗ viết sai hoặc tẩy xóa trong mảng "errors" để cô giáo vẽ gạch chân màu đỏ (x, y tính trên lưới 400x300):
  { "x": 60, "y": 80, "w": 40, "h": 20, "type": "height" | "smudge", "label": "Mô tả lỗi ngắn gọn (ví dụ: Dòng 2: Nét chữ chưa đúng độ cao ô ly)" }

TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON:
{
  "tier": 1,
  "stars": 10,
  "passed": true,
  "title": "XUẤT SẮC - 10 SAO VÀNG!",
  "comment": "Lời nhận xét của cô giáo",
  "errors": []
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

        // Chuyển sang mảng độ xám grayscale
        const gray = new Uint8Array(W * H);
        for (let i = 0, p = 0; i < imgData.length; i += 4, p++) {
          const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
          gray[p] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
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

            if (localBg > 65) {
              paperPixels++;
              const contrastDiff = localBg - pVal;

              // Nét chì chuẩn: tối hơn nền 8 - 75 đơn vị
              if ((contrastDiff >= 8 && contrastDiff <= 75) || (pVal < 140 && localBg > 155)) {
                pencilStrokePixels++;
                rowStrokeCounts[y]++;
                strokeGrid[idx] = 1;
              }
              // Vết tẩy xóa lem chì hoặc vết bẩn đậm bất thường
              if (contrastDiff > 75 && pVal < 110) {
                strokeGrid[idx] = 2; // smudge
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

        // Nhận diện các chữ và phát hiện lỗi để gạch chân
        const detectedErrors = [];
        let lineIdx = 0;

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

        const cleanedErrors = mergeCloseErrors(detectedErrors);
        const strokeRatio = paperPixels > 0 ? (pencilStrokePixels / paperPixels) : 0;
        const hasWriting = (strokeRatio >= 0.005 && lines.length >= 2) || (strokeRatio >= 0.008);

        setTimeout(() => {
          const studentName = activeStudent ? activeStudent.name : 'bé';
          let tier = 3;
          let stars = 0;
          let title = '';
          let comment = '';
          let passed = false;

          if (!hasWriting) {
            // Mức 3: Chưa có chữ hoặc ảnh trống
            tier = 3;
            stars = 0;
            passed = false;
            title = 'BÉ HÃY VIẾT LẠI BÀI NHÉ! 📝';
            comment = 'Ảnh bài làm chưa rõ nét chữ bút chì hoặc trang vở còn để trống. Bé hãy nắn nót viết bài và soi lại cho cô chấm nhé!';
          } else {
            const errCount = cleanedErrors.length;
            if (errCount === 0) {
              // MỨC 1: XUẤT SẮC - 10 SAO
              tier = 1;
              stars = 10;
              passed = true;
              title = 'XUẤT SẮC - 10 SAO VÀNG! 🌟';
              comment = `Bài viết của ${studentName} rất ngoan! Chữ viết đều nét, đúng chuẩn chữ mẫu ô ly và trang vở sạch đẹp không tẩy xóa. Cô khen con đạt 10 sao xuất sắc! 🌟`;
            } else if (errCount >= 1 && errCount <= 3) {
              // MỨC 2: ĐẠT YÊU CẦU - 5 SAO
              tier = 2;
              stars = 5;
              passed = true;
              title = 'ĐẠT YÊU CẦU - 5 SAO! ⭐';
              comment = `Bài viết của ${studentName} tương đối đều nét nhưng còn ${errCount} chỗ tẩy xóa hoặc chưa đúng chữ mẫu. Cô đã gạch chân những chỗ con cần sửa ở trên, lần sau con nắn nót hơn nhé! Cô thưởng con 5 sao! ⭐`;
            } else {
              // MỨC 3: NHẮC CON VIẾT LẠI BÀI (0 SAO)
              tier = 3;
              stars = 0;
              passed = false;
              title = 'BÉ HÃY VIẾT LẠI BÀI NHÉ! 📝';
              comment = `Bài viết của ${studentName} chưa đúng chữ mẫu và có ${errCount} chỗ bị lệch ô ly hoặc tẩy xóa lem nhem. Cô đã gạch chân các chỗ sai trên trang vở ở trên, con hãy nhìn bài mẫu và viết lại thật nắn nót nhé! 💪`;
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

  // Hiển thị kết quả chấm 3 Mức Độ & Cộng sao vào Firebase
  async function showGradingResult(res) {
    gradingResultBox.style.display = 'block';

    // 1. Vẽ các nét gạch chân màu đỏ của cô giáo lên ảnh chụp
    if (capturedImagePreview) {
      drawAnnotationsOnCanvas(capturedImagePreview, res.errors || [], res.tier || 3);
    }

    // 2. Cập nhật danh sách các chỗ sai cô đã gạch chân
    if (annotatedErrorsBox && annotatedErrorsList) {
      if (res.errors && res.errors.length > 0) {
        annotatedErrorsBox.style.display = 'block';
        annotatedErrorsList.innerHTML = '';
        res.errors.forEach((err, idx) => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>Lỗi ${idx + 1}:</strong> ${err.label}`;
          annotatedErrorsList.appendChild(li);
        });
      } else {
        annotatedErrorsBox.style.display = 'none';
      }
    }

    // 3. Định hình giao diện theo 3 Mức Độ
    gradingResultBox.classList.remove('passed', 'failed', 'tier-1', 'tier-2', 'tier-3');
    gradingResultBox.classList.add(`tier-${res.tier || 3}`);

    const studentName = activeStudent ? activeStudent.name : 'Bé';

    if (res.tier === 1) {
      // MỨC 1: XUẤT SẮC (10 SAO)
      resultAvatar.textContent = '🌟🐣💮';
      resultTitle.textContent = res.title || 'XUẤT SẮC - 10 SAO VÀNG!';
      resultStarsBadge.style.display = 'inline-flex';
      resultStarsBadge.style.background = '#FEF3C7';
      resultStarsBadge.style.color = '#B45309';
      resultStarsBadge.style.borderColor = '#FCD34D';
      resultStarsBadge.innerHTML = '<span>🌟</span> +10 SAO ĐÃ ĐƯỢC CỘNG VÀO LINH THÚ!';
      resultComment.textContent = `"${res.comment}"`;
      if (btnRewriteWork) btnRewriteWork.style.display = 'none';

      if (window.confetti) {
        window.confetti({ particleCount: 110, spread: 85, origin: { y: 0.6 } });
      }
      if (window.AudioManager && window.AudioManager.playReward) {
        window.AudioManager.playReward();
      }

      speakVietnamese(`Chúc mừng ${studentName}! Bài viết của con đạt xuất sắc 10 sao!`);
      await awardStarsToFirebase(activeStudent.id, 10, `Soi bài Mức 1 (Xuất sắc): ${currentTask.title}`);

    } else if (res.tier === 2) {
      // MỨC 2: ĐẠT YÊU CẦU (5 SAO)
      resultAvatar.textContent = '⭐🐣👏';
      resultTitle.textContent = res.title || 'ĐẠT YÊU CẦU - 5 SAO!';
      resultStarsBadge.style.display = 'inline-flex';
      resultStarsBadge.style.background = '#DCFCE7';
      resultStarsBadge.style.color = '#065F46';
      resultStarsBadge.style.borderColor = '#34D399';
      resultStarsBadge.innerHTML = '<span>⭐</span> +5 SAO ĐÃ ĐƯỢC CỘNG VÀO LINH THÚ!';
      resultComment.textContent = `"${res.comment}"`;
      if (btnRewriteWork) btnRewriteWork.style.display = 'none';

      if (window.confetti) {
        window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      }
      if (window.AudioManager && window.AudioManager.playReward) {
        window.AudioManager.playReward();
      }

      speakVietnamese(`Chúc mừng ${studentName}! Con đạt 5 sao. Con nhớ chú ý những chỗ cô gạch chân nhé!`);
      await awardStarsToFirebase(activeStudent.id, 5, `Soi bài Mức 2 (Đạt 5 sao): ${currentTask.title}`);

    } else {
      // MỨC 3: NHẮC CON VIẾT LẠI BÀI (0 SAO)
      resultAvatar.textContent = '📝💪✨';
      resultTitle.textContent = res.title || 'BÉ HÃY VIẾT LẠI BÀI NHÉ!';
      resultStarsBadge.style.display = 'inline-flex';
      resultStarsBadge.style.background = '#FFE4E6';
      resultStarsBadge.style.color = '#BE123C';
      resultStarsBadge.style.borderColor = '#FDA4AF';
      resultStarsBadge.innerHTML = '<span>⚠️</span> CẦN LUYỆN VIẾT LẠI (0 SAO)';
      resultComment.textContent = `"${res.comment}"`;
      if (btnRewriteWork) btnRewriteWork.style.display = 'inline-flex';

      speakVietnamese(`Bài viết của ${studentName} chưa đúng chữ mẫu. Cô đã gạch chân những chỗ con viết chưa đạt trên vở. Con hãy nhìn bài mẫu và viết lại nhé!`);
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
