/**
 * Voice Assistant for Classroom Management - Lớp 1/8 Trường TH Tiểu La
 * Chế độ Micro Nhận Diện Giọng Nói Tự Động Tìm Tên Học Sinh Cộng / Trừ Điểm Trong Giờ Dạy
 */

(function () {
  'use strict';

  // Chuẩn hóa chuỗi tiếng Việt loại bỏ dấu phục vụ tìm kiếm thông minh
  function removeVietnameseTones(str) {
    if (!str) return '';
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  // Chuyển đổi từ ngữ chỉ số lượng tiếng Việt thành số
  function parseVietnameseNumber(text) {
    if (!text) return null;
    const clean = text.toLowerCase();

    // Tìm số dạng chữ số trực tiếp: 1, 2, 5, 10, ...
    const digitMatch = clean.match(/\b(\d+)\b/);
    if (digitMatch) {
      return parseInt(digitMatch[1], 10);
    }

    const numMap = {
      'nửa': 1, 'một': 1, 'mốt': 1, 'hai': 2, 'ba': 3, 'bốn': 4,
      'năm': 5, 'lăm': 5, 'sáu': 6, 'bảy': 7, 'bẩy': 7, 'tám': 8,
      'chín': 9, 'mười': 10, 'mười lăm': 15, 'hai mươi': 20
    };

    for (const [w, n] of Object.entries(numMap)) {
      const regex = new RegExp(`\\b${w}\\b`, 'i');
      if (regex.test(clean)) return n;
    }

    return null;
  }

  class VoiceAssistant {
    constructor() {
      this.recognition = null;
      this.isListening = false;
      this.isSupported = false;
      this.synth = window.speechSynthesis || null;
      this.activeModal = null;
      this.lastTranscript = '';

      this.init();
    }

    init() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('Trình duyệt không hỗ trợ Web Speech Recognition API.');
        this.isSupported = false;
        return;
      }

      this.isSupported = true;
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'vi-VN';
        this.recognition.continuous = false; // Nhận diện theo từng câu lệnh
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 3;

        this.recognition.onstart = () => {
          this.isListening = true;
          this.updateUiState(true);
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.updateUiState(false);
        };

        this.recognition.onerror = (event) => {
          console.warn('Lỗi nhận diện giọng nói:', event.error);
          this.isListening = false;
          this.updateUiState(false);
          let errMsg = 'Không nhận diện được giọng nói.';
          if (event.error === 'not-allowed') {
            errMsg = 'Trình duyệt chưa được cấp quyền dùng Micro. Vui lòng cho phép quyền Micro để sử dụng.';
          } else if (event.error === 'no-speech') {
            errMsg = 'Chưa nghe thấy cô nói gì. Hãy nhấn Micro và thử nói lại nhé!';
          }
          this.showStatusToast(errMsg, '⚠️');
        };

        this.recognition.onresult = (event) => {
          const results = event.results;
          if (!results || results.length === 0) return;

          // Lấy kết quả tốt nhất
          const transcript = results[0][0].transcript.trim();
          this.lastTranscript = transcript;
          this.processCommand(transcript);
        };
      } catch (e) {
        console.error('Không thể khởi tạo SpeechRecognition:', e);
        this.isSupported = false;
      }
    }

    // Bật / Tắt lắng nghe
    toggleListening() {
      if (!this.isSupported) {
        alert('Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói Tiếng Việt.\nVui lòng sử dụng Google Chrome, Cốc Cốc hoặc Safari trên iPhone/iPad.');
        return;
      }

      if (this.isListening) {
        this.stop();
      } else {
        this.start();
      }
    }

    start() {
      if (!this.recognition) return;
      try {
        this.recognition.start();
      } catch (e) {
        console.warn('Lỗi start recognition:', e);
      }
    }

    stop() {
      if (!this.recognition) return;
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Lỗi stop recognition:', e);
      }
    }

    // Xử lý câu lệnh ngôn ngữ tự nhiên tiếng Việt
    processCommand(transcript) {
      if (!transcript) return;
      const raw = transcript.toLowerCase();
      const clean = removeVietnameseTones(transcript);

      // Cập nhật text câu lệnh hiển thị trên popup
      this.updateTranscriptDisplay(transcript);

      // Lấy danh sách học sinh hiện tại từ StorageManager
      const data = (window.StorageManager && window.StorageManager.loadData()) || { students: [] };
      const students = data.students || [];

      // 1. Kiểm tra lệnh cho CẢ LỚP
      const isClassWide = clean.includes('ca lop') || clean.includes('toan lop') || clean.includes('tat ca lop') || clean.includes('tat ca cac ban');
      if (isClassWide) {
        this.handleClassWideCommand(transcript, clean);
        return;
      }

      // 2. Tìm học sinh trong danh sách
      const matchedStudent = this.findBestStudentMatch(clean, students);
      if (!matchedStudent) {
        const msg = `Không tìm thấy học sinh trong câu nói: "${transcript}". Cô hãy đọc rõ tên bé (VD: "Khen Minh An 5 sao", "Trừ 2 sao Gia Hưng")`;
        this.showStatusToast(msg, '❓');
        this.speakFeedback('Không tìm thấy học sinh. Cô vui lòng đọc rõ họ tên bé nhé.');
        return;
      }

      // 3. Xác định loại lệnh: Cộng hay Trừ điểm
      const negativeKeywords = [
        'tru', 'phat', 'nhac nho', 'mat trat tu', 'noi chuyen', 'vi pham', 
        'chua ngoan', 'quay cop', 'khong lam', 'quen vo', 'nghich', 'on ao'
      ];
      const isNegative = negativeKeywords.some(kw => clean.includes(kw));

      // 4. Xác định số điểm
      let points = parseVietnameseNumber(transcript);
      if (!points || points <= 0 || points > 100) {
        // Mặc định: Trừ 2 hoặc 5 sao, Cộng 5 sao
        points = isNegative ? 2 : 5;
      }

      // 5. Trích xuất lý do
      let reason = isNegative ? 'Nhắc nhở qua giọng nói' : 'Khen thưởng qua giọng nói';
      if (clean.includes('mat trat tu')) reason = 'Mất trật tự trong giờ học';
      else if (clean.includes('noi chuyen')) reason = 'Nói chuyện riêng trong lớp';
      else if (clean.includes('khong lam bai') || clean.includes('chua lam bai')) reason = 'Chưa làm bài tập';
      else if (clean.includes('quen vo')) reason = 'Quên sách vở dụng cụ học tập';
      else if (clean.includes('phat bieu')) reason = 'Hăng hái phát biểu xây dựng bài';
      else if (clean.includes('doc to') || clean.includes('doc bai to')) reason = 'Đọc bài to rõ ràng';
      else if (clean.includes('viet dep') || clean.includes('chu dep')) reason = 'Chữ viết sạch đẹp nắn nót';
      else if (clean.includes('cham ngoan')) reason = 'Chăm ngoan gương mẫu';
      else if (clean.includes('lam bai nhanh') || clean.includes('lam dung')) reason = 'Làm bài nhanh và chính xác';

      // 6. Thực thi áp dụng điểm
      const actualPoints = isNegative ? -points : points;
      const icon = isNegative ? '⚠️' : '⭐';

      if (typeof window.applyStudentPoints === 'function') {
        // Gọi applyStudentPoints với skipConfirm = true vì giáo viên đã trực tiếp ra lệnh bằng giọng nói
        window.applyStudentPoints(matchedStudent.id, actualPoints, reason, icon, null, true);
      } else {
        window.StorageManager.addPointsToStudent(matchedStudent.id, actualPoints, reason, icon);
        if (typeof window.refreshData === 'function') window.refreshData();
      }

      // 7. Âm thanh & Phản hồi giọng nói (TTS)
      const feedbackText = isNegative 
        ? `Đã trừ ${points} sao của bạn ${matchedStudent.name}. Lý do: ${reason}!`
        : `Đã cộng ${points} sao cho bạn ${matchedStudent.name}!`;

      this.speakFeedback(feedbackText);
      this.showStatusToast(`🎙️ <strong>${matchedStudent.name}</strong>: ${isNegative ? '-' : '+'}${points} ⭐ (${reason})`, isNegative ? '⚠️' : '🌟');
    }

    // Tìm kiếm học sinh khớp nhất từ câu nói
    findBestStudentMatch(cleanTranscript, students) {
      if (!students || students.length === 0) return null;

      // Danh sách học sinh kèm tên không dấu
      const list = students.map(s => {
        const fullClean = removeVietnameseTones(s.name);
        const parts = fullClean.split(' ');
        const lastName = parts[parts.length - 1]; // Tên chính (ví dụ: An, Anh, Hưng, Yến)
        const twoLastNames = parts.length >= 2 ? `${parts[parts.length - 2]} ${parts[parts.length - 1]}` : fullClean;
        return {
          student: s,
          fullClean,
          twoLastNames,
          lastName
        };
      });

      // Ưu tiên 1: Khớp chính xác cả họ và tên hoặc 2 từ cuối (ví dụ "Phạm Bảo Hân", "Bảo Hân", "Đăng Khôi", "Minh Khôi", "Hải Yến")
      // Sắp xếp theo độ dài giảm dần để tên dài được kiểm tra trước (tránh "Bảo Hân" đè "Phạm Bảo Hân")
      const sortedByLength = [...list].sort((a, b) => b.fullClean.length - a.fullClean.length);
      for (const item of sortedByLength) {
        if (cleanTranscript.includes(item.fullClean)) {
          return item.student;
        }
      }

      for (const item of sortedByLength) {
        if (cleanTranscript.includes(item.twoLastNames)) {
          return item.student;
        }
      }

      // Ưu tiên 2: Khớp tên chính (nếu tên đó là DUY NHẤT trong lớp)
      // Ví dụ: trong lớp chỉ có 1 bạn tên "Yến" (Hải Yến), 1 bạn tên "Hưng" (Gia Hưng), 1 bạn tên "Dương" (Ánh Dương), 1 bạn tên "Thảo" (Hương Thảo)
      const lastNameCounts = {};
      list.forEach(item => {
        lastNameCounts[item.lastName] = (lastNameCounts[item.lastName] || 0) + 1;
      });

      for (const item of list) {
        // Chỉ khớp tên đơn nếu tên này là duy nhất trong cả lớp 36 bạn
        if (lastNameCounts[item.lastName] === 1) {
          const regex = new RegExp(`\\b${item.lastName}\\b`, 'i');
          if (regex.test(cleanTranscript)) {
            return item.student;
          }
        }
      }

      return null;
    }

    // Xử lý lệnh thưởng / phạt cả lớp
    handleClassWideCommand(transcript, clean) {
      const isNegative = clean.includes('tru') || clean.includes('phat');
      let points = parseVietnameseNumber(transcript) || (isNegative ? 2 : 1);
      const actualPoints = isNegative ? -points : points;
      const reason = isNegative ? 'Nhắc nhở chung cả lớp' : 'Cả lớp cùng chăm ngoan';
      const icon = isNegative ? '⚠️' : '⭐';

      const data = (window.StorageManager && window.StorageManager.loadData()) || { students: [] };
      (data.students || []).forEach(s => {
        window.StorageManager.addPointsToStudent(s.id, actualPoints, reason, icon);
      });

      if (typeof window.refreshData === 'function') window.refreshData();

      const feedback = isNegative 
        ? `Đã nhắc nhở trừ ${points} sao của cả lớp.` 
        : `Đã cộng ${points} sao cho cả lớp cùng chăm ngoan!`;

      this.speakFeedback(feedback);
      this.showStatusToast(`🎙️ <strong>Cả Lớp</strong>: ${isNegative ? '-' : '+'}${points} ⭐ (${reason})`, '🌟');
    }

    // Phát âm thanh phản hồi giọng nói (Text-To-Speech)
    speakFeedback(text) {
      if (!this.synth) return;
      try {
        this.synth.cancel(); // Dừng câu đang đọc dở nếu có
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.05; // Tốc độ tự nhiên, hơi nhanh 1 chút cho cô đỡ phải chờ
        utterance.pitch = 1.1;

        // Ưu tiên chọn giọng tiếng Việt chất lượng cao nếu có
        const voices = this.synth.getVoices();
        const viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang.startsWith('vi'));
        if (viVoice) utterance.voice = viVoice;

        this.synth.speak(utterance);
      } catch (e) {
        console.warn('TTS error:', e);
      }
    }

    // Cập nhật giao diện khi Micro Bật / Tắt
    updateUiState(isListening) {
      const btn = document.getElementById('btnVoiceAssistant');
      const modal = document.getElementById('voiceAssistantModal');
      const wave = document.getElementById('voiceWaveAnim');
      const statusText = document.getElementById('voiceStatusText');

      if (btn) {
        if (isListening) {
          btn.classList.add('recording-active');
          btn.innerHTML = `<span class="mic-pulse-dot">🔴</span> Đang Lắng Nghe...`;
        } else {
          btn.classList.remove('recording-active');
          btn.innerHTML = `🎙️ Mic AI Chấm Điểm`;
        }
      }

      if (modal) {
        if (isListening) {
          modal.classList.add('active');
          if (statusText) statusText.textContent = 'Cô hãy nói lệnh (VD: "Khen Minh An 5 sao", "Trừ 2 sao Gia Hưng")...';
          if (wave) wave.style.display = 'flex';
        } else {
          if (wave) wave.style.display = 'none';
        }
      }
    }

    updateTranscriptDisplay(text) {
      const transcriptEl = document.getElementById('voiceTranscriptResult');
      if (transcriptEl) {
        transcriptEl.innerHTML = `💬 <em>"${text}"</em>`;
      }
    }

    showStatusToast(msg, icon = '🎙️') {
      if (typeof window.showSyncToast === 'function') {
        window.showSyncToast(msg, icon);
      }
    }
  }

  // Khởi tạo và gắn vào window
  window.VoiceAssistant = new VoiceAssistant();

  // Khởi tạo các nút bấm giao diện khi DOM sẵn sàng
  document.addEventListener('DOMContentLoaded', () => {
    const btnVoice = document.getElementById('btnVoiceAssistant');
    if (btnVoice) {
      btnVoice.addEventListener('click', () => {
        window.VoiceAssistant.toggleListening();
      });
    }

    const btnCloseModal = document.getElementById('btnCloseVoiceModal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        window.VoiceAssistant.stop();
        const modal = document.getElementById('voiceAssistantModal');
        if (modal) modal.classList.remove('active');
      });
    }

    const btnToggleInModal = document.getElementById('btnToggleVoiceInModal');
    if (btnToggleInModal) {
      btnToggleInModal.addEventListener('click', () => {
        window.VoiceAssistant.toggleListening();
      });
    }
  });

})();
