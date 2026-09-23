// js/storage.js - Data persistence, multi-tab broadcast, and local API sync
const StorageManager = {
  KEY: 'ung_dung_quan_li_lop_hoc_v1',
  broadcast: null,

  init() {
    if (window.BroadcastChannel) {
      this.broadcast = new BroadcastChannel('class_sync_channel');
    }
  },

  getDefaultData() {
    return {
      className: 'Lớp 1A',
      schoolYear: '2026 - 2027',
      teacherName: 'Cô Giáo',
      groups: [
        { id: 1, name: 'Tổ 1 - Sóc Nhanh Nhẹn', mascot: '🐿️', color: '#FF6B6B', stars: 0 },
        { id: 2, name: 'Tổ 2 - Thỏ Thông Thái', mascot: '🐰', color: '#4ECDC4', stars: 0 },
        { id: 3, name: 'Tổ 3 - Gấu Dũng Cảm', mascot: '🐻', color: '#FFA07A', stars: 0 },
        { id: 4, name: 'Tổ 4 - Hổ Vui Vẻ', mascot: '🐯', color: '#96CEB4', stars: 0 }
      ],
      students: [
        { id: 'hs-1', name: 'Nguyễn Bảo An', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-1', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-2', name: 'Trần Minh Khôi', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-2', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-3', name: 'Lê Tuệ Mẫn', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-3', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-4', name: 'Phạm Gia Huy', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-4', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },

        { id: 'hs-5', name: 'Vũ Ngọc Hân', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-5', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-6', name: 'Đỗ Đức Anh', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-6', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-7', name: 'Hoàng Thùy Chi', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-7', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-8', name: 'Bùi Quang Dũng', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-8', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },

        { id: 'hs-9', name: 'Đặng Mai Phương', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-9', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-10', name: 'Ngô Hải Đăng', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-10', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-11', name: 'Trịnh Khánh Linh', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-11', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-12', name: 'Lý Quốc Bảo', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-12', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },

        { id: 'hs-13', name: 'Dương Gia Linh', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-13', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-14', name: 'Võ Minh Quân', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-14', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-15', name: 'Mai Thảo My', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-15', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] },
        { id: 'hs-16', name: 'Nguyễn Tiến Đạt', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0, logs: [{ id: 'log-init-16', time: '08:00', points: 0, reason: 'Bắt đầu ấp trứng kỳ diệu (0 ⭐)', icon: '🥚' }] }
      ],
      giftItems: [
        { id: 'g-1', name: 'Bút chì siêu đẹp', icon: '✏️' },
        { id: 'g-2', name: 'Bộ lắp ráp Lê gô', icon: '🧩' },
        { id: 'g-3', name: 'Kẹp tóc công chúa', icon: '🎀' },
        { id: 'g-4', name: 'Sổ tay mini đáng yêu', icon: '📓' },
        { id: 'g-5', name: 'Cục tẩy ngộ nghĩnh', icon: '🧼' },
        { id: 'g-6', name: 'Tranh cát sắc màu', icon: '🎨' },
        { id: 'g-7', name: 'Phần quà em yêu thích', icon: '🎁' }
      ],
      lastUpdated: Date.now()
    };
  },

  // Ghi nhận mốc thời gian khi trứng nở (>= 100 sao)
  ensureHatchedTimestamps(data) {
    if (!data || !data.students) return false;
    const now = Date.now();
    let modified = false;

    data.students.forEach(student => {
      const stars = Number(student.stars) || 0;
      if (stars >= 100) {
        if (!student.hatchedAt) {
          student.hatchedAt = now;
          modified = true;
        }
      } else {
        student.hatchedAt = null;
      }
    });

    return modified;
  },

  loadData() {
    if (window.__INITIAL_DATA__ && window.__INITIAL_DATA__.students) {
      try {
        localStorage.setItem(this.KEY, JSON.stringify(window.__INITIAL_DATA__));
      } catch (e) {}
      return window.__INITIAL_DATA__;
    }
    let data = null;
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        data = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read localStorage:', e);
    }
    if (!data) data = this.getDefaultData();
    if (this.ensureHatchedTimestamps(data)) {
      this.saveData(data);
    }
    return data;
  },

  saveData(data) {
    data.lastUpdated = Date.now();
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
      if (this.broadcast) {
        this.broadcast.postMessage({ type: 'DATA_CHANGED', data });
      }
    } catch (e) {
      console.error('Error saving data:', e);
    }

    // Try background sync with server if available
    this.syncToServer(data);

    // Đồng bộ lên Google Firebase Đám Mây (nếu có kết nối)
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      window.FirebaseSync.setClassData(data);
    }
  },

  async syncToServer(data) {
    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (err) {
        // Silent catch for offline or standalone
      }
    }
  },

  async pullFromServer() {
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.students) {
            this.ensureHatchedTimestamps(json.data);
            localStorage.setItem(this.KEY, JSON.stringify(json.data));
            return json.data;
          }
        }
      } catch (err) {
        // Fallback to local
      }
    }
    return this.loadData();
  },

  // Helper methods
  getTimeString() {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  addPointsToStudent(studentId, points, reason, icon = '⭐') {
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    // Không cho tích sao nữa nếu đã đạt 100 sao (bắt buộc mở quà nhận thưởng)
    if ((student.stars || 0) >= 100 && points > 0) {
      return { student, capped: true, data };
    }

    const oldStars = student.stars || 0;
    student.stars = Math.min(100, Math.max(0, oldStars + points));
    const actualPoints = student.stars - oldStars;

    // Cập nhật mốc thời gian trứng nở (>= 100 sao)
    if (student.stars >= 100) {
      if (!student.hatchedAt) student.hatchedAt = Date.now();
    } else {
      student.hatchedAt = null;
    }

    // If sleeping, receiving positive star can wake up
    if (student.status === 'sleeping' && points > 0) {
      student.status = 'active';
      student.sleepUntil = 0;
    }

    // Add log
    if (!student.logs) student.logs = [];
    student.logs.unshift({
      id: 'log-' + Date.now(),
      time: this.getTimeString(),
      points,
      reason,
      icon
    });
    // Keep max 25 recent logs
    if (student.logs.length > 25) {
      student.logs = student.logs.slice(0, 25);
    }

    // Update corresponding group points too
    const group = data.groups.find(g => g.id === student.group);
    if (group && actualPoints !== 0) {
      group.stars = Math.max(0, group.stars + actualPoints);
    }

    this.saveData(data);
    return { student, group, data, actualPoints };
  },

  addPointsToGroup(groupId, points, reason, icon = '🌟') {
    const data = this.loadData();
    const group = data.groups.find(g => g.id === groupId);
    if (!group) return null;

    group.stars = Math.max(0, group.stars + points);

    // Also distribute to members in the group (không cộng thêm nếu đã đạt 100 sao)
    const members = data.students.filter(s => s.group === groupId);
    members.forEach(s => {
      if ((s.stars || 0) >= 100 && points > 0) return;
      const oldStars = s.stars || 0;
      s.stars = Math.min(100, Math.max(0, oldStars + points));
      const sActual = s.stars - oldStars;
      if (s.stars >= 100 && !s.hatchedAt) s.hatchedAt = Date.now();

      if (!s.logs) s.logs = [];
      s.logs.unshift({
        id: 'log-' + Date.now() + '-' + s.id,
        time: this.getTimeString(),
        points: sActual,
        reason: `${reason} (${group.name})`,
        icon
      });
      if (s.logs.length > 25) s.logs = s.logs.slice(0, 25);
    });

    this.saveData(data);
    return { group, members, data };
  },

  addPointsToAll(points, reason, icon = '🏆') {
    const data = this.loadData();
    data.groups.forEach(g => {
      g.stars = Math.max(0, g.stars + points);
    });
    data.students.forEach(s => {
      if (s.status === 'sleeping') s.status = 'active';
      if ((s.stars || 0) >= 100 && points > 0) return;
      const oldStars = s.stars || 0;
      s.stars = Math.min(100, Math.max(0, oldStars + points));
      const sActual = s.stars - oldStars;
      if (s.stars >= 100 && !s.hatchedAt) s.hatchedAt = Date.now();

      if (!s.logs) s.logs = [];
      s.logs.unshift({
        id: 'log-' + Date.now() + '-' + s.id,
        time: this.getTimeString(),
        points: sActual,
        reason,
        icon
      });
      if (s.logs.length > 25) s.logs = s.logs.slice(0, 25);
    });
    this.saveData(data);
    return data;
  },

  setSleeping(studentId, durationMinutes = 2) {
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    student.status = 'sleeping';
    student.sleepUntil = Date.now() + durationMinutes * 60 * 1000;
    if (!student.logs) student.logs = [];
    student.logs.unshift({
      id: 'log-' + Date.now(),
      time: this.getTimeString(),
      points: 0,
      reason: 'Thú cưng đi ngủ (Tĩnh tâm 2 phút để giữ trật tự)',
      icon: '💤'
    });

    this.saveData(data);
    return { student, data };
  },

  wakeUp(studentId) {
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    student.status = 'active';
    student.sleepUntil = 0;
    if (!student.logs) student.logs = [];
    student.logs.unshift({
      id: 'log-' + Date.now(),
      time: this.getTimeString(),
      points: 1,
      reason: 'Bé đã ngồi ngoan, thú cưng thức dậy!',
      icon: '✨'
    });
    student.stars += 1;

    this.saveData(data);
    return { student, data };
  },

  addParentLike(studentId) {
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    student.likes = (student.likes || 0) + 1;
    this.saveData(data);
    return student.likes;
  },

  importStudentsList(rawNamesList, autoAssignGroups = true, replaceExisting = true) {
    const data = this.loadData();
    let currentStudents = replaceExisting ? [] : [...data.students];

    // Filter out empty lines
    const validEntries = rawNamesList
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (validEntries.length === 0) return data;

    let nextIdIndex = currentStudents.length + 1;

    validEntries.forEach((entry, idx) => {
      // Check if entry has group specified e.g. "Nguyễn An - Tổ 2" or "Nguyễn An, Tổ 2" or "Nguyễn An, 2"
      let name = entry;
      let assignedGroup = 1;

      const groupMatch = entry.match(/[-,\t;]\s*(?:Tổ\s*)?([1-4])/i);
      if (groupMatch) {
        assignedGroup = parseInt(groupMatch[1], 10);
        name = entry.replace(/[-,\t;]\s*(?:Tổ\s*)?[1-4]/i, '').trim();
      } else if (autoAssignGroups) {
        assignedGroup = (idx % 4) + 1;
      }

      currentStudents.push({
        id: 'hs-' + Date.now() + '-' + nextIdIndex++,
        name,
        group: assignedGroup,
        stars: 0,
        status: 'active',
        sleepUntil: 0,
        likes: 0,
        logs: [
          {
            id: 'log-init-' + Date.now(),
            time: this.getTimeString(),
            points: 0,
            reason: 'Bắt đầu ấp trứng kỳ diệu!',
            icon: '🥚'
          }
        ]
      });
    });

    data.students = currentStudents;
    if (replaceExisting) {
      // Reset group stars as well
      data.groups.forEach(g => { g.stars = 0; });
    }

    this.saveData(data);
    return data;
  },

  deleteStudent(studentId) {
    const data = this.loadData();
    data.students = data.students.filter(s => s.id !== studentId);
    this.saveData(data);
    return data;
  },

  updateStudentName(studentId, newName) {
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (student) {
      student.name = (newName || '').trim();
      this.saveData(data);
    }
    return data;
  },

  updateStudentGroup(studentId, newGroupId) {
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (student) {
      student.group = parseInt(newGroupId, 10);
      this.saveData(data);
    }
    return data;
  },

  clearAllStudents() {
    const data = this.loadData();
    data.students = [];
    data.groups.forEach(g => { g.stars = 0; });
    this.saveData(data);
    return data;
  },

  exportCSV() {
    const data = this.loadData();
    // Use UTF-8 BOM so Excel opens Vietnamese characters cleanly
    let csv = '\uFEFF"STT","Họ và tên","Tổ","Số sao","Trạng thái linh thú"\n';
    data.students.forEach((s, idx) => {
      const group = data.groups.find(g => g.id === s.group) || { name: `Tổ ${s.group}` };
      const stage = window.EggEvolution ? window.EggEvolution.getStage(s.stars) : { name: 'Thần thú' };
      csv += `"${idx + 1}","${s.name.replace(/"/g, '""')}","${group.name}","${s.stars}","${stage.name}"\n`;
    });
    return csv;
  },

  getTodayDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getFormattedDateVietnamese(dateStr) {
    const d = dateStr ? new Date(dateStr) : new Date();
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = days[d.getDay()];
    const dateNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const yearNum = d.getFullYear();
    return `${dayName}, ngày ${dateNum}/${monthNum}/${yearNum}`;
  },

  resetAllToZero() {
    const data = this.loadData();
    data.students.forEach(s => {
      s.stars = 0;
      s.hatchedAt = null;
      s.status = 'active';
      s.sleepUntil = 0;
      s.homeworkRecords = {};
      if (!s.logs) s.logs = [];
      s.logs.unshift({
        id: 'log-reset-' + Date.now(),
        time: this.getTimeString(),
        points: 0,
        reason: 'Bắt đầu chu kỳ ấp trứng mới (0 sao)',
        icon: '🥚'
      });
      if (s.logs.length > 25) s.logs = s.logs.slice(0, 25);
    });
    data.groups.forEach(g => {
      g.stars = 0;
    });
    this.saveData(data);
    return data;
  },

  async submitHomework(studentId, { readingCount, writingStars, choresDone, dateStr }) {
    const validDate = dateStr || this.getTodayDateString();
    const rCount = Math.max(0, parseInt(readingCount, 10) || 0);
    const rStars = rCount * 1;
    const wStars = Math.max(0, Math.min(3, parseInt(writingStars, 10) || 0));
    const cStars = choresDone ? 5 : 0;
    const totalStars = rStars + wStars + cStars;

    // 1. Ưu tiên hàng đầu: Gửi trực tiếp lên Google Firebase Đám Mây 24/24
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      try {
        const fbResult = await window.FirebaseSync.submitHomework(studentId, {
          readingCount: rCount,
          writingStars: wStars,
          choresDone: !!choresDone,
          dateStr: validDate
        });
        if (fbResult && fbResult.data) {
          localStorage.setItem(this.KEY, JSON.stringify(fbResult.data));
          if (this.broadcast) {
            this.broadcast.postMessage({ type: 'DATA_CHANGED', data: fbResult.data });
          }
          this.syncToServer(fbResult.data);
          return fbResult;
        }
      } catch (fbErr) {
        console.warn('Lỗi gửi Firebase, chuyển sang kênh API dự phòng:', fbErr);
      }
    }

    // 2. Tiếp theo: Gọi API server để đồng bộ (nếu chạy server nội bộ)
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/homework', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            readingCount: rCount,
            writingStars: wStars,
            choresDone: !!choresDone,
            dateStr: validDate
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            localStorage.setItem(this.KEY, JSON.stringify(json.data));
            if (this.broadcast) {
              this.broadcast.postMessage({ type: 'DATA_CHANGED', data: json.data });
            }
            return json;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Máy chủ báo lỗi: ${res.status}`);
        }
      } catch (err) {
        console.error('Lỗi gửi API homework:', err);
        throw new Error('Không thể kết nối đến máy tính của cô giáo! Đường link có thể đã hết hạn hoặc thiết bị mất mạng. Bố mẹ vui lòng xin lại đường link Zalo mới nhất từ cô giáo nhé!');
      }
    }

    // Dự phòng lưu nội bộ nếu không có mạng / standalone
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    if (!student.homeworkRecords) student.homeworkRecords = {};
    const prev = student.homeworkRecords[validDate] || { totalStars: 0 };
    const accumulatedTotal = (prev.totalStars || 0) + totalStars;

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

    student.stars = Math.max(0, (student.stars || 0) + totalStars);
    if (student.stars >= 100) {
      if (!student.hatchedAt) student.hatchedAt = Date.now();
    } else {
      student.hatchedAt = null;
    }

    const group = data.groups.find(g => g.id === student.group);
    if (group) {
      group.stars = Math.max(0, (group.stars || 0) + totalStars);
    }

    if (!student.logs) student.logs = [];
    student.logs.unshift({
      id: 'log-hw-' + Date.now(),
      time: this.getTimeString(),
      points: totalStars,
      reason: `Phụ huynh gửi điểm ở nhà: Đọc ${rCount} lượt (${rStars}⭐), Viết (${wStars}⭐), Dặn dò (${cStars}⭐)`,
      icon: '🏠'
    });
    if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);

    this.saveData(data);
    return { status: 'ok', student, record: student.homeworkRecords[validDate], diff: totalStars, data };
  },

  getDailySummary(dateStr) {
    const data = this.loadData();
    const targetDate = dateStr || this.getTodayDateString();
    
    let totalHomeStars = 0;
    let submittedCount = 0;
    const records = [];

    data.students.forEach(s => {
      const rec = s.homeworkRecords ? s.homeworkRecords[targetDate] : null;
      if (rec) {
        totalHomeStars += rec.totalStars || 0;
        submittedCount++;
        records.push({
          student: s,
          record: rec
        });
      }
    });

    return {
      date: targetDate,
      totalStudents: data.students.length,
      submittedCount,
      totalHomeStars,
      records
    };
  },

  getWeeklySummary() {
    const data = this.loadData();
    // Sắp xếp học sinh theo điểm sao giảm dần
    const sorted = [...data.students].sort((a, b) => (b.stars || 0) - (a.stars || 0));
    // Quy định: >= 100 sao thì con vật nở
    const hatched = sorted.filter(s => (s.stars || 0) >= 100);
    const inProgress = sorted.filter(s => (s.stars || 0) < 100);

    return {
      totalStudents: data.students.length,
      hatchedCount: hatched.length,
      inProgressCount: inProgress.length,
      hatched,
      inProgress,
      rankedStudents: sorted,
      groups: [...data.groups].sort((a, b) => (b.stars || 0) - (a.stars || 0))
    };
  },

  // Quản lý danh sách quà tặng (Túi mù & Vòng quay)
  getGiftItems() {
    const data = this.loadData();
    if (!data.giftItems || data.giftItems.length === 0) {
      return this.getDefaultData().giftItems;
    }
    return data.giftItems;
  },

  async saveGiftItems(items) {
    const data = this.loadData();
    data.giftItems = items;
    data.lastUpdated = Date.now();

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch('/api/gifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giftItems: items })
        });
      } catch (e) {}
    }

    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      window.FirebaseSync.saveGiftItems(items);
    }

    this.saveData(data);
    return items;
  },

  // Lưu lịch sử nhận quà của học sinh (Tối đa 2 lượt)
  async claimStudentGift(studentId, gift, source = 'teacher') {
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      try {
        const fbStudent = await window.FirebaseSync.claimStudentGift(studentId, gift, source);
        if (fbStudent) return fbStudent;
      } catch (e) {
        console.warn('Lỗi nhận quà qua Firebase:', e);
      }
    }

    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/claim-gift', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, gift, source })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            localStorage.setItem(this.KEY, JSON.stringify(json.data));
            if (this.broadcast) {
              this.broadcast.postMessage({ type: 'DATA_CHANGED', data: json.data });
            }
            return json.student;
          }
        }
      } catch (e) {}
    }

    // Fallback lưu local
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    if (!student.giftHistory) student.giftHistory = [];
    if (student.giftHistory.length >= 2) return student;

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
    this.saveData(data);
    return student;
  },

  // Hoàn tất mở quà & reset trứng về 0 ⭐ bắt đầu chu kỳ mới (Lưu bảng tổng hợp quà)
  async finishAndResetStudentCycle(studentId) {
    // 1. Firebase nếu có
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      try {
        const res = await window.FirebaseSync.finishAndResetStudentCycle(studentId);
        if (res && res.data) {
          localStorage.setItem(this.KEY, JSON.stringify(res.data));
          if (this.broadcast) {
            this.broadcast.postMessage({ type: 'DATA_CHANGED', data: res.data });
          }
          this.syncToServer(res.data);
          return res;
        }
      } catch (e) {
        console.warn('Lỗi reset Firebase:', e);
      }
    }

    // 2. Server API nếu có
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/reset-cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            localStorage.setItem(this.KEY, JSON.stringify(json.data));
            if (this.broadcast) {
              this.broadcast.postMessage({ type: 'DATA_CHANGED', data: json.data });
            }
            return json;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback LocalStorage
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    if (!data.giftSummaryRecords) data.giftSummaryRecords = [];
    const group = (data.groups || []).find(g => g.id === student.group);
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

    data.giftSummaryRecords.unshift(summaryEntry);

    student.stars = 0;
    student.hatchedAt = null;
    student.giftHistory = [];
    student.giftSessionSource = null;
    student.logs = [{
      id: 'log-cycle-' + Date.now(),
      time: this.getTimeString(),
      points: 0,
      reason: `Bắt đầu chu kỳ ấp trứng mới (vừa nhận: ${summaryEntry.gift1.name}, ${summaryEntry.gift2.name})`,
      icon: '🥚'
    }];
    student.homeworkRecords = {};

    this.saveData(data);
    return { student, summaryEntry, data };
  },

  // Đánh dấu đã trao quà cho học sinh
  async toggleGiftDelivery(summaryId) {
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      window.FirebaseSync.toggleGiftDelivered(summaryId);
    }
    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch('/api/toggle-gift-delivered', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ summaryId })
        });
      } catch (e) {}
    }
    const data = this.loadData();
    if (data.giftSummaryRecords) {
      const rec = data.giftSummaryRecords.find(r => r.id === summaryId);
      if (rec) {
        rec.delivered = !rec.delivered;
        this.saveData(data);
      }
    }
  },

  getGiftSummaryRecords() {
    const data = this.loadData();
    return data.giftSummaryRecords || [];
  }
};

window.StorageManager = StorageManager;
