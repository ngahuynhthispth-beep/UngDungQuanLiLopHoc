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
            errMsg = 'Trình duyệt chưa được cấp quyền dùng Micro. Vui lòng cho phép quyền Micro để sử dụng.';
          } else if (event.error === 'no-speech') {
            errMsg = 'Chưa nghe thấy cô nói gì. Hãy nhấn Micro và thử nói lại nhé!';
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
        const msg = `Không tìm thấy học sinh trong câu nói: "${cmd.raw}". Cô hãy đọc rõ theo cú pháp: "Trừ Gia Hưng 5 điểm" hoặc "Cộng Minh An 10 điểm".`;
        this.showStatusToast(msg, '❓');
        this.speakFeedback('Không tìm thấy học sinh. Cô vui lòng đọc lại nhé.');
        return;
      }

      const actualPoints = cmd.isNegative ? -cmd.points : cmd.points;
      const icon = cmd.isNegative ? '⚠️' : '⭐';

      if (typeof window.applyStudentPoints === 'function') {
        // skipConfirm = true vì giáo viên đã trực tiếp ra lệnh bằng giọng nói
        window.applyStudentPoints(student.id, actualPoints, cmd.reason, icon, null, true);
      } else {
        window.StorageManager.addPointsToStudent(student.id, actualPoints, cmd.reason, icon);
        if (typeof window.refreshData === 'function') window.refreshData();
      }

      // Phản hồi giọng nói (TTS) & Thông báo màn hình
      const feedbackText = cmd.isNegative 
        ? `Đã trừ ${cmd.points} sao của bạn ${student.name}!`
        : `Đã cộng ${cmd.points} sao cho bạn ${student.name}!`;

      this.speakFeedback(feedbackText);
      this.showStatusToast(`🎙️ <strong>${student.name}</strong>: ${cmd.isNegative ? '-' : '+'}${cmd.points} ⭐ (${cmd.reason})`, cmd.isNegative ? '⚠️' : '🌟');
    }

    // Phát âm thanh phản hồi giọng nói (Text-To-Speech)
    speakFeedback(text) {
      if (!this.synth) return;
      try {
        this.synth.cancel(); // Dừng câu đang đọc dở nếu có
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.08; // Tốc độ nhanh nhẹn tự nhiên
        utterance.pitch = 1.1;

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
          if (statusText) statusText.innerHTML = 'Cô hãy nói: <strong>"Cộng (hoặc Trừ) + Tên học sinh + Số điểm"</strong>...';
          if (wave) wave.style.display = 'flex';
        } else {
          if (wave) wave.style.display = 'none';
        }
      }
    }

    updateTranscriptDisplay(rawText, parsedCmd = null) {
      const transcriptEl = document.getElementById('voiceTranscriptResult');
      if (transcriptEl) {
        if (parsedCmd && (parsedCmd.student || parsedCmd.isClassWide)) {
          const actionBadge = parsedCmd.isNegative 
            ? `<span style="background: #FEE2E2; color: #DC2626; padding: 2px 8px; border-radius: 8px; font-weight: 800;">[-] TRỪ ${parsedCmd.points} ⭐</span>`
            : `<span style="background: #DCFCE7; color: #16A34A; padding: 2px 8px; border-radius: 8px; font-weight: 800;">[+] CỘNG ${parsedCmd.points} ⭐</span>`;
          const name = parsedCmd.isClassWide ? 'Cả Lớp' : parsedCmd.student.name;

          transcriptEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
              <div style="font-size: 13px; color: #64748B;">🎙️ Nghe được: <em>"${rawText}"</em></div>
              <div style="font-size: 15px; font-weight: 800; color: #1E293B; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
                ${actionBadge} <span>cho bé: <strong style="color: #6D28D9;">${name}</strong></span>
              </div>
            </div>
          `;
        } else {
          transcriptEl.innerHTML = `💬 <em>"${rawText}"</em>`;
        }
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
