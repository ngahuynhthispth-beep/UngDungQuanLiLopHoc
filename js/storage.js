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
      lastUpdated: Date.now()
    };
  },

  loadData() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read localStorage:', e);
    }
    const defaultData = this.getDefaultData();
    this.saveData(defaultData);
    return defaultData;
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

    student.stars = Math.max(0, student.stars + points);

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
    if (group) {
      group.stars = Math.max(0, group.stars + points);
    }

    this.saveData(data);
    return { student, group, data };
  },

  addPointsToGroup(groupId, points, reason, icon = '🌟') {
    const data = this.loadData();
    const group = data.groups.find(g => g.id === groupId);
    if (!group) return null;

    group.stars = Math.max(0, group.stars + points);

    // Also distribute to members in the group
    const members = data.students.filter(s => s.group === groupId);
    members.forEach(s => {
      s.stars = Math.max(0, s.stars + points);
      if (!s.logs) s.logs = [];
      s.logs.unshift({
        id: 'log-' + Date.now() + '-' + s.id,
        time: this.getTimeString(),
        points,
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
      s.stars = Math.max(0, s.stars + points);
      if (s.status === 'sleeping') s.status = 'active';
      if (!s.logs) s.logs = [];
      s.logs.unshift({
        id: 'log-' + Date.now() + '-' + s.id,
        time: this.getTimeString(),
        points,
        reason: `Cả lớp: ${reason}`,
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
      s.status = 'active';
      s.sleepUntil = 0;
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
    const rCount = Math.max(0, Math.min(20, parseInt(readingCount, 10) || 0));
    const rStars = rCount * 1;
    const wStars = Math.max(0, Math.min(3, parseInt(writingStars, 10) || 0));
    const cStars = choresDone ? 5 : 0;
    const totalStars = rStars + wStars + cStars;

    // Ưu tiên gọi API server để đồng bộ và chống ghi đè
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
        }
      } catch (err) {
        console.warn('Lỗi gửi API homework, chuyển sang lưu nội bộ:', err);
      }
    }

    // Dự phòng lưu nội bộ nếu không có mạng / standalone
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    if (!student.homeworkRecords) student.homeworkRecords = {};
    const prev = student.homeworkRecords[validDate] || { totalStars: 0 };
    const starDiff = totalStars - (prev.totalStars || 0);

    student.homeworkRecords[validDate] = {
      date: validDate,
      readingCount: rCount,
      readingStars: rStars,
      writingStars: wStars,
      choresDone: !!choresDone,
      choresStars: cStars,
      totalStars,
      updatedAt: Date.now()
    };

    student.stars = Math.max(0, (student.stars || 0) + starDiff);

    const group = data.groups.find(g => g.id === student.group);
    if (group) {
      group.stars = Math.max(0, (group.stars || 0) + starDiff);
    }

    if (!student.logs) student.logs = [];
    student.logs.unshift({
      id: 'log-hw-' + Date.now(),
      time: this.getTimeString(),
      points: totalStars,
      reason: `Phụ huynh ghi nhận: Đọc ${rCount} lượt (${rStars}⭐), Viết (${wStars}⭐), Dặn dò (${cStars}⭐)`,
      icon: '🏠'
    });
    if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);

    this.saveData(data);
    return { status: 'ok', student, record: student.homeworkRecords[validDate], diff: starDiff, data };
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
    // Quy định: > 70 sao thì con vật nở (tức là từ 71 sao trở lên)
    const hatched = sorted.filter(s => (s.stars || 0) >= 71);
    const inProgress = sorted.filter(s => (s.stars || 0) < 71);

    return {
      totalStudents: data.students.length,
      hatchedCount: hatched.length,
      inProgressCount: inProgress.length,
      hatched,
      inProgress,
      rankedStudents: sorted,
      groups: [...data.groups].sort((a, b) => (b.stars || 0) - (a.stars || 0))
    };
  }
};

window.StorageManager = StorageManager;
