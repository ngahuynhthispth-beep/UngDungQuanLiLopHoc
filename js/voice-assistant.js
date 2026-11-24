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

  // Chuyển đổi âm vị học tiếng Việt (Fuzzy Phonetic Key)
  // Xử lý các lỗi nhận diện STT điển hình: m/n cuối từ (Lam -> Lan, Trân -> Trâm, Tâm -> Tân), c/k/kh đầu từ, d/gi/r đầu từ, i/y đồng âm
  function toPhoneticKey(str) {
    if (!str) return '';
    let s = removeVietnameseTones(str).toLowerCase();
    s = s.replace(/\bkh/g, 'c');
    s = s.replace(/\b(?:k|c)/g, 'c');
    s = s.replace(/\b(?:d|gi|r)/g, 'd');
    s = s.replace(/(?:m|n)\b/g, 'n');
    s = s.replace(/y/g, 'i');
    return s;
  }

  // Chuẩn hóa lỗi nhận diện âm thanh thường gặp của Google Web Speech API
  function normalizeTranscript(rawTranscript, students) {
    if (!rawTranscript) return '';
    let text = rawTranscript.trim();

    // Loại bỏ ký tự đặc biệt ở đầu câu mà Google STT có thể chèn vào (dấu gạch ngang, ba chấm, ngoặc...)
    text = text.replace(/^[-–—.…,:;!?~"'\s]+/, '');

    // Biến thể đồng âm Google STT miền Nam/Trung hay nghe nhầm từ "Cộng" thành "cọc", "cộc", "cột", "cọt", "cọng", "công"...
    const congVariants = 'cọc|cộc|cột|cọt|cọng|cổng|công|cống|chọn|chọng|chọc|chổng|chộng|cuộn|cũn|cọp|cộp';
    // Biến thể đồng âm Google STT hay nghe nhầm từ "Trừ" thành "trần", "từ", "trực", "chừ", "chữ", "trú", "trúng", "trả", "chờ"...
    const truVariants = 'trần|từ|trực|chừ|chữ|trú|trúng|trả|chờ';

    // 1. Chuẩn hóa đại từ mở đầu: "Cô", "Thầy", "Em", "Tôi", "Bạn", "Xin", "Hãy", "Làm ơn"
    // Ví dụ: "Cô cộng...", "Cô cọc...", "Cô cộc...", "Cô khen...", "Cô cho..." -> "Cộng "
    text = text.replace(new RegExp('^(?:cô|thầy|em|tôi|bạn|xin|hãy|vui lòng|làm ơn)\\s+(?:cộng|khen|thưởng|tặng|thêm|cho|' + congVariants + ')\\s+', 'iu'), 'Cộng ');
    text = text.replace(new RegExp('^(?:cô|thầy|em|tôi|bạn|xin|hãy|vui lòng|làm ơn)\\s+(?:trừ|bớt|phạt|nhắc\\s+nhở|nhắc|' + truVariants + ')\\s+', 'iu'), 'Trừ ');

    // 2. Chuẩn hóa "cho bạn / cho bé / cho em" ở đầu câu thành "Cộng "
    text = text.replace(/^cho\s+(?:bạn|bé|em|học sinh)?\s+/iu, 'Cộng ');

    // 3. Chuẩn hóa chuỗi các từ nghe nhầm như "cọc", "cọc cọc", "cọc, cọc" ở đầu câu hoặc đứng độc lập
    text = text.replace(new RegExp('^(?:' + congVariants + ')(?:[\\s,;]+(?:' + congVariants + '))*(?:\\s+|$)', 'iu'), 'Cộng ');
    text = text.replace(new RegExp('^(?:' + truVariants + ')\\s+(?=(?:cho\\s+|bạn\\s+|bé\\s+|em\\s+)?[A-ZÀ-Ỹa-zà-ỹ0-9])', 'iu'), 'Trừ ');

    // 4. Chuẩn hóa "... [từ nghe nhầm cọc/cộc] + [tên học sinh hoặc số điểm]" ở bất kỳ vị trí nào
    text = text.replace(new RegExp('(?:^|[\\s,;])(?:' + congVariants + ')(?:[\\s,;]+(?:' + congVariants + '))*\\s+(?=(?:cho\\s+|bạn\\s+|bé\\s+|em\\s+)?[A-ZÀ-Ỹa-zà-ỹ0-9])', 'giu'), ' Cộng ');

    // 5. Chuẩn hóa các từ thưởng/khen ở đầu câu thành "Cộng " để thống nhất cú pháp
    text = text.replace(/^(?:khen\s+thưởng|khen|thưởng|tặng|thêm)\s+/iu, 'Cộng ');

    // 6. Chuẩn hóa các từ trừ/phạt ở đầu câu thành "Trừ "
    text = text.replace(/^(?:nhắc\s+nhở|bớt|phạt|thu\s+lại)\s+/iu, 'Trừ ');

    return text.trim().replace(/\s+/g, ' ');
  }

  // Chuyển đổi từ ngữ chỉ số lượng tiếng Việt thành số
  function parseVietnameseNumber(text, targetGroupId = null) {
    if (!text) return null;
    let clean = removeVietnameseTones(text);

    // Loại bỏ số của tổ/nhóm (ví dụ: "tổ 1", "tổ 2", "nhóm 3") để không bắt nhầm số tổ thành số điểm
    clean = clean.replace(/\b(?:to|nhom)\s+[1-4]\b/gi, ' ');

    // Tìm số dạng chữ số trực tiếp: 1, 2, 5, 10, ... (kèm từ điểm/sao/diem hoặc đứng độc lập)
    const digitMatch = clean.match(/\b(\d+)\s*(diem|sao|star|d|p)?\b/);
    if (digitMatch) {
      return parseInt(digitMatch[1], 10);
    }

    const numMap = {
      'muoi lam': 15, 'mười lăm': 15, 'hai muoi': 20, 'hai mươi': 20,
      'nua': 1, 'nửa': 1, 'mot': 1, 'một': 1, 'mốt': 1,
      'hai': 2, 'ba': 3, 'bon': 4, 'bốn': 4,
      'nam': 5, 'năm': 5, 'sau': 6, 'sáu': 6,
      'bay': 7, 'bảy': 7, 'bẩy': 7, 'tam': 8, 'tám': 8,
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
      this.normalizeTranscript = normalizeTranscript;

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
          let fullFinal = '';
          const alternatives = [];

          // Gom toàn bộ kết quả final từ đầu phiên ghi âm (từ i = 0), không bỏ sót từ khi Chrome chia nhỏ chunk
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res.isFinal) {
              const t = res[0].transcript.trim();
              if (t) {
                fullFinal += (fullFinal ? ' ' : '') + t;
              }
              for (let a = 0; a < res.length; a++) {
                if (res[a] && res[a].transcript) {
                  alternatives.push(res[a].transcript.trim());
                }
              }
            } else {
              interimText += (interimText ? ' ' : '') + res[0].transcript.trim();
            }
          }

          // Cập nhật streaming thời gian thực lên màn hình
          const liveText = interimText ? (fullFinal ? `${fullFinal} ${interimText}` : interimText) : fullFinal;
          if (liveText) {
            this.updateInterimDisplay(liveText);
          }

          // Xử lý thông minh khi cô đang nói:
          // Nếu vẫn đang có interimText (cô đang nói dở), xóa timer để không bao giờ bị ngắt câu giữa chừng.
          if (interimText) {
            clearTimeout(this.speechFinalDebounceTimer);
            return;
          }

          if (fullFinal) {
            clearTimeout(this.speechFinalDebounceTimer);

            // Kiểm tra xem câu đã đủ cấu trúc (hành động + đối tượng + điểm) hay chưa
            let isComplete = false;
            try {
              const data = (window.StorageManager && window.StorageManager.loadData()) || {};
              const students = data.students || [];
              const norm = normalizeTranscript(fullFinal, students);
              const parsed = this.parseCommandGrammar(fullFinal, norm, students);
              const hasTarget = (parsed.students && parsed.students.length > 0) || parsed.student || parsed.isClassWide || parsed.targetGroupId;
              if (parsed.actionFound && hasTarget && parsed.points) {
                isComplete = true;
              }
            } catch (err) {}

            // Debounce thông minh:
            // Nếu câu đã hoàn chỉnh: chờ 700ms im lặng (để cô có thể nói tiếp lý do "vì...") rồi chốt lệnh.
            // Nếu câu chưa đủ (cô mới nói "Cộng..." hoặc mới nói tên): chờ tối đa 2500ms để cô đọc tiếp.
            const debounceMs = isComplete ? 700 : 2500;

            this.speechFinalDebounceTimer = setTimeout(() => {
              this.stop();
              this.processCommand(fullFinal.trim(), alternatives);
            }, debounceMs);
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
        clearTimeout(this.speechFinalDebounceTimer);
        this.currentInterimText = '';
        this.recognition.start();
      } catch (e) {
        console.warn('Lỗi start recognition:', e);
      }
    }

    stopWebSpeech() {
      if (!this.recognition) return;
      try {
        clearTimeout(this.speechFinalDebounceTimer);
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

      // Tự động chuẩn hóa các âm nghe nhầm như "cọc", "cộc", "cọc cọc" thành "Cộng" ngay trên giao diện
      let displayText = interimText || '';
      const congPattern = '(?:cọc|cộc|cột|cọt|cọng|cổng|công|cống|chọn|chọng|chọc|cuộn|cũn)';
      displayText = displayText.replace(new RegExp('\\b' + congPattern + '(?:[\\s,;]+' + congPattern + ')*\\b', 'giu'), 'Cộng');

      if (transcriptEl) {
        transcriptEl.innerHTML = `<span style="color: #6D28D9; font-weight: 700;">🎙️ "${displayText}..."</span>`;
      }
      if (liveBar && liveText) {
        liveBar.classList.add('active');
        liveText.innerHTML = `🔴 <strong>Đang nghe:</strong> <em>"${displayText}..."</em>`;
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

      // Kiểm tra xem câu gốc (candidate 0) có ý định TRỪ rõ ràng hay không
      const rawFirstCand = (candidates[0] || '').toLowerCase();
      const normFirstCand = normalizeTranscript(candidates[0] || '', students).toLowerCase();
      const firstCandIsNegative = /^(?:trừ|bớt|phạt|nhắc|rút|hạ)\b/i.test(normFirstCand) ||
        /\b(?:trừ|bớt|phạt|thu lại)\b/i.test(rawFirstCand);

      for (const cand of candidates) {
        if (!cand) continue;
        const normalized = normalizeTranscript(cand, students);
        const parsed = this.parseCommandGrammar(cand, normalized, students);
        const hasTarget = (parsed.students && parsed.students.length > 0) || parsed.student || parsed.isClassWide || parsed.targetGroupId;
        if (hasTarget) {
          // Nếu câu gốc ban đầu là lệnh TRỪ, tuyệt đối không chấp nhận candidate phụ đảo ngược thành CỘNG
          if (firstCandIsNegative && !parsed.isNegative) {
            continue;
          }
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
      let clean = removeVietnameseTones(normalized);
      // Chuẩn hóa biến thể coc, cot, cop, choc trong clean thành cong
      clean = clean.replace(/\b(?:coc|cot|cop|choc)(?:[\s,;]+(?:coc|cot|cop|choc))*\b/g, 'cong');

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

      const rawLower = (raw || '').toLowerCase();
      const words = clean.split(/\s+/).filter(Boolean);
      const firstWord = words[0] || '';
      const firstTwoWords = words.slice(0, 2).join(' ');

      // Nhóm động từ CỘNG
      const positiveVerbs = ['cong', 'khen', 'thuong', 'tang', 'them', 'nap', 'uong'];

      // Kiểm tra xem từ "phát" có phải là "phát biểu", "phát thưởng" hay không
      const isPhatBieu = clean.includes('phat bieu') || clean.includes('phat thuong') || rawLower.includes('phát biểu') || rawLower.includes('phát');

      // BƯỚC 2.1: Động từ mở đầu câu lệnh
      if (positiveVerbs.includes(firstWord) || firstTwoWords === 'khen thuong' || clean.startsWith('phat bieu')) {
        isNegative = false;
        actionFound = true;
      } else if ((firstWord === 'phat' && !isPhatBieu) || ['tru', 'bot', 'nhac', 'rut', 'ha'].includes(firstWord) || firstTwoWords === 'nhac nho' || firstTwoWords === 'thu lai') {
        isNegative = true;
        actionFound = true;
      }

      // BƯỚC 2.2: Nếu từ đầu câu chưa xác định, tìm kiếm vị trí xuất hiện của động từ Cộng vs Trừ trong câu
      if (!actionFound) {
        let posIndex = -1;
        for (const pv of positiveVerbs) {
          const match = clean.match(new RegExp('(?:^|[\\s,;!?])' + pv + '(?=[\\s,;!?]|$)', 'i'));
          if (match) {
            const idx = match.index || 0;
            if (posIndex === -1 || idx < posIndex) posIndex = idx;
          }
        }
        if (clean.includes('phat bieu')) {
          const idx = clean.indexOf('phat bieu');
          if (posIndex === -1 || idx < posIndex) posIndex = idx;
        }

        let negIndex = -1;
        const negativeVerbsList = ['tru', 'bot', 'nhac', 'nhac nho', 'rut', 'ha', 'thu lai'];
        if (!isPhatBieu && (clean.includes('phat ') || rawLower.includes('phạt'))) {
          negativeVerbsList.push('phat');
        }
        for (const nv of negativeVerbsList) {
          const match = clean.match(new RegExp('(?:^|[\\s,;!?])' + nv + '(?=[\\s,;!?]|$)', 'i'));
          if (match) {
            const idx = match.index || 0;
            if (negIndex === -1 || idx < negIndex) negIndex = idx;
          }
        }

        if (posIndex !== -1 && negIndex === -1) {
          isNegative = false;
          actionFound = true;
        } else if (negIndex !== -1 && posIndex === -1) {
          isNegative = true;
          actionFound = true;
        } else if (posIndex !== -1 && negIndex !== -1) {
          if (posIndex <= negIndex) {
            isNegative = false;
            actionFound = true;
          } else {
            isNegative = true;
            actionFound = true;
          }
        }
      }

      // BƯỚC 2.3: Nếu vẫn chưa tìm thấy động từ cốt lõi, đối sánh theo ngữ cảnh hành vi rõ rệt
      if (!actionFound) {
        const hasSpecificViolation = [
          'mat trat tu', 'noi chuyen', 'chua ngoan', 'quay cop', 'khong lam bai',
          'chua lam bai', 'quen vo', 'quen sach', 'choi trong lop', 'choi', 'nghich',
          'nghich ngom', 'lam viec rieng', 'khong tap trung', 'khong chu y', 'an qua vat', 'ngu gat'
        ].some(v => new RegExp('(?:^|[\\s,;!?])' + v + '(?=[\\s,;!?]|$)', 'i').test(clean));

        const hasSpecificPraise = [
          'cham ngoan', 'phat bieu', 'doc to', 'viet dep', 'chu dep', 'lam dung', 'lam nhanh', 'tich cuc', 'gioi', 'xuat sac'
        ].some(p => new RegExp('(?:^|[\\s,;!?])' + p + '(?=[\\s,;!?]|$)', 'i').test(clean));

        if (hasSpecificViolation && !hasSpecificPraise) {
          isNegative = true;
          actionFound = true;
        } else if (hasSpecificPraise && !hasSpecificViolation) {
          isNegative = false;
          actionFound = true;
        } else {
          // Mặc định an toàn cho giáo viên: Luôn là CỘNG ĐIỂM KHEN THƯỞNG
          isNegative = false;
          actionFound = true;
        }
      }

      // 3. Tìm danh sách học sinh khớp trong câu nói trước (để loại trừ tên học sinh trước khi trích xuất số điểm & lý do)
      let matchedStudents = (isClassWide || targetGroupId) ? [] : this.findAllStudentMatches(clean, students);

      // Nếu không tìm thấy tên học sinh trong câu nói, nhưng đang mở bảng Khen thưởng của 1 học sinh cụ thể
      if (matchedStudents.length === 0 && !isClassWide && !targetGroupId) {
        if (typeof window.getActiveModalStudent === 'function') {
          const activeStudent = window.getActiveModalStudent();
          if (activeStudent) {
            matchedStudents = [activeStudent];
          }
        }
      }
      const student = matchedStudents.length > 0 ? matchedStudents[0] : null;

      // 4. Trích xuất số điểm (đã loại bỏ tên học sinh đã khớp khỏi văn bản để tránh bắt nhầm chữ trong tên thành số)
      let numberSearchText = normalized || raw;
      if (matchedStudents && matchedStudents.length > 0) {
        matchedStudents.forEach(s => {
          if (s && s.name) {
            numberSearchText = numberSearchText.replace(new RegExp('\\b' + s.name + '\\b', 'giu'), ' ');
            const sClean = removeVietnameseTones(s.name);
            if (sClean) numberSearchText = numberSearchText.replace(new RegExp('\\b' + sClean + '\\b', 'giu'), ' ');
            const sVowel = sClean.replace(/y/g, 'i');
            if (sVowel) numberSearchText = numberSearchText.replace(new RegExp('\\b' + sVowel + '\\b', 'giu'), ' ');
          }
        });
      }

      let points = parseVietnameseNumber(numberSearchText, targetGroupId);
      if (!points || points <= 0 || points > 100) {
        points = isNegative ? 2 : 5; // Mặc định: trừ 2 hoặc cộng 5 nếu cô không đọc số điểm
      }

      // 5. Trích xuất lý do tự nhiên từ câu nói (Ví dụ: "vì đọc bài to", "do giúp bạn nhặt bút", "tại nói chuyện riêng")
      let naturalReason = '';

      // Danh sách liên từ chỉ nguyên nhân / lý do
      const reasonRegex = /(?:^|[\s,;])(?:vì\s+lý\s+do|vì\s+lí\s+do|với\s+lý\s+do|với\s+lí\s+do|bởi\s+vì|tại\s+vì|lý\s+do|lí\s+do|vì|do|tại|nhờ)\s+(.+)$/iu;

      // 5.1. Thử bóc tách trực tiếp từ câu raw (văn bản gốc tiếng Việt có dấu do Web Speech API / mic trả về)
      const rawMatch = (raw || '').match(reasonRegex);
      const normMatch = (normalized || '').match(reasonRegex);
      let candidateReason = rawMatch && rawMatch[1] ? rawMatch[1] : (normMatch && normMatch[1] ? normMatch[1] : '');

      if (!candidateReason) {
        // Thử tìm theo biến thể không dấu trong clean
        const cleanReasonRegex = /(?:^|[\s,;])(?:vi\s+ly\s+do|vi\s+li\s+do|voi\s+ly\s+do|voi\s+li\s+do|boi\s+vi|tai\s+vi|ly\s+do|li\s+do|vi|do|tai|nho)\s+(.+)$/i;
        const cleanMatch = clean.match(cleanReasonRegex);
        if (cleanMatch && cleanMatch[1]) {
          candidateReason = cleanMatch[1];
        }
      }

      if (candidateReason) {
        // Cắt bỏ các trợ từ / hư từ cảm thán hoặc lịch sự ở cuối câu nói của giáo viên
        candidateReason = candidateReason
          .replace(/\s+(?:nhé\s+cô|nha\s+cô|ạ\s+cô|cô\s+nhé|nhé\s+em|nha\s+em|nhé\s+con|nha\s+con|nhé\s+các\s+em|nha\s+các\s+em|nhé|nha|nhe|ạ|nè|cô|nghe|nhen|nào)\s*[.!?~;:]*$/iu, '')
          .replace(/[.,!?~;:]+$/, '')
          .trim();

        if (candidateReason.length >= 2) {
          naturalReason = candidateReason.charAt(0).toUpperCase() + candidateReason.slice(1);
        }
      }

      // 5.2. Nếu không có từ "vì/do...", kiểm tra phần nội dung phía sau tên học sinh và số điểm
      if (!naturalReason && (normalized || raw)) {
        let remnant = normalized || raw;
        const congVariants = 'cọc|cộc|cột|cọt|cọng|cổng|công|cống|chọn|chọng|chọc|cuộn|cũn|cọp|cộp';
        remnant = remnant.replace(/^(?:cô|thầy|em|tôi|bạn|xin|hãy|vui lòng|làm ơn)\s+/iu, '');
        remnant = remnant.replace(new RegExp('^(?:' + congVariants + '|cộng|khen|thưởng|tặng|thêm|trừ|bớt|phạt|nhắc|nhắc\\s+nhở|cho)(?:[\\s,;]+(?:' + congVariants + '))*\\s*', 'iu'), '');
        remnant = remnant.replace(/^(?:cho\\s+)?(?:bạn|bé|em|học sinh)?\s+/iu, '');
        if (Array.isArray(students)) {
          students.forEach(s => {
            remnant = remnant.replace(new RegExp('\\b(?:cho\\s+|của\\s+|bạn\\s+|bé\\s+|em\\s+)?' + s.name + '\\b', 'giu'), '');
            const sClean = removeVietnameseTones(s.name);
            if (sClean) remnant = remnant.replace(new RegExp('\\b(?:cho\\s+|cua\\s+|ban\\s+|be\\s+|em\\s+)?' + sClean + '\\b', 'giu'), '');
            const sVowel = sClean.replace(/y/g, 'i');
            if (sVowel) remnant = remnant.replace(new RegExp('\\b(?:cho\\s+|cua\\s+|ban\\s+|be\\s+|em\\s+)?' + sVowel + '\\b', 'giu'), '');
          });
        }
        // Xóa sạch mọi từ hoặc cụm từ trong remnant trùng âm vị (toPhoneticKey) với học sinh đã khớp
        if (Array.isArray(matchedStudents)) {
          matchedStudents.forEach(s => {
            if (!s || !s.name) return;
            const sKey = toPhoneticKey(s.name);
            const sParts = removeVietnameseTones(s.name).split(' ');
            const sTwoLastKey = sParts.length >= 3 ? toPhoneticKey(sParts.slice(-2).join(' ')) : null;
            const words = remnant.split(/\s+/).filter(Boolean);
            for (let len = Math.min(3, words.length); len >= 1; len--) {
              for (let i = 0; i <= words.length - len; i++) {
                const phrase = words.slice(i, i + len).join(' ');
                const pKey = toPhoneticKey(phrase);
                if (pKey === sKey || (sTwoLastKey && pKey === sTwoLastKey)) {
                  remnant = (' ' + remnant + ' ').replace(' ' + phrase + ' ', ' ').trim();
                }
              }
            }
          });
        }
        remnant = remnant.replace(/\b\d+\s*(?:điểm|sao|star|d|p)?\b/giu, '');
        remnant = remnant.replace(/^(?:điểm|sao|star)\s+/iu, '');
        remnant = remnant
          .replace(/\s+(?:nhé\s+cô|nha\s+cô|ạ\s+cô|cô\s+nhé|nhé\s+em|nha\s+em|nhé\s+con|nha\s+con|nhé\s+các\s+em|nha\s+các\s+em|nhé|nha|nhe|ạ|nè|cô|nghe|nhen|nào)\s*[.!?~;:]*$/iu, '')
          .replace(/^[.,!?~;:\s]+|[.,!?~;:\s]+$/g, '')
          .trim();
        const remnantClean = removeVietnameseTones(remnant);
        if (['cho', 'cho ban', 'cho be', 'cho em', 'diem', 'sao', 'coc', 'cot', 'choc', 'cong'].includes(remnantClean)) {
          remnant = '';
        }
        if (remnant.length >= 3 && !/^\d+$/.test(remnant)) {
          naturalReason = remnant.charAt(0).toUpperCase() + remnant.slice(1);
        }
      }

      let reason = naturalReason;

      // 5.3. Nếu chưa có lý do cụ thể, đối sánh theo các từ khóa hành vi thường gặp
      if (!reason) {
        if (clean.includes('mat trat tu')) reason = 'Mất trật tự trong giờ học';
        else if (clean.includes('noi chuyen')) reason = 'Nói chuyện riêng trong lớp';
        else if (clean.includes('khong lam bai') || clean.includes('chua lam bai')) reason = 'Chưa làm bài tập';
        else if (clean.includes('quen vo') || clean.includes('quen sach')) reason = 'Quên sách vở đồ dùng học tập';
        else if (clean.includes('phat bieu')) reason = 'Hăng hái phát biểu xây dựng bài';
        else if (clean.includes('doc to') || clean.includes('doc bai to')) reason = 'Đọc bài to rõ ràng';
        else if (clean.includes('viet dep') || clean.includes('chu dep')) reason = 'Chữ viết sạch đẹp nắn nót';
        else if (clean.includes('cham ngoan')) reason = 'Chăm ngoan gương mẫu';
        else if (clean.includes('lam dung') || clean.includes('lam nhanh')) reason = 'Làm bài nhanh và chính xác';
        else if (clean.includes('giup ban')) reason = 'Biết giúp đỡ bạn bè';
        else if (clean.includes('ve sinh') || clean.includes('truc nhat')) reason = 'Vệ sinh trực nhật sạch sẽ';
        else if (clean.includes('uong nuoc') || clean.includes('nap nuoc') || clean.includes('nuoc')) reason = 'Uống đủ nước mỗi ngày';
        else {
          reason = isNegative ? 'Nhắc nhở qua giọng nói' : 'Khen thưởng qua giọng nói';
        }
      }

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
        naturalReason,
        student,
        students: matchedStudents
      };
    }

    // Tìm kiếm toàn bộ học sinh được nhắc tên trong câu nói (hỗ trợ gọi nhiều bạn cùng lúc)
    findAllStudentMatches(cleanTranscript, students) {
      if (!students || students.length === 0 || !cleanTranscript) return [];

      // Sắp xếp theo độ dài họ tên giảm dần (để "Phạm Bảo Hân" được ưu tiên trước "Bảo Hân")
      const sortedStudents = [...students].sort((a, b) => b.name.length - a.name.length);

      // Chuẩn hóa đồng âm i và y (Huyền Mi <=> Huyền My, Vy Lê <=> Vi Lê, Hải Yến <=> Hải Iến)
      const normVowels = (str) => removeVietnameseTones(str).toLowerCase().replace(/y/g, 'i');
      let workingText = ' ' + normVowels(cleanTranscript) + ' ';
      const matchedWithIndex = [];
      const matchedIds = new Set();

      // Bước 1: Khớp chính xác cả họ tên (vd: 'pham bao han', 'minh an', 'gia hung', 'quoc an', 'huyen my' / 'huyen mi')
      for (const s of sortedStudents) {
        const sClean = normVowels(s.name);
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
        const parts = normVowels(s.name).split(' ');
        if (parts.length >= 3) {
          const twoLast = parts.slice(-2).join(' ');
          const isConflict = students.some(other => other.id !== s.id && normVowels(other.name) === twoLast);
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
      const stopwords = new Set([
        'di', 'cho', 'va', 'ra', 'co', 'em', 'ban', 'con', 'lop', 'to', 'cac', 'nhe', 'nha',
        'mot', 'hai', 'ba', 'bon', 'nam', 'sau', 'bay', 'tam', 'chin', 'muoi',
        'bot', 'khen', 'thuong', 'phat', 'nhac', 'ha', 'rut'
      ]);
      const lastNameCounts = {};
      students.forEach(s => {
        const parts = normVowels(s.name).split(' ');
        const l = parts[parts.length - 1];
        if (l) lastNameCounts[l] = (lastNameCounts[l] || 0) + 1;
      });

      for (const s of sortedStudents) {
        if (matchedIds.has(s.id)) continue;
        const parts = normVowels(s.name).split(' ');
        const l = parts[parts.length - 1];
        if (!l || stopwords.has(l)) continue;

        if (lastNameCounts[l] === 1) {
          const reg = new RegExp('\\b' + l + '\\b', 'i');
          const match = workingText.match(reg);
          if (match) {
            // Nếu từ trùng là 'tran' hoặc 'tru' hoặc 'cong' nhưng lại nằm ngay đầu câu lệnh (vị trí của động từ Trừ/Cộng bị nghe nhầm), bỏ qua
            if ((l === 'tran' || l === 'tru' || l === 'cong') && match.index <= 2) {
              continue;
            }
            matchedWithIndex.push({ student: s, index: match.index });
            matchedIds.add(s.id);
            workingText = workingText.replace(reg, ' ___ ');
          }
        }
      }

      // Bước 4: Khớp mờ ngữ âm (Fuzzy Phonetic Matching) cho trường hợp Google STT nghe lệch âm
      // Ví dụ: Bảo Lam nghe thành "Bảo Lan", Bảo Trân thành "Bảo Trâm", Tuệ Tâm thành "Tuệ Tân", Hà Kha thành "Hà Ca", Đăng Khôi thành "Đăng Côi", Ánh Dương thành "Ánh Giương"
      let phoneticWorkingText = ' ' + toPhoneticKey(workingText) + ' ';

      // Bước 4.1: Khớp cả họ tên theo mã ngữ âm (toPhoneticKey)
      for (const s of sortedStudents) {
        if (matchedIds.has(s.id)) continue;
        const sKey = toPhoneticKey(s.name);
        if (!sKey) continue;
        const reg = new RegExp('\\b' + sKey + '\\b', 'i');
        const match = phoneticWorkingText.match(reg);
        if (match) {
          matchedWithIndex.push({ student: s, index: match.index });
          matchedIds.add(s.id);
          phoneticWorkingText = phoneticWorkingText.replace(reg, ' ___ ');
        }
      }

      // Bước 4.2: Khớp 2 từ cuối theo mã ngữ âm cho tên từ 3 từ trở lên
      for (const s of sortedStudents) {
        if (matchedIds.has(s.id)) continue;
        const parts = normVowels(s.name).split(' ');
        if (parts.length >= 3) {
          const twoLastKey = toPhoneticKey(parts.slice(-2).join(' '));
          const isConflict = students.some(other => other.id !== s.id && toPhoneticKey(other.name) === twoLastKey);
          if (!isConflict) {
            const reg = new RegExp('\\b' + twoLastKey + '\\b', 'i');
            const match = phoneticWorkingText.match(reg);
            if (match) {
              matchedWithIndex.push({ student: s, index: match.index });
              matchedIds.add(s.id);
              phoneticWorkingText = phoneticWorkingText.replace(reg, ' ___ ');
            }
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
        const reason = cmd.reason || (cmd.isNegative ? 'Nhắc nhở chung cả lớp' : 'Cả lớp cùng chăm ngoan');
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

        const feedbackReason = cmd.naturalReason ? ` vì ${cmd.naturalReason}` : '';
        const feedback = cmd.isNegative 
          ? `Đã nhắc nhở trừ ${cmd.points} sao của cả lớp${feedbackReason}!` 
          : `Đã cộng ${cmd.points} sao cho cả lớp${feedbackReason}!`;

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
        const feedbackReason = cmd.naturalReason ? ` vì ${cmd.naturalReason}` : '';
        const feedback = cmd.isNegative 
          ? `Đã trừ ${cmd.points} sao của ${groupName}${feedbackReason}!` 
          : `Đã cộng ${cmd.points} sao cho ${groupName}${feedbackReason}!`;

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

          // Tự động nâng mực nước trong bình Trạm Nước nếu câu lệnh là uống nước / nạp nước
          if (window.WaterStation && typeof window.WaterStation.recordWaterOnly === 'function' && !cmd.isNegative) {
            if ((cmd.reason && cmd.reason.toLowerCase().includes('nước')) || (cmd.raw && /nước|nuoc/i.test(cmd.raw))) {
              window.WaterStation.recordWaterOnly(student.id);
            }
          }
        }, idx * 140);
      });

      // Hiển thị thông báo Toast với danh sách học sinh
      const actionText = cmd.isNegative ? 'trừ' : 'cộng';
      const toastSubject = targetStudents.length > 1 ? `các bé <strong>${namesText}</strong>` : `bé <strong>${namesText}</strong>`;
      this.showStatusToast(`🎙️ Đã ${actionText} ${Math.abs(actualPoints)} ⭐ cho ${toastSubject} (${cmd.reason})`, cmd.isNegative ? '⚠️' : '🌟');

      // Phản hồi giọng nói trợ lý AI sau khi hoàn tất hiệu ứng (trì hoãn tương ứng số lượng bé để nghe rõ chuông và giọng nói)
      const feedbackReason = cmd.naturalReason ? ` vì ${cmd.naturalReason}` : '';
      const feedbackText = cmd.isNegative 
        ? `Đã trừ ${cmd.points} sao của ${targetStudents.length > 1 ? 'các bạn' : 'bạn'} ${namesText}${feedbackReason}!`
        : `Đã cộng ${cmd.points} sao cho ${targetStudents.length > 1 ? 'các bạn' : 'bạn'} ${namesText}${feedbackReason}!`;

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

      // Tự động chuẩn hóa câu chữ hiển thị nếu Google STT nghe nhầm "cọc", "cộc"
      let cleanRaw = rawText || '';
      const congPattern = '(?:cọc|cộc|cột|cọt|cọng|cổng|công|cống|chọn|chọng|chọc|cuộn|cũn)';
      cleanRaw = cleanRaw.replace(new RegExp('\\b' + congPattern + '(?:[\\s,;]+' + congPattern + ')*\\b', 'giu'), 'Cộng');

      // 1. Trường hợp không rõ Cộng hay Trừ
      if (parsedCmd && parsedCmd.actionUnknown) {
        if (transcriptEl) {
          transcriptEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 4px; width: 100%;">
              <div style="font-size: 13px; color: #64748B;">🎙️ Nghe được: <em>"${cleanRaw}"</em></div>
              <div style="font-size: 14px; font-weight: 700; color: #DC2626; display: flex; align-items: center; justify-content: center; gap: 6px;">
                <span>⚠️ Chưa rõ CỘNG hay TRỪ. Cô hãy nói kèm từ: <strong>"Cộng"</strong> hoặc <strong>"Trừ"</strong> nhé!</span>
              </div>
            </div>
          `;
        }
        if (liveBar && liveText) {
          liveBar.classList.add('active');
          liveText.innerHTML = `⚠️ Nghe được: <em>"${cleanRaw}"</em> (Chưa rõ lệnh Cộng hay Trừ)`;
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
              <div style="font-size: 13px; color: #64748B;">🎙️ Nghe được: <em>"${cleanRaw}"</em></div>
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
        if (transcriptEl) transcriptEl.innerHTML = `💬 <em>"${cleanRaw}"</em>`;
        if (liveBar && liveText) {
          liveBar.classList.add('active');
          liveText.innerHTML = `💬 <em>"${cleanRaw}"</em> (Chưa rõ tên bé)`;
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
