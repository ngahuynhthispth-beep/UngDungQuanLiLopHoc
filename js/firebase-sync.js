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

    // Đảm bảo dữ liệu lớp học có sẵn trên Firebase khi mới kết nối lần đầu
    async ensureInitialData(localData) {
      if (!this.isInitialized || !this.db || !localData || !localData.students) return false;
      try {
        const ref = this.db.ref('classData');
        const snapshot = await ref.once('value');
        const remoteData = snapshot.val();

        const remoteIsSample = remoteData && remoteData.students && remoteData.students.some(s => s.name === 'Đỗ Đức Anh') && remoteData.students.length === 16;
        const localIsReal = localData.students.length > 16 || !localData.students.some(s => s.name === 'Đỗ Đức Anh');
        const needsSync = !snapshot.exists() || !remoteData || !remoteData.students ||
          (localData.students.length > remoteData.students.length) ||
          (remoteIsSample && localIsReal) ||
          ((localData.lastUpdated || 0) > (remoteData.lastUpdated || 0));

        if (needsSync) {
          console.log('Đang đẩy dữ liệu lớp học mới nhất lên Firebase Cloud...');
          localData.lastUpdated = Date.now();
          await ref.set(localData);
          return true;
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
      const ref = this.db.ref('classData');
      ref.on('value', snapshot => {
        const data = snapshot.val();
        if (data && data.students) {
          callback(data);
        }
      });
    },

    // Đẩy toàn bộ dữ liệu lớp học lên Firebase
    async setClassData(data) {
      if (!this.isInitialized || !this.db) return false;
      try {
        data.lastUpdated = Date.now();
        await this.db.ref('classData').set(data);
        return true;
      } catch (e) {
        console.error('Lỗi cập nhật Firebase:', e);
        return false;
      }
    },

    // Phụ huynh nộp điểm bài tập về nhà trực tiếp lên Firebase 24/24
    async submitHomework(studentId, { readingCount, writingStars, choresDone, dateStr }) {
      if (!this.isInitialized || !this.db) throw new Error('Firebase chưa kết nối');

      const ref = this.db.ref('classData');
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
      const wStars = Math.max(0, Math.min(3, parseInt(writingStars, 10) || 0));
      const cStars = choresDone ? 5 : 0;
      const pointsEarned = rStars + wStars + cStars;

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
        totalStars: accumulatedTotal,
        updatedAt: Date.now()
      };

      // Không cho tích sao nếu đã đạt 100 sao (bắt buộc mở quà nhận thưởng)
      let actualAdded = 0;
      if ((student.stars || 0) >= 100) {
        actualAdded = 0;
      } else {
        const oldStars = student.stars || 0;
        student.stars = Math.min(100, oldStars + pointsEarned);
        actualAdded = student.stars - oldStars;
        if (student.stars >= 100) {
          if (!student.hatchedAt) student.hatchedAt = Date.now();
        }
      }

      const group = (classData.groups || []).find(g => g.id === student.group);
      if (group && actualAdded > 0) {
        group.stars = Math.max(0, (group.stars || 0) + actualAdded);
      }

      if (!student.logs) student.logs = [];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      student.logs.unshift({
        id: 'log-hw-' + Date.now(),
        time: timeStr,
        points: actualAdded,
        reason: `Phụ huynh gửi điểm ở nhà: Đọc ${rCount} lượt (${rStars}⭐), Viết (${wStars}⭐), Dặn dò (${cStars}⭐)`,
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

    // Nhận quà nở trứng trực tiếp trên Firebase (Tối đa 2 lượt)
    async claimStudentGift(studentId, gift, source = 'teacher') {
      if (!this.isInitialized || !this.db) throw new Error('Firebase chưa kết nối');

      const ref = this.db.ref('classData');
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

      if (!student.giftSessionSource) {
        student.giftSessionSource = source;
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
      const record = {
        id: 'gift-' + Date.now(),
        name: gift.name,
        icon: gift.icon || '🎁',
        time: timeStr,
        timestamp: Date.now(),
        claimedBy: source
      };
      student.giftHistory.push(record);
      classData.lastUpdated = Date.now();
      await ref.set(classData);

      return student;
    },

    // Hoàn tất mở quà & reset trứng về 0 ⭐ bắt đầu chu kỳ mới (Lưu bảng tổng hợp quà)
    async finishAndResetStudentCycle(studentId) {
      if (!this.isInitialized || !this.db) throw new Error('Firebase chưa kết nối');

      const ref = this.db.ref('classData');
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
        const ref = this.db.ref('classData');
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

    // Cập nhật quà tặng cài đặt lên Firebase
    async saveGiftItems(items) {
      if (!this.isInitialized || !this.db) return false;
      try {
        await this.db.ref('classData/giftItems').set(items);
        await this.db.ref('classData/lastUpdated').set(Date.now());
        return true;
      } catch (e) {
        console.error('Lỗi lưu danh sách quà Firebase:', e);
        return false;
      }
    }
  };

  window.FirebaseSync = FirebaseSync;
})();
