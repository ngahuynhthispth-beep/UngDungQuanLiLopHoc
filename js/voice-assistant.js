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

    // Loại bỏ ký tự đặc biệt ở đầu câu mà Google STT có thể chèn vào (dấu gạch ngang, ba chấm, ngoặc...)
    text = text.replace(/^[-–—.…,:;!?~"'\s]+/, '');

    // Biến thể đồng âm Google STT tiếng Việt thường nghe nhầm từ "Trừ":
    // "Trần", "Từ", "Trực", "Chừ", "Chữ", "Trú", "Trúng", "Trả", "Chờ", "Chớ", "Chở", "Chứ", "Chức", "Chưa", "Chửa", "Trợ", "Trở", "Trớ", "Trù", "Trùm", "Trùng", "Thử", "Thứ", "Thừ"
    const truVariants = 'trần|từ|trực|chừ|chữ|trú|trúng|trả|chờ|chớ|chở|chứ|chức|chưa|chửa|trợ|trở|trớ|trù|trùm|trùng|thử|thứ|thừ';

    // 1. Chuẩn hóa đại từ + từ trừ (vd: "Cô trừ", "Cô chờ", "Cô trần", "Em trừ"...) -> thay bằng "Trừ "
    text = text.replace(new RegExp('^(?:cô|thầy|em|tôi|bạn|xin|hãy|vui lòng|làm ơn)\\s+(?:' + truVariants + '|trừ|bớt|phạt)(?:\\s+|$)', 'iu'), 'Trừ ');

    // 2. Chuẩn hóa từ trừ đứng đầu câu (vd: "Trần", "Chờ", "Chớ", "Chứ", "Từ", "Trực", "Thử", "Bớt", "Phạt"...) -> thay bằng "Trừ "
    text = text.replace(new RegExp('^(?:' + truVariants + '|trừ|bớt|phạt)(?:\\s+|$)', 'iu'), 'Trừ ');

    // 3. Chuẩn hóa từ cộng đứng đầu câu hoặc sau đại từ
    text = text.replace(/^(?:cô|thầy|em|tôi|bạn|xin|hãy|vui lòng|làm ơn)\s+(?:cộng|khen|thưởng|tặng)(?:\s+|$)/iu, 'Cộng ');
    text = text.replace(/^(?:cổng|cọng|chọn|cộng)(?:\s+|$)/iu, 'Cộng ');
    // Nếu bắt đầu bằng "Công" nhưng từ tiếp theo KHÔNG PHẢI là "Hậu" (học sinh Công Hậu) -> thực chất là "Cộng"
    text = text.replace(/^(?:công)\s+(?!hậu(?:\s+|$))/iu, 'Cộng ');

    // 4. Chuẩn hóa "... [từ trừ] + [tên học sinh]" ở bất kỳ vị trí nào trong câu
    if (Array.isArray(students)) {
      students.forEach(s => {
        const sClean = removeVietnameseTones(s.name);
        const reg = new RegExp('(?:^|[\\s,;!?])(?:' + truVariants + '|trừ|bớt|phạt)\\s+(?:điểm\\s+)?(?:của\\s+|cho\\s+|bạn\\s+|bé\\s+|em\\s+)?(' + s.name + '|' + sClean + ')(?=[\\s,;!?]|$)', 'giu');
        text = text.replace(reg, ' Trừ $1 ');
      });
    }

    return text.trim().replace(/\s+/g, ' ');
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

  // Nối danh sách tên học sinh theo ngữ pháp tiếng Việt tự nhiên:
  // 1 bé: "Minh An"
  // 2 bé: "Minh An và Bảo Hân"
  // 3+ bé: "Minh An, Bảo Hân và Gia Hưng"
  function formatStudentNamesList(studentList) {
    if (!studentList || !studentList.length) return '';
    const names = studentList.map(s => (s && s.name ? s.name.trim() : String(s)));
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} và ${names[1]}`;
    return `${names.slice(0, -1).join(', ')} và ${names[names.length - 1]}`;
  }

  class VoiceAssistant {
    constructor() {
      this.recognition = null;
      this.isListening = false;
      this.isSupported = false;
      this.synth = window.speechSynthesis || null;
      this.cachedVoices = [];
      this.audioPlayer = null;
      this.lastTranscript = '';

      // Động cơ nhận diện: 'webspeech' (mặc định) hoặc 'whisper' (Groq Whisper AI)
      this.engine = localStorage.getItem('vltk_voice_engine') || 'webspeech';
      this.groqApiKey = localStorage.getItem('vltk_groq_api_key') || '';
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.isWhisperRecording = false;

      // Quản lý streaming văn bản thời gian thực và debounce chốt câu
      this.speechFinalDebounceTimer = null;
      this.currentInterimText = '';

      this.loadVoices();
      if (this.synth && this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }

      this.init();
    }

    loadVoices() {
      if (!this.synth) return;
      try {
        const v = this.synth.getVoices();
        if (v && v.length) {
          this.cachedVoices = v;
        }
      } catch (e) {}
    }

    getAudioPlayer() {
      if (!this.audioPlayer) {
        this.audioPlayer = document.getElementById('voiceFeedbackAudio');
      }
      if (!this.audioPlayer) {
        this.audioPlayer = document.createElement('audio');
        this.audioPlayer.id = 'voiceFeedbackAudio';
        this.audioPlayer.setAttribute('referrerpolicy', 'no-referrer');
        this.audioPlayer.style.display = 'none';
        this.audioPlayer.preload = 'auto';
        document.body.appendChild(this.audioPlayer);
      }
      return this.audioPlayer;
    }

    // Mở khóa âm thanh Web Audio và thẻ Audio TTS ngay khi người dùng chạm/bấm Micro
    unlockAudio() {
      if (window.soundFx) {
        if (typeof window.soundFx.unmute === 'function') window.soundFx.unmute();
        if (typeof window.soundFx.init === 'function') window.soundFx.init();
      }
      const player = this.getAudioPlayer();
      if (player) {
        player.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const p = player.play();
        if (p !== undefined) {
          p.then(() => player.pause()).catch(() => {});
        }
      }
      this.loadVoices();
    }

    setEngine(engine) {
      this.engine = engine;
      localStorage.setItem('vltk_voice_engine', engine);
      this.updateEngineUi();
    }

    setGroqApiKey(key) {
      this.groqApiKey = (key || '').trim();
      localStorage.setItem('vltk_groq_api_key', this.groqApiKey);
      this.updateEngineUi();
    }

    updateEngineUi() {
      const btnWebSpeech = document.getElementById('btnEngineWebSpeech');
      const btnWhisper = document.getElementById('btnEngineWhisper');
      const statusBadge = document.getElementById('voiceEngineStatusBadge');
      const configArea = document.getElementById('whisperConfigArea');
      const keyStatus = document.getElementById('whisperKeyStatus');
      const inputKey = document.getElementById('inputGroqApiKey');

      const isWhisper = (this.engine === 'whisper');

      if (btnWebSpeech && btnWhisper) {
        if (isWhisper) {
          btnWhisper.style.background = '#7C3AED';
          btnWhisper.style.color = '#FFFFFF';
          btnWhisper.style.borderColor = '#7C3AED';
          btnWebSpeech.style.background = '#FFFFFF';
          btnWebSpeech.style.color = '#475569';
          btnWebSpeech.style.borderColor = '#CBD5E1';
        } else {
          btnWebSpeech.style.background = '#8B5CF6';
          btnWebSpeech.style.color = '#FFFFFF';
          btnWebSpeech.style.borderColor = '#8B5CF6';
          btnWhisper.style.background = '#FFFFFF';
          btnWhisper.style.color = '#475569';
          btnWhisper.style.borderColor = '#CBD5E1';
        }
      }

      if (statusBadge) {
        if (isWhisper) {
          statusBadge.innerHTML = this.groqApiKey ? '🟣 Groq Whisper (Sẵn sàng)' : '⚠️ Whisper (Chưa nhập Key)';
          statusBadge.style.background = this.groqApiKey ? '#F3E8FF' : '#FEF3C7';
          statusBadge.style.color = this.groqApiKey ? '#6B21A8' : '#B45309';
        } else {
          statusBadge.innerHTML = '🟢 Web Speech (Tối ưu)';
          statusBadge.style.background = '#DCFCE7';
          statusBadge.style.color = '#15803D';
        }
      }

      if (configArea) {
        configArea.style.display = isWhisper ? 'block' : 'none';
      }

      if (keyStatus) {
        if (this.groqApiKey) {
          keyStatus.innerHTML = '✅ Đã lưu Key (' + this.groqApiKey.substring(0, 7) + '...)';
          keyStatus.style.color = '#15803D';
        } else {
          keyStatus.innerHTML = '⚠️ Chưa có Key';
          keyStatus.style.color = '#B45309';
        }
      }

      if (inputKey && !inputKey.value && this.groqApiKey) {
        inputKey.value = this.groqApiKey;
      }
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
        this.recognition.continuous = true; // Bật continuous để không bị Chrome tự ngắt giữa chừng
        this.recognition.interimResults = true; // Bật stream thời gian thực để cô thấy chữ ngay khi nói
        this.recognition.maxAlternatives = 5; // Lấy nhiều phương án để bắt lỗi STT tốt nhất

        this.recognition.onstart = () => {
          this.isListening = true;
          this.updateUiState(true, 'webspeech');
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.updateUiState(false, 'webspeech');
        };

        this.recognition.onerror = (event) => {
          console.warn('Lỗi nhận diện Web Speech:', event.error);
          if (event.error === 'no-speech') {
            // Không phát chuông lỗi khi chỉ là im lặng tạm thời
            return;
          }
          this.isListening = false;
          this.updateUiState(false, 'webspeech');
          let errMsg = 'Không nhận diện được giọng nói.';
          if (event.error === 'not-allowed') {
            errMsg = 'Trình duyệt chưa được cấp quyền dùng Micro. Cô hãy bấm vào biểu tượng ổ khóa/camera trên thanh địa chỉ để BẬT Micro nhé!';
          } else if (event.error === 'network') {
            errMsg = 'Mạng internet đang chập chờn. Cô hãy thử bấm lại hoặc chuyển sang Whisper AI!';
          }
          this.showStatusToast(errMsg, '⚠️');
        };

        this.recognition.onresult = (event) => {
          let interimText = '';
          let finalSegment = '';
          const alternatives = [];

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              finalSegment += res[0].transcript;
              for (let a = 0; a < res.length; a++) {
                if (res[a] && res[a].transcript) {
                  alternatives.push(res[a].transcript.trim());
                }
              }
            } else {
              interimText += res[0].transcript;
            }
          }

          // Cập nhật streaming thời gian thực lên màn hình
          if (interimText) {
            this.updateInterimDisplay(interimText);
          }

          if (finalSegment) {
            clearTimeout(this.speechFinalDebounceTimer);
            // Tự động chốt lệnh sau khi cô dứt câu 350ms
            this.speechFinalDebounceTimer = setTimeout(() => {
              this.stop();
              this.processCommand(finalSegment.trim(), alternatives);
            }, 350);
          }
        };
      } catch (e) {
        console.error('Không thể khởi tạo SpeechRecognition:', e);
        this.isSupported = false;
      }
    }

    toggleListening() {
      this.unlockAudio();
      if (this.isListening) {
        this.stop();
      } else {
        this.start();
      }
    }

    start() {
      this.unlockAudio();
      if (this.engine === 'whisper') {
        if (!this.groqApiKey) {
          this.showStatusToast('Cô chưa nhập Groq API Key. Đang mở hộp cài đặt...', '⚠️');
          const modal = document.getElementById('voiceAssistantModal');
          if (modal) modal.classList.add('active');
          this.setEngine('whisper');
          return;
        }
        this.startWhisper();
      } else {
        this.startWebSpeech();
      }
    }

    stop() {
      if (this.engine === 'whisper') {
        this.stopWhisper();
      } else {
        this.stopWebSpeech();
      }
    }

    startWebSpeech() {
      if (!this.recognition) return;
      try {
        this.currentInterimText = '';
        this.recognition.start();
      } catch (e) {
        console.warn('Lỗi start recognition:', e);
      }
    }

    stopWebSpeech() {
      if (!this.recognition) return;
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Lỗi stop recognition:', e);
      }
    }

    // --- GHI ÂM VÀ NHẬN DIỆN VỚI GROQ WHISPER AI SIÊU NHẠY ---
    async startWhisper() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        this.audioChunks = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

        this.mediaRecorder = new MediaRecorder(stream, { mimeType });
        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };

        this.mediaRecorder.onstart = () => {
          this.isListening = true;
          this.isWhisperRecording = true;
          this.updateUiState(true, 'whisper');
        };

        this.mediaRecorder.onstop = async () => {
          this.isListening = false;
          this.isWhisperRecording = false;
          this.updateUiState(false, 'whisper');

          // Dừng track mic
          stream.getTracks().forEach(t => t.stop());

          if (this.audioChunks.length === 0) return;
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          this.sendAudioToGroqWhisper(audioBlob);
        };

        this.mediaRecorder.start(100);
      } catch (err) {
        console.error('Lỗi khởi tạo Microphone Whisper:', err);
        this.showStatusToast('Không thể mở Micro: ' + (err.message || 'Chưa cấp quyền'), '⚠️');
        this.isListening = false;
        this.updateUiState(false, 'whisper');
      }
    }

    stopWhisper() {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        try {
          this.mediaRecorder.stop();
        } catch (e) {}
      }
    }

    async sendAudioToGroqWhisper(audioBlob) {
      if (!audioBlob || audioBlob.size < 800) {
        this.showStatusToast('Âm thanh quá ngắn. Hãy giữ Micro và nói rõ câu lệnh nhé!', '⚠️');
        return;
      }

      const liveBar = document.getElementById('floatingVoiceLiveBar');
      const liveText = document.getElementById('floatingVoiceLiveText');
      if (liveBar && liveText) {
        liveBar.classList.add('active');
        liveText.innerHTML = `⚡ <strong>Whisper AI</strong> đang nhận diện siêu tốc...`;
      }

      try {
        const data = (window.StorageManager && window.StorageManager.loadData()) || {};
        const students = data.students || [];
        const studentNames = students.map(s => s.name).join(', ');

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'vi');
        formData.append('temperature', '0.0');
        // Nạp toàn bộ danh sách 36 tên học sinh lớp 1/8 làm prompt mồi ngữ cảnh
        formData.append('prompt', `Danh sách học sinh Lớp 1/8 Trường Tiểu La: ${studentNames}. Lệnh: Cộng, Trừ, Khen thưởng, sao, điểm.`);
        formData.append('response_format', 'json');

        const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`
          },
          body: formData
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.error ? errJson.error.message : `Lỗi HTTP ${response.status}`);
        }

        const resJson = await response.json();
        const transcribedText = (resJson && resJson.text) ? resJson.text.trim() : '';

        if (!transcribedText) {
          this.showStatusToast('Whisper AI chưa nghe rõ. Cô hãy thử lại nhé!', '⚠️');
          return;
        }

        this.processCommand(transcribedText);
      } catch (err) {
        console.error('Groq Whisper API error:', err);
        this.showStatusToast(`Lỗi Whisper AI: ${err.message}`, '⚠️');
        if (liveBar) liveBar.classList.remove('active');
      }
    }

    updateInterimDisplay(interimText) {
      const transcriptEl = document.getElementById('voiceTranscriptResult');
      const liveBar = document.getElementById('floatingVoiceLiveBar');
      const liveText = document.getElementById('floatingVoiceLiveText');

      if (transcriptEl) {
        transcriptEl.innerHTML = `<span style="color: #6D28D9; font-weight: 700;">🎙️ "${interimText}..."</span>`;
      }
      if (liveBar && liveText) {
        liveBar.classList.add('active');
        liveText.innerHTML = `🔴 <strong>Đang nghe:</strong> <em>"${interimText}..."</em>`;
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
        const hasTarget = (parsed.students && parsed.students.length > 0) || parsed.student || parsed.isClassWide || parsed.targetGroupId;
        if (hasTarget) {
          // Ưu tiên phương án nhận diện có hành động rõ ràng (Cộng hoặc Trừ)
          if (parsed.actionFound) {
            bestCommand = parsed;
            break;
          }
          if (!bestCommand) {
            bestCommand = parsed;
          }
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

      // 1. Kiểm tra lệnh cho CẢ LỚP hoặc CHO TỔ
      const isClassWide = clean.includes('ca lop') || clean.includes('toan lop') || clean.includes('tat ca lop') || clean.includes('tat ca cac ban');

      // Kiểm tra lệnh theo TỔ (ví dụ: "cộng tổ 1 5 điểm", "trừ tổ 2 10 điểm", "tổ 3 cộng 5 sao")
      let targetGroupId = null;
      const groupMatch = clean.match(/\b(?:to|nhom)\s+([1-4])\b/i);
      if (groupMatch) {
        targetGroupId = parseInt(groupMatch[1], 10);
      }

      // 2. Xác định hành động (Cộng hay Trừ)
      let isNegative = false;
      let actionFound = false;

      const firstWord = clean.split(' ')[0];

      // Nhóm từ khoá chỉ hành động TRỪ (bao gồm cả các từ nghe nhầm phổ biến của Google STT)
      const negativeWords = [
        'tru', 'tran', 'tu', 'truc', 'chu', 'cho', 'phat', 'nhac nho', 'nhac', 'bot', 'rut', 'ha',
        'mat trat tu', 'noi chuyen', 'vi pham', 'loi', 'chua ngoan', 'quay cop', 'khong lam bai',
        'chua lam bai', 'quen vo', 'quen sach'
      ];

      // Ưu tiên 1: Kiểm tra hành động Trừ
      if (['tru', 'bot', 'phat', 'nhac', 'rut', 'ha'].includes(firstWord)) {
        isNegative = true;
        actionFound = true;
      } else {
        for (const nw of negativeWords) {
          if (new RegExp('(?:^|[\\s,;!?])' + nw + '(?=[\\s,;!?]|$)', 'i').test(clean)) {
            isNegative = true;
            actionFound = true;
            break;
          }
        }
      }

      // Ưu tiên 2: Nếu không phải hành động Trừ, kiểm tra nhóm CỘNG
      if (!actionFound) {
        const positiveWords = [
          'cong', 'khen', 'thuong', 'tang', 'them', 'cham ngoan', 'phat bieu', 'doc to', 'viet dep',
          'chu dep', 'lam dung', 'lam nhanh', 'tich cuc', 'gioi', 'xuat sac'
        ];

        if (['cong', 'khen', 'thuong', 'tang', 'them', 'cham'].includes(firstWord)) {
          isNegative = false;
          actionFound = true;
        } else {
          for (const pw of positiveWords) {
            if (new RegExp('(?:^|[\\s,;!?])' + pw + '(?=[\\s,;!?]|$)', 'i').test(clean)) {
              isNegative = false;
              actionFound = true;
              break;
            }
          }
        }
      }

      // 3. Trích xuất số điểm
      let points = parseVietnameseNumber(normalized);
      if (!points || points <= 0 || points > 100) {
        points = isNegative ? 2 : 5; // Mặc định: trừ 2 hoặc cộng 5 nếu cô không đọc số điểm
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

      // 5. Tìm danh sách học sinh khớp trong câu nói (nếu không phải lệnh cho cả lớp hay cho tổ)
      const matchedStudents = (isClassWide || targetGroupId) ? [] : this.findAllStudentMatches(clean, students);
      const student = matchedStudents.length > 0 ? matchedStudents[0] : null;

      return {
        raw,
        normalized,
        isClassWide,
        targetGroupId,
        isNegative,
        actionFound,
        actionUnknown: !actionFound,
        points,
        reason,
        student,
        students: matchedStudents
      };
    }

    // Tìm kiếm toàn bộ học sinh được nhắc tên trong câu nói (hỗ trợ gọi nhiều bạn cùng lúc)
    findAllStudentMatches(cleanTranscript, students) {
      if (!students || students.length === 0 || !cleanTranscript) return [];

      // Sắp xếp theo độ dài họ tên giảm dần (để "Phạm Bảo Hân" được ưu tiên trước "Bảo Hân")
      const sortedStudents = [...students].sort((a, b) => b.name.length - a.name.length);

      let workingText = ' ' + cleanTranscript.toLowerCase() + ' ';
      const matchedWithIndex = [];
      const matchedIds = new Set();

      // Bước 1: Khớp chính xác cả họ tên (vd: 'pham bao han', 'minh an', 'gia hung', 'quoc an')
      for (const s of sortedStudents) {
        const sClean = removeVietnameseTones(s.name);
        if (!sClean) continue;
        const reg = new RegExp('\\b' + sClean + '\\b', 'i');
        const match = workingText.match(reg);
        if (match) {
          if (!matchedIds.has(s.id)) {
            matchedWithIndex.push({ student: s, index: match.index });
            matchedIds.add(s.id);
          }
          workingText = workingText.replace(reg, ' ___ ');
        }
      }

      // Bước 2: Khớp 2 từ cuối nếu tên có 3 từ trở lên (vd: 'Bảo Hân' trong 'Phạm Bảo Hân')
      // Chỉ khớp nếu 2 từ cuối này KHÔNG trùng với tên đầy đủ của bạn khác đã có
      for (const s of sortedStudents) {
        if (matchedIds.has(s.id)) continue;
        const parts = removeVietnameseTones(s.name).split(' ');
        if (parts.length >= 3) {
          const twoLast = parts.slice(-2).join(' ');
          const isConflict = students.some(other => other.id !== s.id && removeVietnameseTones(other.name) === twoLast);
          if (!isConflict) {
            const reg = new RegExp('\\b' + twoLast + '\\b', 'i');
            const match = workingText.match(reg);
            if (match) {
              matchedWithIndex.push({ student: s, index: match.index });
              matchedIds.add(s.id);
              workingText = workingText.replace(reg, ' ___ ');
            }
          }
        }
      }

      // Bước 3: Khớp tên gọi đơn duy nhất trong lớp (nếu trong lớp chỉ có 1 bạn mang tên này)
      // Ví dụ: chỉ có 1 bạn tên Hưng (Gia Hưng), 1 bạn tên Yến (Hải Yến), 1 bạn tên Thảo (Hương Thảo)
      const stopwords = new Set(['di', 'cho', 'va', 'ra', 'co', 'em', 'ban', 'con', 'lop', 'to', 'cac', 'nhe', 'nha', 'mot', 'hai', 'ba', 'bon', 'nam', 'sau', 'bay', 'tam', 'chin', 'muoi']);
      const lastNameCounts = {};
      students.forEach(s => {
        const parts = removeVietnameseTones(s.name).split(' ');
        const l = parts[parts.length - 1];
        if (l) lastNameCounts[l] = (lastNameCounts[l] || 0) + 1;
      });

      for (const s of sortedStudents) {
        if (matchedIds.has(s.id)) continue;
        const parts = removeVietnameseTones(s.name).split(' ');
        const l = parts[parts.length - 1];
        if (!l || stopwords.has(l)) continue;

        if (lastNameCounts[l] === 1) {
          const reg = new RegExp('\\b' + l + '\\b', 'i');
          const match = workingText.match(reg);
          if (match) {
            matchedWithIndex.push({ student: s, index: match.index });
            matchedIds.add(s.id);
            workingText = workingText.replace(reg, ' ___ ');
          }
        }
      }

      // Sắp xếp lại danh sách học sinh theo đúng thứ tự xuất hiện trong câu nói của giáo viên
      matchedWithIndex.sort((a, b) => a.index - b.index);
      return matchedWithIndex.map(m => m.student);
    }

    // Tìm kiếm học sinh khớp nhất từ câu nói (hàm tương thích ngược)
    findBestStudentMatch(cleanTranscript, students) {
      const matches = this.findAllStudentMatches(cleanTranscript, students);
      return matches.length > 0 ? matches[0] : null;
    }

    // Thực thi câu lệnh đã phân tích
    executeParsedCommand(cmd, students) {
      if (!cmd) return;

      // Hiển thị câu lệnh trên popup & Dynamic Island
      this.updateTranscriptDisplay(cmd.raw, cmd);

      // 0. Trường hợp KHÔNG XÁC ĐỊNH ĐƯỢC HÀNH ĐỘNG CỘNG HAY TRỪ
      // (Bảo vệ tuyệt đối: Tránh trường hợp máy nghe bập bõm rồi tự động cộng điểm nhầm)
      if (cmd.actionUnknown) {
        if (window.soundFx && typeof window.soundFx.playPenalty === 'function') {
          window.soundFx.playPenalty();
        }
        const msg = `Chưa rõ cô muốn CỘNG hay TRỪ điểm. Cô hãy đọc rõ: "Cộng [Tên]..." hoặc "Trừ [Tên]...". (Máy nghe được: "${cmd.raw}")`;
        this.showStatusToast(msg, '❓');
        setTimeout(() => {
          this.speakFeedback('Chưa rõ cộng hay trừ. Cô vui lòng đọc lại kèm từ Cộng hoặc Trừ nhé.');
        }, 400);
        return;
      }

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
          ? `Đã nhắc nhở trừ ${cmd.points} sao của cả lớp!` 
          : `Đã cộng ${cmd.points} sao cho cả lớp cùng chăm ngoan!`;

        setTimeout(() => {
          this.speakFeedback(feedback);
        }, 400);

        this.showStatusToast(`🎙️ <strong>Cả Lớp</strong>: ${cmd.isNegative ? '-' : '+'}${cmd.points} ⭐ (${reason})`, '🌟');
        return;
      }

      // 1.5. Trường hợp áp dụng cho TỔ (ví dụ: "Cộng tổ 1 5 điểm", "Trừ tổ 2 10 điểm")
      if (cmd.targetGroupId) {
        const actualPoints = cmd.isNegative ? -cmd.points : cmd.points;
        const icon = cmd.isNegative ? '⚠️' : '⭐';
        const reason = cmd.reason || (cmd.isNegative ? 'Nhắc nhở thi đua tổ' : 'Khen thưởng thi đua tổ');

        if (window.soundFx) {
          if (cmd.isNegative && typeof window.soundFx.playPenalty === 'function') {
            window.soundFx.playPenalty();
          } else if (typeof window.soundFx.playStar === 'function') {
            window.soundFx.playStar();
          }
        }

        const res = window.StorageManager.addPointsToGroup(cmd.targetGroupId, actualPoints, reason, icon);
        if (typeof window.refreshData === 'function') window.refreshData(res ? res.data : null);

        const groupName = (res && res.group && res.group.name) || `Tổ ${cmd.targetGroupId}`;
        const feedback = cmd.isNegative 
          ? `Đã trừ ${cmd.points} sao của ${groupName}!` 
          : `Đã cộng ${cmd.points} sao cho ${groupName}!`;

        setTimeout(() => {
          this.speakFeedback(feedback);
        }, 400);

        this.showStatusToast(`🎙️ <strong>${groupName}</strong>: ${cmd.isNegative ? '-' : '+'}${cmd.points} ⭐ (${reason})`, cmd.isNegative ? '⚠️' : '🌟');
        return;
      }

      // 2. Trường hợp áp dụng cho HỌC SINH (HỖ TRỢ 1 HOẶC NHIỀU BẠN CÙNG LÚC)
      const targetStudents = (cmd.students && cmd.students.length > 0) 
        ? cmd.students 
        : (cmd.student ? [cmd.student] : []);

      if (targetStudents.length === 0) {
        if (window.soundFx && typeof window.soundFx.playPenalty === 'function') {
          window.soundFx.playPenalty();
        }
        const msg = `Không tìm thấy học sinh trong câu nói: "${cmd.raw}". Cô hãy đọc rõ theo cú pháp: "Cộng [Tên] [Số điểm]" hoặc "Trừ [Tên] [Số điểm]".`;
        this.showStatusToast(msg, '❓');
        setTimeout(() => {
          this.speakFeedback('Không tìm thấy học sinh. Cô vui lòng đọc lại nhé.');
        }, 400);
        return;
      }

      const actualPoints = cmd.isNegative ? -cmd.points : cmd.points;
      const icon = cmd.isNegative ? '⚠️' : '⭐';
      const namesText = formatStudentNamesList(targetStudents);

      // Thực thi cộng / trừ điểm cho từng học sinh với độ trễ nhỏ để hiệu ứng sao bay và âm thanh diễn ra mượt mà
      targetStudents.forEach((student, idx) => {
        setTimeout(() => {
          const studentEl = document.querySelector(`.student-card[data-id="${student.id}"], [data-id="${student.id}"]`);

          if (typeof window.applyStudentPoints === 'function') {
            // skipConfirm = true vì giáo viên đã trực tiếp ra lệnh bằng giọng nói
            window.applyStudentPoints(student.id, actualPoints, cmd.reason, icon, studentEl, true);
          } else {
            if (window.soundFx) {
              if (cmd.isNegative && typeof window.soundFx.playPenalty === 'function') {
                window.soundFx.playPenalty();
              } else if (typeof window.soundFx.playStar === 'function') {
                window.soundFx.playStar();
              }
            }
            const res = window.StorageManager.addPointsToStudent(student.id, actualPoints, cmd.reason, icon);
            if (typeof window.refreshData === 'function') window.refreshData(res ? res.data : null);
          }
        }, idx * 140);
      });

      // Hiển thị thông báo Toast với danh sách học sinh
      const actionText = cmd.isNegative ? 'trừ' : 'cộng';
      const toastSubject = targetStudents.length > 1 ? `các bé <strong>${namesText}</strong>` : `bé <strong>${namesText}</strong>`;
      this.showStatusToast(`🎙️ Đã ${actionText} ${Math.abs(actualPoints)} ⭐ cho ${toastSubject} (${cmd.reason})`, cmd.isNegative ? '⚠️' : '🌟');

      // Phản hồi giọng nói trợ lý AI sau khi hoàn tất hiệu ứng (trì hoãn tương ứng số lượng bé để nghe rõ chuông và giọng nói)
      const feedbackText = cmd.isNegative 
        ? `Đã trừ ${cmd.points} sao của ${targetStudents.length > 1 ? 'các bạn' : 'bạn'} ${namesText}!`
        : `Đã cộng ${cmd.points} sao cho ${targetStudents.length > 1 ? 'các bạn' : 'bạn'} ${namesText}!`;

      const voiceDelay = Math.max(500, targetStudents.length * 140 + 250);
      setTimeout(() => {
        this.speakFeedback(feedbackText);
      }, voiceDelay);
    }

    // Phát âm thanh phản hồi giọng nói (Ưu tiên Google Cloud TTS Tiếng Việt, dự phòng WebSpeech)
    speakFeedback(text) {
      if (!text) return;
      const cleanText = text.replace(/[!⭐⚠️🎙️✨🎉]/g, '').trim();
      const player = this.getAudioPlayer();

      // Danh sách các nguồn TTS Tiếng Việt chuẩn
      const sources = [
        'https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=' + encodeURIComponent(cleanText),
        'https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=vi&client=gtx&q=' + encodeURIComponent(cleanText),
        'https://translate.google.com.vn/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=' + encodeURIComponent(cleanText)
      ];

      let idx = 0;
      let isPlaying = false;

      const playNextSource = () => {
        if (isPlaying) return;
        if (idx < sources.length) {
          const url = sources[idx++];
          player.src = url;
          player.playbackRate = 1.05;
          const p = player.play();
          if (p !== undefined) {
            p.then(() => {
              isPlaying = true;
            }).catch(err => {
              console.warn(`TTS source ${idx} lỗi:`, err);
              playNextSource();
            });
          }
        } else {
          // Fallback sang Web Speech Synthesis nếu không tải được audio online
          this.fallbackWebSpeech(cleanText);
        }
      };

      player.onerror = () => {
        if (!isPlaying) playNextSource();
      };

      playNextSource();
    }

    fallbackWebSpeech(text) {
      if (!this.synth) return;
      try {
        this.synth.cancel();
        const voices = (this.cachedVoices && this.cachedVoices.length) ? this.cachedVoices : (this.synth.getVoices() || []);
        
        // Tìm giọng Tiếng Việt
        let viVoice = voices.find(v => {
          const l = (v.lang || '').toLowerCase();
          const n = (v.name || '').toLowerCase();
          return l.includes('vi-vn') || l === 'vi' || l.startsWith('vi_') || n.includes('vietnam') || n.includes('tiếng việt') || n.includes('hoaimy') || n.includes('namminh');
        });

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        if (viVoice) {
          utterance.voice = viVoice;
          this.synth.speak(utterance);
        } else {
          console.warn('Thiết bị không có giọng tiếng Việt SAPI.');
        }
      } catch (e) {
        console.warn('Fallback WebSpeech error:', e);
      }
    }

    // Cập nhật giao diện khi Micro Bật / Tắt
    updateUiState(isListening, engineType = null) {
      const activeEngine = engineType || this.engine;
      const isWhisper = (activeEngine === 'whisper');
      const btnHeader = document.getElementById('btnVoiceAssistant');
      const btnToolbar = document.getElementById('btnToolbarVoiceMic');
      const btnFloating = document.getElementById('floatingVoiceBtn');
      const liveBar = document.getElementById('floatingVoiceLiveBar');
      const liveText = document.getElementById('floatingVoiceLiveText');
      const modal = document.getElementById('voiceAssistantModal');
      const wave = document.getElementById('voiceWaveAnim');
      const statusText = document.getElementById('voiceStatusText');

      const pulseDot = isWhisper ? '<span class="mic-pulse-dot">🟣</span>' : '<span class="mic-pulse-dot">🔴</span>';
      const listeningText = isWhisper ? 'Đang Thu Âm (Whisper)...' : 'Đang Nghe...';

      // 1. Nút trên Header
      if (btnHeader) {
        if (isListening) {
          btnHeader.classList.add('recording-active');
          btnHeader.innerHTML = `${pulseDot} ${listeningText}`;
        } else {
          btnHeader.classList.remove('recording-active');
          btnHeader.innerHTML = `🎙️ Mic AI Chấm Điểm`;
        }
      }

      // 2. Nút ngay trên thanh tìm kiếm danh sách học sinh
      if (btnToolbar) {
        if (isListening) {
          btnToolbar.classList.add('listening');
          btnToolbar.innerHTML = `${pulseDot} ${listeningText}`;
        } else {
          btnToolbar.classList.remove('listening');
          btnToolbar.innerHTML = `🎙️ <span>Nói Chấm Điểm</span>`;
        }
      }

      // 3. Nút Micro nổi cố định ở góc màn hình
      if (btnFloating) {
        if (isListening) {
          btnFloating.classList.add('listening');
          btnFloating.innerHTML = `<span class="voice-fab-icon mic-pulse-dot">${isWhisper ? '🟣' : '🔴'}</span> <span class="voice-fab-text">${isWhisper ? 'Đang thu âm Whisper...' : 'Đang nghe cô nói...'}</span>`;
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
            const hint = isWhisper 
              ? `🟣 <strong>Whisper AI:</strong> Đang thu âm... <em>(Thả tay hoặc bấm dừng để nhận diện siêu tốc)</em>`
              : `🔴 <strong>Đang lắng nghe...</strong> <em>(Nói: "Trừ Gia Hưng 5 điểm" hoặc "Cộng Minh An 10 điểm")</em>`;
            liveText.innerHTML = hint;
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
          if (statusText) {
            statusText.innerHTML = isWhisper
              ? '🟣 Whisper AI: <strong>Đang thu âm...</strong> Cô hãy nói xong rồi bấm dừng hoặc thả tay!'
              : 'Cô hãy nói: <strong>"Cộng (hoặc Trừ) + Tên học sinh + Số điểm"</strong>...';
          }
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

      // 1. Trường hợp không rõ Cộng hay Trừ
      if (parsedCmd && parsedCmd.actionUnknown) {
        if (transcriptEl) {
          transcriptEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
              <div style="font-size: 13px; color: #64748B;">🎙️ Nghe được: <em>"${rawText}"</em></div>
              <div style="font-size: 14px; font-weight: 700; color: #DC2626; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>⚠️ Chưa rõ CỘNG hay TRỪ. Cô hãy nói kèm từ: <strong>"Cộng"</strong> hoặc <strong>"Trừ"</strong> nhé!</span>
              </div>
            </div>
          `;
        }
        if (liveBar && liveText) {
          liveBar.classList.add('active');
          liveText.innerHTML = `⚠️ Nghe được: <em>"${rawText}"</em> (Chưa rõ lệnh Cộng hay Trừ)`;
          setTimeout(() => {
            if (liveBar) liveBar.classList.remove('active');
          }, 3500);
        }
        return;
      }

      const hasTarget = parsedCmd && (parsedCmd.isClassWide || parsedCmd.targetGroupId || (parsedCmd.students && parsedCmd.students.length > 0) || parsedCmd.student);

      if (hasTarget) {
        const actionBadge = parsedCmd.isNegative 
          ? `<span style="background: #FEE2E2; color: #DC2626; padding: 2px 8px; border-radius: 8px; font-weight: 800;">[-] TRỪ ${parsedCmd.points} ⭐</span>`
          : `<span style="background: #DCFCE7; color: #16A34A; padding: 2px 8px; border-radius: 8px; font-weight: 800;">[+] CỘNG ${parsedCmd.points} ⭐</span>`;
        
        let targetText = 'Cả Lớp';
        let prefix = '';
        if (parsedCmd.targetGroupId) {
          targetText = `Tổ ${parsedCmd.targetGroupId}`;
          prefix = 'cho: ';
        } else if (!parsedCmd.isClassWide) {
          const list = (parsedCmd.students && parsedCmd.students.length > 0) ? parsedCmd.students : (parsedCmd.student ? [parsedCmd.student] : []);
          targetText = formatStudentNamesList(list);
          prefix = list.length > 1 ? 'cho các bé: ' : 'cho bé: ';
        }

        // Cập nhật trên modal (nếu mở)
        if (transcriptEl) {
          transcriptEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
              <div style="font-size: 13px; color: #64748B;">🎙️ Nghe được: <em>"${rawText}"</em></div>
              <div style="font-size: 15px; font-weight: 800; color: #1E293B; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
                ${actionBadge} <span>${prefix}<strong style="color: #6D28D9;">${targetText}</strong></span>
              </div>
            </div>
          `;
        }

        // Cập nhật trên thanh trạng thái nổi Dynamic Island
        if (liveBar && liveText) {
          liveBar.classList.add('active');
          liveText.innerHTML = `✨ <strong>Đã nhận diện:</strong> ${actionBadge} ${prefix}<strong>${targetText}</strong>`;
          setTimeout(() => {
            if (liveBar) liveBar.classList.remove('active');
          }, 3500);
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
    // 1. Cập nhật giao diện Động cơ AI từ dữ liệu đã lưu
    if (window.VoiceAssistant && typeof window.VoiceAssistant.updateEngineUi === 'function') {
      window.VoiceAssistant.updateEngineUi();
    }

    // 2. Thiết lập chế độ KÉP: Chạm 1 lần (Tap-to-Talk) HOẶC Nhấn giữ (Push-to-Talk kiểu bộ đàm)
    function setupDualModeMicBtn(btn) {
      if (!btn) return;

      let pressTimer = null;
      let isPushToTalk = false;
      let startTime = 0;

      function handleStart(e) {
        startTime = Date.now();
        isPushToTalk = false;

        if (window.VoiceAssistant && typeof window.VoiceAssistant.unlockAudio === 'function') {
          window.VoiceAssistant.unlockAudio();
        }
        if (window.soundFx) {
          if (typeof window.soundFx.unmute === 'function') window.soundFx.unmute();
          if (typeof window.soundFx.playMicBeep === 'function') window.soundFx.playMicBeep();
        }

        pressTimer = setTimeout(() => {
          isPushToTalk = true;
          if (window.VoiceAssistant && !window.VoiceAssistant.isListening) {
            window.VoiceAssistant.start();
          }
        }, 280);
      }

      function handleEnd(e) {
        clearTimeout(pressTimer);
        if (isPushToTalk) {
          if (e && e.cancelable) {
            e.preventDefault();
            e.stopPropagation();
          }
          setTimeout(() => {
            if (window.VoiceAssistant && window.VoiceAssistant.isListening) {
              window.VoiceAssistant.stop();
            }
          }, 120);
          return;
        }
      }

      if (window.PointerEvent) {
        btn.addEventListener('pointerdown', (e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          handleStart(e);
        });
        btn.addEventListener('pointerup', handleEnd);
        btn.addEventListener('pointercancel', handleEnd);
      } else {
        btn.addEventListener('touchstart', handleStart, { passive: true });
        btn.addEventListener('touchend', handleEnd);
        btn.addEventListener('touchcancel', handleEnd);
        btn.addEventListener('mousedown', (e) => {
          if (e.button === 0) handleStart(e);
        });
        btn.addEventListener('mouseup', handleEnd);
      }

      btn.addEventListener('click', (e) => {
        if (isPushToTalk) {
          isPushToTalk = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (window.VoiceAssistant && typeof window.VoiceAssistant.unlockAudio === 'function') {
          window.VoiceAssistant.unlockAudio();
        }
        if (window.soundFx) {
          if (typeof window.soundFx.unmute === 'function') window.soundFx.unmute();
          if (typeof window.soundFx.playMicBeep === 'function') window.soundFx.playMicBeep();
        }
        if (window.VoiceAssistant) {
          window.VoiceAssistant.toggleListening();
        }
      });
    }

    // Gắn hỗ trợ cả 2 chế độ (Tap & Push-to-Talk) cho tất cả các nút Micro
    setupDualModeMicBtn(document.getElementById('btnVoiceAssistant'));
    setupDualModeMicBtn(document.getElementById('btnToolbarVoiceMic'));
    setupDualModeMicBtn(document.getElementById('floatingVoiceBtn'));
    setupDualModeMicBtn(document.getElementById('btnToggleVoiceInModal'));

    // Nút đóng modal
    const btnCloseModal = document.getElementById('btnCloseVoiceModal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        if (window.VoiceAssistant) window.VoiceAssistant.stop();
        const modal = document.getElementById('voiceAssistantModal');
        if (modal) modal.classList.remove('active');
      });
    }

    // Các nút chuyển đổi Động cơ AI trong Modal
    const btnEngineWebSpeech = document.getElementById('btnEngineWebSpeech');
    if (btnEngineWebSpeech) {
      btnEngineWebSpeech.addEventListener('click', () => {
        if (window.VoiceAssistant) window.VoiceAssistant.setEngine('webspeech');
      });
    }

    const btnEngineWhisper = document.getElementById('btnEngineWhisper');
    if (btnEngineWhisper) {
      btnEngineWhisper.addEventListener('click', () => {
        if (window.VoiceAssistant) window.VoiceAssistant.setEngine('whisper');
      });
    }

    const btnSaveGroqApiKey = document.getElementById('btnSaveGroqApiKey');
    if (btnSaveGroqApiKey) {
      btnSaveGroqApiKey.addEventListener('click', () => {
        const inputKey = document.getElementById('inputGroqApiKey');
        const key = inputKey ? inputKey.value.trim() : '';
        if (window.VoiceAssistant) {
          window.VoiceAssistant.setGroqApiKey(key);
          window.VoiceAssistant.showStatusToast(key ? 'Đã lưu Groq API Key thành công!' : 'Đã xóa Groq API Key!', '✅');
        }
      });
    }
  });

})();
