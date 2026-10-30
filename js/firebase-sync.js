// js/firebase-sync.js - Đồng bộ Đám Mây Google Firebase Realtime Database 24/24
// Giúp phụ huynh và giáo viên kết nối liên tục không phụ thuộc máy tính cá nhân

(function() {
  const FIREBASE_CONFIG_KEY = 'lop_hoc_firebase_config';

  const FirebaseSync = {
    app: null,
    db: null,
    isInitialized: false,

    // Lấy config từ window.__FIREBASE_CONFIG__ hoặc localStorage
    getConfig() {
      if (window.__FIREBASE_CONFIG__) {
        return window.__FIREBASE_CONFIG__;
      }
      try {
        const saved = localStorage.getItem(FIREBASE_CONFIG_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
      return null;
    },

    saveConfig(config) {
      try {
        localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
        return true;
      } catch (e) {
        return false;
      }
    },

    // Khởi tạo Firebase
    init(customConfig) {
      const config = customConfig || this.getConfig();
      if (!config || !config.apiKey || !config.databaseURL) {
        return false;
      }

      try {
        if (!window.firebase) {
          console.warn('Firebase SDK chưa được tải.');
          return false;
        }

        if (!firebase.apps.length) {
          this.app = firebase.initializeApp(config);
        } else {
          this.app = firebase.app();
        }

        this.db = firebase.database();
        this.isInitialized = true;
        console.log('✅ Đã kết nối Google Firebase Realtime Database thành công!');
        return true;
      } catch (err) {
        console.error('Lỗi khởi tạo Firebase:', err);
        this.isInitialized = false;
        return false;
      }
    },

    currentClassId: null,
    _currentListenerRef: null,

    // Kiểm tra có phải lớp chính (Lớp 1/8 gốc) hay không
    isPrimaryClass(id) {
      if (!id) return true;
      const s = String(id).trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      return s === '18' || s === '1A';
    },

    // Lấy Mã Lớp: Ưu tiên 1) URL (?class= hoặc ?lop=), 2) localStorage, 3) mặc định '1/8'
    getClassId() {
      if (this.currentClassId) return this.currentClassId;
      if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        const fromUrl = params.get('class') || params.get('lop');
        if (fromUrl) {
          this.currentClassId = this.sanitizeClassId(fromUrl);
          return this.currentClassId;
        }
      }
      try {
        const saved = localStorage.getItem('lop_hoc_current_class_id') || localStorage.getItem('magic_zoo_class_id');
        if (saved) {
          this.currentClassId = this.sanitizeClassId(saved);
          return this.currentClassId;
        }
      } catch (e) {}
      this.currentClassId = '1/8';
      return '1/8';
    },

    setClassId(classId) {
      const clean = this.sanitizeClassId(classId);
      this.currentClassId = clean;
      try {
        localStorage.setItem('lop_hoc_current_class_id', clean);
        localStorage.setItem('magic_zoo_class_id', clean);
      } catch (e) {}
      return clean;
    },

    sanitizeClassId(id) {
      if (!id) return '1/8';
      let str = String(id).trim();
      if (this.isPrimaryClass(str)) return '1/8';
      let clean = str.replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
      return clean || '1/8';
    },

    // Đường dẫn Firebase: Lớp 1/8 dùng 'classData' gốc (giữ nguyên 100% dữ liệu cũ), các lớp khác dùng 'classes/<id>'
    getClassPath(customClassId) {
      const id = customClassId || this.getClassId();
      if (this.isPrimaryClass(id)) {
        return 'classData';
      }
      const safeKey = this.sanitizeClassId(id).replace(/\//g, '-');
      return 'classes/' + safeKey;
    },

    getClassRef(subPath = '', customClassId = null) {
      const basePath = this.getClassPath(customClassId);
      const fullPath = subPath ? `${basePath}/${subPath}` : basePath;
      return this.db.ref(fullPath);
    },

    // Đảm bảo dữ liệu lớp học có sẵn trên Firebase khi mới kết nối lần đầu
    async ensureInitialData(localData) {
      if (!this.isInitialized || !this.db || !localData || !localData.students) return false;
      try {
        const ref = this.getClassRef();
        const snapshot = await ref.once('value');
        const remoteData = snapshot.val();
        const classId = this.getClassId();

        if (this.isPrimaryClass(classId)) {
          const remoteIsSample = remoteData && remoteData.students && remoteData.students.some(s => s.name === 'Đỗ Đức Anh') && remoteData.students.length === 16;
          const localIsReal = localData.students.length > 16 || !localData.students.some(s => s.name === 'Đỗ Đức Anh');
          const localStars = (localData.students || []).reduce((sum, s) => sum + (Number(s.stars) || 0), 0);
          const remoteStars = (remoteData && remoteData.students) ? remoteData.students.reduce((sum, s) => sum + (Number(s.stars) || 0), 0) : 0;

          // Nếu máy local có 0 sao trong khi remote đã có sao thật, tuyệt đối không đẩy đè
          if (localStars < 100 && remoteStars >= 100) {
            console.warn('Bảo vệ dữ liệu: Local data đang có 0 sao, không đẩy đè lên Firebase!');
            return false;
          }

          const needsSync = !snapshot.exists() || !remoteData || !remoteData.students ||
            (localData.students.length > remoteData.students.length) ||
            (remoteIsSample && localIsReal) ||
            (remoteStars < 100 && localStars >= 100) ||
            ((localData.lastUpdated || 0) > (remoteData.lastUpdated || 0));

          if (needsSync && localStars >= 100) {
            console.log('Đang đẩy dữ liệu lớp 1/8 mới nhất lên Firebase Cloud...');
            localData.lastUpdated = Date.now();
            localData.classId = '1/8';
            await ref.set(localData);
            return true;
          }
        } else {
          // Đối với các lớp khác: nếu trên cloud chưa có thì khởi tạo
          if (!snapshot.exists() || !remoteData || !remoteData.students) {
            localData.lastUpdated = Date.now();
            localData.classId = classId;
            await ref.set(localData);
            return true;
          }
        }
        return false;
      } catch (e) {
        console.error('Lỗi kiểm tra dữ liệu khởi tạo Firebase:', e);
        return false;
      }
    },

    // Lắng nghe dữ liệu lớp học thay đổi realtime từ Firebase
    onClassDataChange(callback) {
      if (!this.isInitialized || !this.db) return;
      if (this._currentListenerRef) {
        try { this._currentListenerRef.off(); } catch (e) {}
      }
      const ref = this.getClassRef();
      this._currentListenerRef = ref;
      ref.on('value', snapshot => {
        const data = snapshot.val();
        if (data && data.students) {
          // Bảo vệ: Nếu dữ liệu remote từ Firebase bị tụt về 0 sao trong khi lớp có >= 30 em thì không nhận để tránh mất dữ liệu
          if (this.isPrimaryClass(this.getClassId()) && data.students.length >= 30) {
            const remoteStars = data.students.reduce((sum, s) => sum + (Number(s.stars) || 0), 0);
            if (remoteStars < 100) {
              console.warn('Cảnh báo: Dữ liệu nhận từ Firebase bị 0 sao, từ chối nhận để bảo vệ điểm học sinh!');
              return;
            }
          }
          callback(data);
        }
      });
    },

    // Đẩy toàn bộ dữ liệu lớp học lên Firebase
    async setClassData(data) {
      if (!this.isInitialized || !this.db) return false;
      if (!data || !data.students || data.students.length === 0) return false;

      // Bảo vệ: Tuyệt đối không cho phép đẩy danh sách 0 sao của lớp 1/8 lên Firebase
      if (this.isPrimaryClass(this.getClassId()) && data.students.length >= 30) {
        const totalStars = data.students.reduce((sum, s) => sum + (Number(s.stars) || 0), 0);
        if (totalStars < 100) {
          console.warn('Bảo vệ dữ liệu: Từ chối đẩy danh sách lớp 1/8 có tổng sao = 0 lên Firebase!');
          return false;
        }
      }

      try {
        data.lastUpdated = Date.now();
        data.classId = this.getClassId();
        await this.getClassRef().set(data);
        return true;
      } catch (e) {
        console.error('Lỗi cập nhật Firebase:', e);
        return false;
      }
    },

    // Phụ huynh nộp điểm bài tập về nhà trực tiếp lên Firebase 24/24
    async submitHomework(studentId, { readingCount, writingStars, choresDone, stickerCount = 0, dateStr }) {
      if (!this.isInitialized || !this.db) throw new Error('Firebase chưa kết nối');

      const ref = this.getClassRef();
      const snapshot = await ref.once('value');
      let classData = snapshot.val();

      if (!classData || !classData.students) {
        throw new Error('Dữ liệu lớp học trên đám mây chưa sẵn sàng');
      }

      const studentIndex = classData.students.findIndex(s => s.id === studentId);
      if (studentIndex === -1) {
        throw new Error('Không tìm thấy học sinh');
      }

      const student = classData.students[studentIndex];
      const validDate = dateStr || new Date().toISOString().split('T')[0];

      const rCount = Math.max(0, parseInt(readingCount, 10) || 0);
      const rStars = rCount * 1;
      const wStars = Math.max(0, parseInt(writingStars, 10) || 0);
      const cStars = choresDone ? 5 : 0;
      const sCount = Math.max(0, parseInt(stickerCount, 10) || 0);
      const sStars = sCount * 5;
      const pointsEarned = rStars + wStars + cStars + sStars;

      if (!student.homeworkRecords) student.homeworkRecords = {};
      const prevRecord = student.homeworkRecords[validDate] || { totalStars: 0 };
      const accumulatedTotal = (prevRecord.totalStars || 0) + pointsEarned;

      student.homeworkRecords[validDate] = {
        date: validDate,
        readingCount: rCount,
        readingStars: rStars,
        writingStars: wStars,
        choresDone: !!choresDone,
        choresStars: cStars,
        stickerCount: sCount,
        stickerStars: sStars,
        totalStars: accumulatedTotal,
        updatedAt: Date.now()
      };

      // Cho phép tích điểm liên tục (100 -> 200 -> 300...) khi rèn luyện
      const oldStars = student.stars || 0;
      student.stars = oldStars + pointsEarned;
      const actualAdded = pointsEarned;

      const hatchReq = (typeof window !== 'undefined' && window.EggEvolution) ? window.EggEvolution.getHatchRequirement(student) : { threshold: 100 };
      if (student.stars >= hatchReq.threshold) {
        if (!student.hatchedAt) student.hatchedAt = Date.now();
        if (!student.firstHatchedAt) student.firstHatchedAt = Date.now();
      } else {
        student.hatchedAt = null;
      }

      const group = (classData.groups || []).find(g => g.id === student.group);
      if (group && actualAdded > 0) {
        group.stars = Math.max(0, (group.stars || 0) + actualAdded);
      }

      if (!student.logs) student.logs = [];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} • ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const reasonDetail = `Phụ huynh gửi điểm ở nhà: Đọc ${rCount} lượt (${rStars}⭐), Viết (${wStars}⭐)${sCount > 0 ? `, Sticker ${sCount} cái (${sStars}⭐)` : ''}, Dặn dò (${cStars}⭐)`;
      student.logs.unshift({
        id: 'log-hw-' + Date.now(),
        timestamp: Date.now(),
        time: timeStr,
        points: actualAdded,
        reason: reasonDetail,
        icon: '🏠'
      });
      if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);

      classData.lastUpdated = Date.now();
      await ref.set(classData);

      return {
        status: 'ok',
        student,
        record: student.homeworkRecords[validDate],
        diff: actualAdded,
        data: classData
      };
    },

    // Nhận quà nở trứng trực tiếp trên Firebase (Tối đa 2 lượt) & Tự động hoàn về 0
    async claimStudentGift(studentId, gift, source = 'teacher', milestone = 100) {
      if (!this.isInitialized || !this.db) throw new Error('Firebase chưa kết nối');

      const ref = this.getClassRef();
      const snapshot = await ref.once('value');
      let classData = snapshot.val();
      if (!classData || !classData.students) throw new Error('Dữ liệu chưa sẵn sàng');

      const student = classData.students.find(s => s.id === studentId);
      if (!student) throw new Error('Không tìm thấy học sinh');

      if (!student.giftHistory) student.giftHistory = [];

      // Giới hạn đúng 2 lượt
      if (student.giftHistory.length >= 2) {
        throw new Error('Bé đã hoàn thành 2 lượt nhận quà!');
      }

      if (student.giftSessionSource && student.giftSessionSource !== source) {
        const otherTitle = student.giftSessionSource === 'parent' ? 'Phụ Huynh' : 'Cô Giáo (trên lớp)';
        throw new Error(`Bé đã quay quà tại trang ${otherTitle}! Không thể quay thêm tại đây.`);
      }

      if (!student.giftSessionSource) {
        student.giftSessionSource = source;
      }

      const currentMilestone = milestone || (student.stars >= 200 || student.accumulateBonus ? 200 : 100);
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const record = {
        id: 'gift-' + Date.now(),
        name: gift.name,
        icon: gift.icon || '🎁',
        time: timeStr,
        timestamp: Date.now(),
        claimedBy: source,
        milestone: currentMilestone
      };
      student.giftHistory.push(record);

      if (!classData.giftSummaryRecords) classData.giftSummaryRecords = [];
      const group = (classData.groups || []).find(g => g.id === student.group);

      // Cập nhật quà trên bảng tổng hợp: chỉ tìm bản ghi thật sự đang dang dở (chưa có gift2 và chưa completed)
      let summaryEntry = classData.giftSummaryRecords.find(r => r.studentId === student.id && !r.completed && !r.gift2);

      if (student.giftHistory.length === 1) {
        // Lượt 1: Tạo mới bản ghi tổng hợp hoặc cập nhật gift1
        if (!summaryEntry) {
          summaryEntry = {
            id: 'summary-' + Date.now(),
            studentId: student.id,
            studentName: student.name,
            groupName: group ? group.name : `Tổ ${student.group}`,
            groupColor: group ? group.color : '#64748B',
            milestone: currentMilestone,
            gift1: record,
            gift2: null,
            claimedBy: source,
            dateStr: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
            timeStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            timestamp: Date.now(),
            completed: false,
            delivered: false
          };
          classData.giftSummaryRecords.unshift(summaryEntry);
        } else {
          summaryEntry.gift1 = record;
          summaryEntry.claimedBy = source;
          summaryEntry.milestone = currentMilestone;
          summaryEntry.completed = false;
        }
      } else {
        // Lượt 2: Chắc chắn lấy gift1 từ lượt 1 (student.giftHistory[0]) và gift2 từ lượt 2
        const turn1Gift = student.giftHistory[0] || record;
        const turn2Gift = record;
        if (!summaryEntry) {
          summaryEntry = {
            id: 'summary-' + Date.now(),
            studentId: student.id,
            studentName: student.name,
            groupName: group ? group.name : `Tổ ${student.group}`,
            groupColor: group ? group.color : '#64748B',
            milestone: currentMilestone,
            gift1: turn1Gift,
            gift2: turn2Gift,
            claimedBy: source,
            dateStr: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
            timeStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
            timestamp: Date.now(),
            completed: true,
            delivered: false
          };
          classData.giftSummaryRecords.unshift(summaryEntry);
        } else {
          summaryEntry.gift1 = turn1Gift;
          summaryEntry.gift2 = turn2Gift;
          summaryEntry.claimedBy = source;
          summaryEntry.milestone = currentMilestone;
          summaryEntry.completed = true;
          summaryEntry.timestamp = Date.now();
          summaryEntry.dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
          summaryEntry.timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
      }

      // Tự động hoàn thành chu kỳ nếu đã đủ 2 lượt: tự động hoàn điểm về 0 ⭐ để ấp trứng mới
      if (student.giftHistory.length >= 2) {
        summaryEntry.completed = true;
        summaryEntry.gift1 = student.giftHistory[0] || summaryEntry.gift1;
        summaryEntry.gift2 = student.giftHistory[1] || record;

        student.lastCompletedGifts = [...student.giftHistory];
        const hatchTime = student.hatchedAt || student.firstHatchedAt || Date.now();
        student.previousHatchedAt = hatchTime;
        if (!student.firstHatchedAt) student.firstHatchedAt = hatchTime;
        student.lastHatchedAt = Date.now();
        student.hatchCount = (student.hatchCount || 0) + 1;

        student.stars = 0;
        student.hatchedAt = null;
        student.accumulateBonus = false;
        student.accumulateBonus200 = false;
        student.milestoneChoice = null;
        student.giftHistory = [];
        student.giftSessionSource = null;

        if (!student.logs) student.logs = [];
        const cycleTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} • ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        student.logs.unshift({
          id: 'log-cycle-' + Date.now(),
          timestamp: Date.now(),
          time: cycleTimeStr,
          points: 0,
          reason: `Bắt đầu chu kỳ ấp mới (vừa nhận quà mốc ${currentMilestone}⭐: ${summaryEntry.gift1 ? summaryEntry.gift1.name : ''}, ${record.name})`,
          icon: '🥚'
        });
        if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);
      }

      classData.lastUpdated = Date.now();
      await ref.set(classData);

      return student;
    },

    // Lưu lựa chọn mốc 100⭐ (Quay quà hoàn về 0) hoặc mốc 200⭐ (Cộng dồn tiếp tục)
    async setMilestoneChoice(studentId, choice, milestone = 100) {
      if (!this.isInitialized || !this.db) return false;
      try {
        const ref = this.getClassRef();
        const snapshot = await ref.once('value');
        let classData = snapshot.val();
        if (!classData || !classData.students) return false;
        const student = classData.students.find(s => s.id === studentId);
        if (student) {
          student.milestoneChoice = choice;
          if (choice === 'accumulate') {
            student.accumulateBonus = true;
            student.accumulateBonus200 = true;
          }
          classData.lastUpdated = Date.now();
          await ref.set(classData);
          return true;
        }
      } catch (e) {
        console.error('Lỗi lưu lựa chọn mốc Firebase:', e);
      }
      return false;
    },

    // Hoàn tất mở quà & reset trứng về 0 ⭐ bắt đầu chu kỳ mới (Lưu bảng tổng hợp quà)
    async finishAndResetStudentCycle(studentId) {
      if (!this.isInitialized || !this.db) throw new Error('Firebase chưa kết nối');

      const ref = this.getClassRef();
      const snapshot = await ref.once('value');
      let classData = snapshot.val();
      if (!classData || !classData.students) throw new Error('Dữ liệu chưa sẵn sàng');

      const student = classData.students.find(s => s.id === studentId);
      if (!student) throw new Error('Không tìm thấy học sinh');

      if (!classData.giftSummaryRecords) classData.giftSummaryRecords = [];
      const group = (classData.groups || []).find(g => g.id === student.group);
      const gifts = student.giftHistory || [];

      const summaryEntry = {
        id: 'summary-' + Date.now(),
        studentId: student.id,
        studentName: student.name,
        groupName: group ? group.name : `Tổ ${student.group}`,
        groupColor: group ? group.color : '#64748B',
        gift1: gifts[0] || { name: 'Quà may mắn', icon: '🎁' },
        gift2: gifts[1] || { name: 'Quà may mắn', icon: '🎁' },
        claimedBy: student.giftSessionSource || (gifts[0] && gifts[0].claimedBy) || 'teacher',
        dateStr: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
        timeStr: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
        timestamp: Date.now(),
        delivered: false
      };

      classData.giftSummaryRecords.unshift(summaryEntry);

      // Chuyển trứng về 0 và xóa sạch giao diện cũ để tránh dài dòng rối mắt
      student.stars = 0;
      student.hatchedAt = null;
      student.accumulateBonus = false;
      student.accumulateBonus200 = false;
      student.milestoneChoice = null;
      student.giftHistory = [];
      student.giftSessionSource = null;
      student.logs = [{
        id: 'log-cycle-' + Date.now(),
        time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
        points: 0,
        reason: `Bắt đầu chu kỳ ấp trứng mới (vừa nhận: ${summaryEntry.gift1.name}, ${summaryEntry.gift2.name})`,
        icon: '🥚'
      }];
      student.homeworkRecords = {};
      classData.lastUpdated = Date.now();

      await ref.set(classData);
      return { student, summaryEntry, data: classData };
    },

    // Đánh dấu đã trao quà cho học sinh
    async toggleGiftDelivered(summaryId) {
      if (!this.isInitialized || !this.db) return false;
      try {
        const ref = this.getClassRef();
        const snapshot = await ref.once('value');
        let classData = snapshot.val();
        if (!classData || !classData.giftSummaryRecords) return false;

        const record = classData.giftSummaryRecords.find(r => r.id === summaryId);
        if (record) {
          record.delivered = !record.delivered;
          classData.lastUpdated = Date.now();
          await ref.set(classData);
          return true;
        }
        return false;
      } catch (e) {
        console.error('Lỗi toggle quà Firebase:', e);
        return false;
      }
    },

    // Cập nhật quà tặng cài đặt lên Firebase (Mốc 100⭐ và 200⭐)
    async saveGiftItems(items, items200) {
      if (!this.isInitialized || !this.db) return false;
      try {
        if (items) await this.getClassRef('giftItems').set(items);
        if (items200) await this.getClassRef('giftItems200').set(items200);
        await this.getClassRef('lastUpdated').set(Date.now());
        return true;
      } catch (e) {
        console.error('Lỗi lưu danh sách quà Firebase:', e);
        return false;
      }
    }
  };

  window.FirebaseSync = FirebaseSync;
})();
