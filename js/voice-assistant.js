/**
 * Voice Assistant for Classroom Management - Lớp 1/8 Trường TH Tiểu La
 * Chế độ Micro Nhận Diện Giọng Nói Tự Động Tìm Tên Học Sinh Cộng / Trừ Điểm Trong Giờ Dạy
 * Thiết kế chuẩn theo cú pháp: [Cộng / Trừ] + [Tên học sinh] + [Số điểm]
 * Tự động sửa lỗi nhận diện âm thanh thường gặp (VD: "Trừ Gia Hưng 5 điểm" bị nghe thành "Trần Gia Hưng 5 điểm")
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

  // Chuẩn hóa lỗi nhận diện âm thanh thường gặp của Google Web Speech API
  function normalizeTranscript(rawTranscript, students) {
    if (!rawTranscript) return '';
    let text = rawTranscript.trim();

    // 1. Chuẩn hóa lỗi nghe nhầm của từ "Trừ":
    // Google STT tiếng Việt thường xuyên nghe "Trừ" thành "Trần", "Từ", "Trực", "Chừ", "Chữ", "Trú", "Trúng", "Trả"
    text = text.replace(/^(cô|thầy|em|tôi)\s+(trần|từ|trực|chừ|chữ|trú|trúng|trả)\b/i, 'Trừ ');
    text = text.replace(/^(cô|thầy|em|tôi)\s+(trừ)\b/i, 'Trừ ');
    text = text.replace(/^(cô|thầy|em|tôi)\s+(cộng)\b/i, 'Cộng ');
    text = text.replace(/^(trần|từ|trực|chừ|chữ|trú|trúng|trả)\b/i, 'Trừ ');

    // 2. Chuẩn hóa lỗi nghe nhầm của từ "Cộng":
    // Thường nhận diện thành "Cổng", "Cọng", "Chọn"
    text = text.replace(/^(cổng|cọng|chọn)\b/i, 'Cộng ');
    // Nếu bắt đầu bằng "Công" nhưng từ tiếp theo KHÔNG PHẢI là "Hậu" (học sinh Công Hậu) -> thực chất là "Cộng"
    text = text.replace(/^(công)\s+(?!hậu\b)/i, 'Cộng ');

    // 3. Chuẩn hóa "trần [tên học sinh]" ở bất kỳ vị trí nào (vì lớp 1/8 không có bạn nào họ Trần)
    if (Array.isArray(students)) {
      students.forEach(s => {
        const sClean = removeVietnameseTones(s.name);
        const reg = new RegExp('\\b(trần|từ|trực|chừ)\\s+(' + sClean + ')\\b', 'gi');
        text = text.replace(reg, 'Trừ $2');
      });
    }

    return text;
  }

  // Chuyển đổi từ ngữ chỉ số lượng tiếng Việt thành số
  function parseVietnameseNumber(text) {
    if (!text) return null;
    const clean = removeVietnameseTones(text);

    // Tìm số dạng chữ số trực tiếp: 1, 2, 5, 10, ... (kèm từ điểm/sao/diem)
    const digitMatch = clean.match(/\b(\d+)\s*(diem|sao|star|d|p)?\b/);
    if (digitMatch) {
      return parseInt(digitMatch[1], 10);
    }

    const numMap = {
      'muoi lam': 15, 'mười lăm': 15, 'hai muoi': 20, 'hai mươi': 20,
      'nua': 1, 'nửa': 1, 'mot': 1, 'một': 1, 'mot': 1, 'mốt': 1,
      'hai': 2, 'ba': 3, 'bon': 4, 'bốn': 4,
      'nam': 5, 'năm': 5, 'lam': 5, 'lăm': 5, 'sau': 6, 'sáu': 6,
      'bay': 7, 'bảy': 7, 'bay': 7, 'bẩy': 7, 'tam': 8, 'tám': 8,
      'chin': 9, 'chín': 9, 'muoi': 10, 'mười': 10
    };

    for (const [w, n] of Object.entries(numMap)) {
      if (new RegExp('\\b' + removeVietnameseTones(w) + '\\s*(diem|sao)?\\b', 'i').test(clean)) {
        return n;
      }
    }

    return null;
  }

  class VoiceAssistant {
    constructor() {
      this.recognition = null;
      this.isListening = false;
      this.isSupported = false;
      this.synth = window.speechSynthesis || null;
      this.lastTranscript = '';

      if (this.synth && this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          try { this.synth.getVoices(); } catch (e) {}
        };
      }

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
        this.recognition.continuous = false; // Từng câu lệnh dứt khoát
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 5; // Lấy nhiều phương án để bắt lỗi STT tốt nhất

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
            errMsg = 'Trình duyệt chưa được cấp quyền dùng Micro. Cô hãy bấm vào biểu tượng ổ khóa/camera trên thanh địa chỉ để BẬT Micro nhé!';
          } else if (event.error === 'no-speech') {
            errMsg = 'Chưa nghe thấy cô nói gì. Hãy nhấn Micro và thử nói lại nhé!';
          }
          if (window.soundFx && typeof window.soundFx.playPenalty === 'function') {
            window.soundFx.playPenalty();
          }
          this.showStatusToast(errMsg, '⚠️');
        };

        this.recognition.onresult = (event) => {
          const results = event.results;
          if (!results || results.length === 0) return;

          // Thu thập tất cả các phương án nhận diện được từ Google STT
          const alternatives = [];
          for (let i = 0; i < results[0].length; i++) {
            if (results[0][i] && results[0][i].transcript) {
              alternatives.push(results[0][i].transcript.trim());
            }
          }

          const primaryTranscript = alternatives[0] || '';
          this.lastTranscript = primaryTranscript;
          this.processCommand(primaryTranscript, alternatives);
        };
      } catch (e) {
        console.error('Không thể khởi tạo SpeechRecognition:', e);
        this.isSupported = false;
      }
    }

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

    // Xử lý câu lệnh nhận diện theo cấu trúc chuẩn: [Cộng / Trừ] + [Tên học sinh] + [Số điểm]
    processCommand(transcript, alternatives = []) {
      if (!transcript) return;

      const data = (window.StorageManager && window.StorageManager.loadData()) || { students: [] };
      const students = data.students || [];

      // Thử phân tích qua tất cả các phương án nhận diện (candidates)
      const candidates = [transcript, ...(alternatives || [])];
      let bestCommand = null;

      for (const cand of candidates) {
        if (!cand) continue;
        const normalized = normalizeTranscript(cand, students);
        const parsed = this.parseCommandGrammar(cand, normalized, students);
        if (parsed.student || parsed.isClassWide) {
          bestCommand = parsed;
          break;
        }
      }

      // Fallback về transcript gốc nếu không khớp
      if (!bestCommand) {
        const normalized = normalizeTranscript(transcript, students);
        bestCommand = this.parseCommandGrammar(transcript, normalized, students);
      }

      this.executeParsedCommand(bestCommand, students);
    }

    // Bộ phân tích ngữ pháp tiếng Việt theo cú pháp chuẩn của giáo viên
    parseCommandGrammar(raw, normalized, students) {
      const clean = removeVietnameseTones(normalized);

      // 1. Kiểm tra lệnh cho CẢ LỚP
      const isClassWide = clean.includes('ca lop') || clean.includes('toan lop') || clean.includes('tat ca lop') || clean.includes('tat ca cac ban');

      // 2. Xác định hành động (Cộng hay Trừ)
      let isNegative = false;
      let actionFound = false;

      const firstWord = clean.split(' ')[0];
      // Nếu từ đầu tiên là nhóm Trừ (bao gồm cả các từ Google nghe nhầm như tran, tu, truc, chu)
      if (['tru', 'tran', 'tu', 'phat', 'nhac', 'bot', 'rut'].includes(firstWord)) {
        isNegative = true;
        actionFound = true;
      } else if (['cong', 'khen', 'thuong', 'cho', 'tang', 'them', 'cham'].includes(firstWord)) {
        isNegative = false;
        actionFound = true;
      }

      if (!actionFound) {
        const negativeWords = ['tru', 'tran', 'tu', 'phat', 'nhac nho', 'nhac', 'bot', 'rut', 'mat trat tu', 'noi chuyen', 'vi pham', 'loi', 'chua ngoan', 'quay cop', 'khong lam', 'quen vo'];
        for (const nw of negativeWords) {
          if (new RegExp('\\b' + nw + '\\b', 'i').test(clean)) {
            isNegative = true;
            actionFound = true;
            break;
          }
        }
      }

      // 3. Trích xuất số điểm
      let points = parseVietnameseNumber(normalized);
      if (!points || points <= 0 || points > 100) {
        points = isNegative ? 2 : 5; // Mặc định nếu cô không đọc số điểm
      }

      // 4. Trích xuất lý do (nếu cô có nói thêm lý do)
      let reason = isNegative ? 'Nhắc nhở qua giọng nói' : 'Khen thưởng qua giọng nói';
      if (clean.includes('mat trat tu')) reason = 'Mất trật tự trong giờ học';
      else if (clean.includes('noi chuyen')) reason = 'Nói chuyện riêng trong lớp';
      else if (clean.includes('khong lam bai') || clean.includes('chua lam bai')) reason = 'Chưa làm bài tập';
      else if (clean.includes('quen vo')) reason = 'Quên sách vở đồ dùng học tập';
      else if (clean.includes('phat bieu')) reason = 'Hăng hái phát biểu xây dựng bài';
      else if (clean.includes('doc to') || clean.includes('doc bai to')) reason = 'Đọc bài to rõ ràng';
      else if (clean.includes('viet dep') || clean.includes('chu dep')) reason = 'Chữ viết sạch đẹp nắn nót';
      else if (clean.includes('cham ngoan')) reason = 'Chăm ngoan gương mẫu';
      else if (clean.includes('lam dung') || clean.includes('lam nhanh')) reason = 'Làm bài nhanh và chính xác';

      // 5. Tìm học sinh khớp nhất
      const student = isClassWide ? null : this.findBestStudentMatch(clean, students);

      return {
        raw,
        normalized,
        isClassWide,
        isNegative,
        points,
        reason,
        student
      };
    }

    // Tìm kiếm học sinh khớp nhất từ câu nói
    findBestStudentMatch(cleanTranscript, students) {
      if (!students || students.length === 0) return null;

      // Sắp xếp theo độ dài họ tên giảm dần (để "Phạm Bảo Hân" được ưu tiên trước "Bảo Hân")
      const sortedStudents = [...students].sort((a, b) => b.name.length - a.name.length);

      // Bước 1: Khớp chính xác cả họ tên hoặc 2 từ cuối (vd: 'gia hung', 'pham bao han', 'minh an', 'hai yen')
      for (const s of sortedStudents) {
        const sClean = removeVietnameseTones(s.name);
        if (new RegExp('\\b' + sClean + '\\b', 'i').test(cleanTranscript)) {
          return s;
        }
      }

      // Bước 2: Khớp 2 từ cuối nếu tên có 3 từ (vd: 'Bảo Hân' trong 'Phạm Bảo Hân')
      for (const s of sortedStudents) {
        const parts = removeVietnameseTones(s.name).split(' ');
        if (parts.length >= 2) {
          const twoLast = parts.slice(-2).join(' ');
          if (new RegExp('\\b' + twoLast + '\\b', 'i').test(cleanTranscript)) {
            return s;
          }
        }
      }

      // Bước 3: Khớp tên chính (nếu tên này là duy nhất trong cả lớp 36 bạn)
      // Ví dụ: trong lớp chỉ có 1 bạn tên Hưng (Gia Hưng), 1 bạn tên Yến (Hải Yến), 1 bạn tên Thảo (Hương Thảo)
      const lastNameCounts = {};
      students.forEach(s => {
        const parts = removeVietnameseTones(s.name).split(' ');
        const l = parts[parts.length - 1];
        lastNameCounts[l] = (lastNameCounts[l] || 0) + 1;
      });

      for (const s of sortedStudents) {
        const parts = removeVietnameseTones(s.name).split(' ');
        const l = parts[parts.length - 1];
        if (lastNameCounts[l] === 1 && new RegExp('\\b' + l + '\\b', 'i').test(cleanTranscript)) {
          return s;
        }
      }

      return null;
    }

    // Thực thi câu lệnh đã phân tích
    executeParsedCommand(cmd, students) {
      if (!cmd) return;

      // Hiển thị câu lệnh trên popup
      this.updateTranscriptDisplay(cmd.raw, cmd);

      // 1. Trường hợp áp dụng cho CẢ LỚP
      if (cmd.isClassWide) {
        const actualPoints = cmd.isNegative ? -cmd.points : cmd.points;
        const reason = cmd.isNegative ? 'Nhắc nhở chung cả lớp' : 'Cả lớp cùng chăm ngoan';
        const icon = cmd.isNegative ? '⚠️' : '⭐';

        // Luôn phát âm thanh chuông hiệu ứng tức thì
        if (window.soundFx) {
          if (cmd.isNegative && typeof window.soundFx.playPenalty === 'function') {
            window.soundFx.playPenalty();
          } else if (typeof window.soundFx.playStar === 'function') {
            window.soundFx.playStar();
          }
        }

        students.forEach(s => {
          window.StorageManager.addPointsToStudent(s.id, actualPoints, reason, icon);
        });

        if (typeof window.refreshData === 'function') window.refreshData();

        const feedback = cmd.isNegative 
          ? `Đã nhắc nhở trừ ${cmd.points} sao của cả lớp.` 
          : `Đã cộng ${cmd.points} sao cho cả lớp cùng chăm ngoan!`;

        this.speakFeedback(feedback);
        this.showStatusToast(`🎙️ <strong>Cả Lớp</strong>: ${cmd.isNegative ? '-' : '+'}${cmd.points} ⭐ (${reason})`, '🌟');
        return;
      }

      // 2. Trường hợp áp dụng cho MỘT HỌC SINH
      const student = cmd.student;
      if (!student) {
        if (window.soundFx && typeof window.soundFx.playPenalty === 'function') {
          window.soundFx.playPenalty();
        }
        const msg = `Không tìm thấy học sinh trong câu nói: "${cmd.raw}". Cô hãy đọc rõ theo cú pháp: "Cộng [Tên] [Số điểm]" hoặc "Trừ [Tên] [Số điểm]".`;
        this.showStatusToast(msg, '❓');
        this.speakFeedback('Không tìm thấy học sinh. Cô vui lòng đọc lại nhé.');
        return;
      }

      const actualPoints = cmd.isNegative ? -cmd.points : cmd.points;
      const icon = cmd.isNegative ? '⚠️' : '⭐';

      // Tìm thẻ học sinh trên màn hình để tạo hiệu ứng sao bay
      const studentEl = document.querySelector(`.student-card[data-id="${student.id}"], [data-id="${student.id}"]`);

      // Luôn phát âm thanh chuông Ting Ting hoặc Tiếng Nhắc nhở lập tức
      if (window.soundFx) {
        if (cmd.isNegative && typeof window.soundFx.playPenalty === 'function') {
          window.soundFx.playPenalty();
        } else if (typeof window.soundFx.playStar === 'function') {
          window.soundFx.playStar();
        }
      }

      if (typeof window.applyStudentPoints === 'function') {
        // skipConfirm = true vì giáo viên đã trực tiếp ra lệnh bằng giọng nói
        window.applyStudentPoints(student.id, actualPoints, cmd.reason, icon, studentEl, true);
      } else {
        const res = window.StorageManager.addPointsToStudent(student.id, actualPoints, cmd.reason, icon);
        if (typeof window.refreshData === 'function') window.refreshData(res ? res.data : null);
        this.showStatusToast(`🎙️ Bé <strong>${student.name}</strong>: ${cmd.isNegative ? '-' : '+'}${cmd.points} ⭐ (${cmd.reason})`, cmd.isNegative ? '⚠️' : '🌟');
      }

      // Phản hồi giọng nói trợ lý AI sau khi chuông reo (trì hoãn 320ms để nghe rõ cả tiếng chuông lẫn giọng nói)
      const feedbackText = cmd.isNegative 
        ? `Đã trừ ${cmd.points} sao của bạn ${student.name}!`
        : `Đã cộng ${cmd.points} sao cho bạn ${student.name}!`;

      setTimeout(() => {
        this.speakFeedback(feedbackText);
      }, 320);
    }

    // Phát âm thanh phản hồi giọng nói (Ưu tiên Google Cloud TTS Tiếng Việt, dự phòng WebSpeech)
    speakFeedback(text) {
      if (!text) return;
      const cleanText = text.replace(/[!⭐⚠️🎙️✨🎉]/g, '').trim();

      // 1. Thử phát qua Google Translate TTS (Audio MP3 trực tiếp - Giọng Tiếng Việt chuẩn 100%)
      try {
        const url = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=' + encodeURIComponent(cleanText);
        const audio = document.createElement('audio');
        audio.referrerPolicy = 'no-referrer';
        audio.src = url;
        audio.playbackRate = 1.05;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn('Google TTS audio play blocked/failed, trying Web Speech Synthesis:', err);
            this.fallbackWebSpeech(cleanText);
          });
        }
      } catch (e) {
        this.fallbackWebSpeech(cleanText);
      }
    }

    fallbackWebSpeech(text) {
      if (!this.synth) return;
      try {
        const voices = this.synth.getVoices() || [];
        // CHỈ cho phép phát bằng WebSpeech nếu tìm thấy giọng Tiếng Việt thực sự
        const viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang === 'vi' || (v.lang && v.lang.startsWith('vi')));
        
        // Tuyệt đối không dùng giọng Tiếng Anh (như Microsoft David) để đọc Tiếng Việt
        if (!viVoice) {
          console.warn('Thiết bị không có giọng tiếng Việt SAPI, bỏ qua giọng tiếng Anh để không bị đọc sai.');
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.05;
        utterance.pitch = 1.05;
        utterance.voice = viVoice;

        this.synth.speak(utterance);
      } catch (e) {
        console.warn('Fallback WebSpeech error:', e);
      }
    }

    // Cập nhật giao diện khi Micro Bật / Tắt
    updateUiState(isListening) {
      const btnHeader = document.getElementById('btnVoiceAssistant');
      const btnToolbar = document.getElementById('btnToolbarVoiceMic');
      const btnFloating = document.getElementById('floatingVoiceBtn');
      const liveBar = document.getElementById('floatingVoiceLiveBar');
      const liveText = document.getElementById('floatingVoiceLiveText');
      const modal = document.getElementById('voiceAssistantModal');
      const wave = document.getElementById('voiceWaveAnim');
      const statusText = document.getElementById('voiceStatusText');

      // 1. Nút trên Header
      if (btnHeader) {
        if (isListening) {
          btnHeader.classList.add('recording-active');
          btnHeader.innerHTML = `<span class="mic-pulse-dot">🔴</span> Đang Nghe...`;
        } else {
          btnHeader.classList.remove('recording-active');
          btnHeader.innerHTML = `🎙️ Mic AI Chấm Điểm`;
        }
      }

      // 2. Nút ngay trên thanh tìm kiếm danh sách học sinh
      if (btnToolbar) {
        if (isListening) {
          btnToolbar.classList.add('listening');
          btnToolbar.innerHTML = `<span class="mic-pulse-dot">🔴</span> Đang Nghe...`;
        } else {
          btnToolbar.classList.remove('listening');
          btnToolbar.innerHTML = `🎙️ <span>Nói Chấm Điểm</span>`;
        }
      }

      // 3. Nút Micro nổi cố định ở góc màn hình
      if (btnFloating) {
        if (isListening) {
          btnFloating.classList.add('listening');
          btnFloating.innerHTML = `<span class="voice-fab-icon mic-pulse-dot">🔴</span> <span class="voice-fab-text">Đang nghe cô nói...</span>`;
        } else {
          btnFloating.classList.remove('listening');
          btnFloating.innerHTML = `<span class="voice-fab-icon">🎙️</span> <span class="voice-fab-text">Nói Chấm Điểm</span>`;
        }
      }

      // 4. Thanh trạng thái nổi thông minh Dynamic Island trên đầu màn hình
      if (liveBar) {
        if (isListening) {
          liveBar.classList.add('active');
          if (liveText) {
            liveText.innerHTML = `🔴 <strong>Đang lắng nghe...</strong> <em>(Nói: "Trừ Gia Hưng 5 điểm" hoặc "Cộng Minh An 10 điểm")</em>`;
          }
        } else {
          setTimeout(() => {
            if (!this.isListening && liveBar) {
              liveBar.classList.remove('active');
            }
          }, 1200);
        }
      }

      // 5. Cập nhật modal (nếu modal đang mở)
      if (modal && modal.classList.contains('active')) {
        if (isListening) {
          if (statusText) statusText.innerHTML = 'Cô hãy nói: <strong>"Cộng (hoặc Trừ) + Tên học sinh + Số điểm"</strong>...';
          if (wave) wave.style.display = 'flex';
        } else {
          if (wave) wave.style.display = 'none';
        }
      }
    }

    updateTranscriptDisplay(rawText, parsedCmd = null) {
      const transcriptEl = document.getElementById('voiceTranscriptResult');
      const liveBar = document.getElementById('floatingVoiceLiveBar');
      const liveText = document.getElementById('floatingVoiceLiveText');

      if (parsedCmd && (parsedCmd.student || parsedCmd.isClassWide)) {
        const actionBadge = parsedCmd.isNegative 
          ? `<span style="background: #FEE2E2; color: #DC2626; padding: 2px 8px; border-radius: 8px; font-weight: 800;">[-] TRỪ ${parsedCmd.points} ⭐</span>`
          : `<span style="background: #DCFCE7; color: #16A34A; padding: 2px 8px; border-radius: 8px; font-weight: 800;">[+] CỘNG ${parsedCmd.points} ⭐</span>`;
        const name = parsedCmd.isClassWide ? 'Cả Lớp' : parsedCmd.student.name;

        // Cập nhật trên modal (nếu mở)
        if (transcriptEl) {
          transcriptEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
              <div style="font-size: 13px; color: #64748B;">🎙️ Nghe được: <em>"${rawText}"</em></div>
              <div style="font-size: 15px; font-weight: 800; color: #1E293B; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
                ${actionBadge} <span>cho bé: <strong style="color: #6D28D9;">${name}</strong></span>
              </div>
            </div>
          `;
        }

        // Cập nhật trên thanh trạng thái nổi Dynamic Island
        if (liveBar && liveText) {
          liveBar.classList.add('active');
          liveText.innerHTML = `✨ <strong>Đã nhận diện:</strong> ${actionBadge} cho bé <strong>${name}</strong>`;
          setTimeout(() => {
            if (liveBar) liveBar.classList.remove('active');
          }, 3200);
        }
      } else {
        if (transcriptEl) transcriptEl.innerHTML = `💬 <em>"${rawText}"</em>`;
        if (liveBar && liveText) {
          liveBar.classList.add('active');
          liveText.innerHTML = `💬 <em>"${rawText}"</em> (Chưa rõ tên bé)`;
          setTimeout(() => {
            if (liveBar) liveBar.classList.remove('active');
          }, 2500);
        }
      }
    }

    showStatusToast(msg, icon = '🎙️') {
      if (typeof window.showSyncToast === 'function') {
        window.showSyncToast(msg, icon);
      } else {
        const container = document.getElementById('liveSyncToastContainer');
        if (container) {
          const toast = document.createElement('div');
          toast.className = 'live-sync-toast';
          toast.innerHTML = `
            <span style="font-size: 26px;">${icon}</span>
            <div>${msg}</div>
          `;
          container.appendChild(toast);

          setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
          }, 4500);
        }
      }
    }
  }

  // Khởi tạo và gắn vào window
  window.VoiceAssistant = new VoiceAssistant();

  // Khởi tạo các nút bấm giao diện khi DOM sẵn sàng
  document.addEventListener('DOMContentLoaded', () => {
    function triggerMicAction() {
      // 1. Mở khóa âm thanh Web Audio ngay trong tương tác bấm của người dùng
      if (window.soundFx) {
        if (typeof window.soundFx.unmute === 'function') window.soundFx.unmute();
        if (typeof window.soundFx.playMicBeep === 'function') window.soundFx.playMicBeep();
      }
      // 2. Chuyển đổi trạng thái nghe của Micro
      window.VoiceAssistant.toggleListening();
    }

    // 1. Nút trên Header
    const btnVoice = document.getElementById('btnVoiceAssistant');
    if (btnVoice) {
      btnVoice.addEventListener('click', triggerMicAction);
    }

    // 2. Nút ngay trên thanh tìm kiếm giao diện chính
    const btnToolbar = document.getElementById('btnToolbarVoiceMic');
    if (btnToolbar) {
      btnToolbar.addEventListener('click', triggerMicAction);
    }

    // 3. Nút Micro nổi cố định ở góc dưới màn hình
    const btnFloating = document.getElementById('floatingVoiceBtn');
    if (btnFloating) {
      btnFloating.addEventListener('click', triggerMicAction);
    }

    // Nút trong modal
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
      btnToggleInModal.addEventListener('click', triggerMicAction);
    }
  });

})();
