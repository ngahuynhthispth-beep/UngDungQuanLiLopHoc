// js/storage.js - Data persistence, multi-tab broadcast, and local API sync
const StorageManager = {
  KEY: 'ung_dung_quan_li_lop_hoc_v1',
  broadcast: null,

  isPrimaryClass(id) {
    if (window.FirebaseSync && typeof window.FirebaseSync.isPrimaryClass === 'function') {
      return window.FirebaseSync.isPrimaryClass(id);
    }
    if (!id) return true;
    const s = String(id).trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return s === '18' || s === '1A';
  },

  getClassId() {
    if (window.FirebaseSync && typeof window.FirebaseSync.getClassId === 'function') {
      return window.FirebaseSync.getClassId();
    }
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('class') || params.get('lop');
      if (fromUrl) {
        const str = fromUrl.trim();
        if (this.isPrimaryClass(str)) return '1/8';
        return str.replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || '1/8';
      }
    }
    try {
      const saved = localStorage.getItem('lop_hoc_current_class_id') || localStorage.getItem('magic_zoo_class_id');
      if (saved) {
        const str = saved.trim();
        if (this.isPrimaryClass(str)) return '1/8';
        return str.replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || '1/8';
      }
    } catch (e) {}
    return '1/8';
  },

  setClassId(id) {
    let clean = (id || '1/8').trim();
    if (this.isPrimaryClass(clean)) {
      clean = '1/8';
    } else {
      clean = clean.replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase() || '1/8';
    }
    try {
      localStorage.setItem('lop_hoc_current_class_id', clean);
      localStorage.setItem('magic_zoo_class_id', clean);
    } catch (e) {}
    if (window.FirebaseSync && typeof window.FirebaseSync.setClassId === 'function') {
      window.FirebaseSync.setClassId(clean);
    }
    return clean;
  },

  getStorageKey() {
    const id = this.getClassId();
    if (this.isPrimaryClass(id)) {
      return this.KEY; // Đảm bảo lớp 1/8 nguyên vẹn 100% dữ liệu gốc
    }
    return `${this.KEY}_${id.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
  },

  getAllRegisteredClasses() {
    const map = new Map();
    // 1. Luôn bảo toàn Lớp 1/8 Trường TH Tiểu La làm lớp gốc
    map.set('1/8', { id: '1/8', name: 'Lớp 1/8 - TH Tiểu La', count: 36, isPrimary: true });

    // 2. Quét toàn bộ các lớp đã lưu trong LocalStorage của trình duyệt
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.KEY + '_')) {
          const rawId = k.substring((this.KEY + '_').length);
          if (rawId) {
            try {
              const val = JSON.parse(localStorage.getItem(k));
              const displayId = rawId.replace(/-/g, '/');
              const cName = (val && val.className) ? val.className : `Lớp ${displayId}`;
              const count = (val && val.students) ? val.students.length : 0;
              map.set(displayId, { id: displayId, name: cName, count: count, isPrimary: false });
            } catch (err) {}
          }
        }
      }
    } catch (e) {}

    // 3. Quét registry danh mục lớp mở rộng
    try {
      const reg = localStorage.getItem('magic_zoo_classes_registry');
      if (reg) {
        const arr = JSON.parse(reg);
        if (Array.isArray(arr)) {
          arr.forEach(c => {
            if (c && c.id && !this.isPrimaryClass(c.id)) {
              if (!map.has(c.id)) {
                map.set(c.id, { id: c.id, name: c.name || `Lớp ${c.id}`, count: c.count || 0, isPrimary: false });
              }
            }
          });
        }
      }
    } catch (e) {}

    return Array.from(map.values());
  },

  registerClass(classId, className, studentCount) {
    if (!classId || this.isPrimaryClass(classId)) return;
    try {
      const list = this.getAllRegisteredClasses();
      const existing = list.find(x => x.id === classId);
      if (existing) {
        if (className) existing.name = className;
        if (studentCount !== undefined) existing.count = studentCount;
      } else {
        list.push({
          id: classId,
          name: className || `Lớp ${classId}`,
          count: studentCount || 0,
          isPrimary: false
        });
      }
      localStorage.setItem('magic_zoo_classes_registry', JSON.stringify(list.filter(x => !x.isPrimary)));

      // Đồng bộ registry lên Firebase nếu có kết nối
      if (window.FirebaseSync && window.FirebaseSync.isInitialized && window.FirebaseSync.db) {
        const safeKey = String(classId).replace(/\//g, '-').replace(/[^a-zA-Z0-9_-]/g, '');
        window.FirebaseSync.db.ref('classes_registry/' + safeKey).set({
          id: classId,
          name: className || `Lớp ${classId}`,
          count: studentCount || 0,
          updatedAt: Date.now()
        }).catch(() => {});
      }
    } catch (e) {}
  },

  init() {
    if (window.BroadcastChannel) {
      this.broadcast = new BroadcastChannel('class_sync_channel');
    }
  },

  DEFAULT_GIFTS: [
    { id: 'g-1', name: 'Bút chì siêu đẹp', icon: '✏️' },
    { id: 'g-2', name: 'Bộ lắp ráp Lê gô', icon: '🧩' },
    { id: 'g-3', name: 'Kẹp tóc công chúa', icon: '🎀' },
    { id: 'g-4', name: 'Sổ tay mini đáng yêu', icon: '📓' },
    { id: 'g-5', name: 'Cục tẩy ngộ nghĩnh', icon: '🧼' },
    { id: 'g-6', name: 'Tranh cát sắc màu', icon: '🎨' },
    { id: 'g-7', name: 'Phần quà em yêu thích', icon: '🎁' }
  ],
  DEFAULT_GIFTS_200: [
    { id: 'g200-1', name: 'Được làm lớp trưởng 3 ngày', icon: '👑' },
    { id: 'g200-2', name: 'Được ba mẹ dắt đi siêu thị mua quà yêu thích', icon: '🛒' },
    { id: 'g200-3', name: 'Được ăn một món ăn em yêu thích', icon: '🍦' },
    { id: 'g200-4', name: 'Gấu bông xinh xắn', icon: '🧸' },
    { id: 'g200-5', name: 'Bộ xếp hình Lê gô cao cấp', icon: '🧩' },
    { id: 'g200-6', name: 'Bộ cờ vua thông minh', icon: '♟️' },
    { id: 'g200-7', name: 'Bộ cờ cá ngựa vui nhộn', icon: '🐴' },
    { id: 'g200-8', name: 'Phần quà đặc biệt tự chọn', icon: '🎁' }
  ],

  getDefaultData(customClassId, customClassName) {
    const classId = customClassId || this.getClassId();
    const isDefaultClass = this.isPrimaryClass(classId);
    const className = customClassName || (isDefaultClass ? 'Lớp 1/8' : `Lớp ${classId}`);
    return {
      classId: isDefaultClass ? '1/8' : classId,
      className: className,
      schoolName: 'Trường Tiểu học Tiểu La',
      schoolYear: '2026 - 2027',
      teacherName: 'Cô Giáo',
      groups: [
        { id: 1, name: 'Tổ 1 - Sóc Nhanh Nhẹn', mascot: '🐿️', color: '#FF6B6B', stars: 0 },
        { id: 2, name: 'Tổ 2 - Thỏ Thông Thái', mascot: '🐰', color: '#4ECDC4', stars: 0 },
        { id: 3, name: 'Tổ 3 - Gấu Dũng Cảm', mascot: '🐻', color: '#FFA07A', stars: 0 },
        { id: 4, name: 'Tổ 4 - Hổ Vui Vẻ', mascot: '🐯', color: '#96CEB4', stars: 0 }
      ],
      students: isDefaultClass ? [
        { id: 'hs-1790097391777-1', name: 'Quốc An', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-2', name: 'Minh An', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-3', name: 'Phúc Anh', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-4', name: 'Nguyên Bình', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-5', name: 'Thanh Bình', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-6', name: 'Bảo Đăng', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-7', name: 'Yên Di', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-8', name: 'Ánh Dương', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-9', name: 'Bảo Hân', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-10', name: 'Phạm Bảo Hân', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-11', name: 'Công Hậu', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-12', name: 'Gia Hưng', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-13', name: 'Hà Kha', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-14', name: 'Minh Khang', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-15', name: 'Gia Khánh', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-16', name: 'Minh Khôi', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-17', name: 'Đăng Khôi', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-18', name: 'Minh Khuê', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-19', name: 'Bảo Lam', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-20', name: 'Vy Lê', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-21', name: 'Bảo Long', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-22', name: 'Huyền My', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-23', name: 'Hoàng Ngân', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-24', name: 'Minh Nhật', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-25', name: 'An Nhiên', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-26', name: 'Hoàng Phúc', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-27', name: 'Uyên Phương', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-28', name: 'Hoàng Quân', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-29', name: 'Anh Quân', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-30', name: 'Tuệ Tâm', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-31', name: 'Hương Thảo', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-32', name: 'Anh Thư', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-33', name: 'Bảo Trân', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-34', name: 'Nhã Uyên', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-35', name: 'Ngọc Uyên', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-1790097391777-36', name: 'Hải Yến', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 }
      ] : [
        { id: 'hs-custom-1', name: 'Bảo An', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-2', name: 'Gia Bảo', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-3', name: 'Minh Châu', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-4', name: 'Tuấn Đạt', group: 1, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-5', name: 'Hương Giang', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-6', name: 'Gia Huy', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-7', name: 'Khánh Linh', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-8', name: 'Đức Minh', group: 2, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-9', name: 'Kim Ngân', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-10', name: 'Hoàng Nam', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-11', name: 'Thảo Nguyên', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-12', name: 'Minh Phong', group: 3, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-13', name: 'Như Quỳnh', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-14', name: 'Quốc Thịnh', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-15', name: 'Phương Uyên', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 },
        { id: 'hs-custom-16', name: 'Quang Vinh', group: 4, stars: 0, status: 'active', sleepUntil: 0, likes: 0 }
      ],
      giftItems: [...this.DEFAULT_GIFTS],
      giftItems200: [...this.DEFAULT_GIFTS_200],
      lastUpdated: Date.now()
    };
  },

  // Ghi nhận mốc thời gian khi trứng nở (100 sao, hoặc 150 sao đối với học sinh quá giỏi dưới 3 ngày)
  ensureHatchedTimestamps(data) {
    if (!data || !data.students) return false;
    const now = Date.now();
    let modified = false;

    data.students.forEach(student => {
      const stars = Number(student.stars) || 0;
      const hatchReq = window.EggEvolution ? window.EggEvolution.getHatchRequirement(student) : { threshold: 100 };
      if (stars >= hatchReq.threshold) {
        if (!student.hatchedAt) {
          student.hatchedAt = now;
          modified = true;
        }
        if (!student.firstHatchedAt) {
          student.firstHatchedAt = now;
          modified = true;
        }
      } else {
        student.hatchedAt = null;
      }
    });

    if (!data.giftItems || data.giftItems.length === 0) {
      data.giftItems = this.getDefaultData().giftItems;
      modified = true;
    }
    if (!data.giftItems200 || data.giftItems200.length === 0) {
      data.giftItems200 = this.getDefaultData().giftItems200;
      modified = true;
    }

    return modified;
  },

  loadData() {
    const storageKey = this.getStorageKey();
    const isDefaultClass = this.isPrimaryClass(this.getClassId());

    if (isDefaultClass && window.__INITIAL_DATA__ && window.__INITIAL_DATA__.students && window.__INITIAL_DATA__.students.length >= 30) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(window.__INITIAL_DATA__));
      } catch (e) {}
      return window.__INITIAL_DATA__;
    }
    let data = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        data = JSON.parse(raw);
        // Kiểm tra nếu dữ liệu trong localStorage là dữ liệu mẫu cũ thì bỏ qua (chỉ áp dụng bảo vệ cho lớp chính)
        if (isDefaultClass && data && data.students && (data.students.length < 30 || data.students.some(s => s.name === 'Đỗ Đức Anh'))) {
          data = null;
        }
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
    const isDefaultClass = this.isPrimaryClass(this.getClassId());
    if (isDefaultClass && (!data || !data.students || data.students.length < 30)) {
      console.warn('Bảo vệ dữ liệu lớp 1/8: Không lưu danh sách học sinh bị thiếu.');
      return;
    }
    if (isDefaultClass && data.students.some(s => s.name === 'Đỗ Đức Anh') && data.students.length === 16) {
      console.warn('Bảo vệ dữ liệu lớp 1/8: Không ghi đè dữ liệu mẫu 16 học sinh.');
      return;
    }
    if (!data || !data.students || data.students.length === 0) {
      console.warn('Không thể lưu danh sách lớp rỗng.');
      return;
    }

    data.lastUpdated = Date.now();
    data.classId = this.getClassId();
    const storageKey = this.getStorageKey();

    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      if (this.broadcast) {
        this.broadcast.postMessage({ type: 'DATA_CHANGED', data, classId: data.classId });
      }
    } catch (e) {
      console.error('Error saving data:', e);
    }

    // Try background sync with server if available
    this.syncToServer(data);

    // Tự động đăng ký lớp vào danh mục hệ thống
    this.registerClass(data.classId, data.className, (data.students || []).length);

    // Đồng bộ lên Google Firebase Đám Mây (nếu có kết nối)
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      window.FirebaseSync.setClassData(data);
    }
  },

  async syncToServer(data) {
    if (window.location.protocol.startsWith('http')) {
      try {
        const classId = this.getClassId();
        await fetch(`/api/sync?class=${encodeURIComponent(classId)}`, {
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
        const classId = this.getClassId();
        const res = await fetch(`/api/sync?class=${encodeURIComponent(classId)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.students) {
            this.ensureHatchedTimestamps(json.data);
            const storageKey = this.getStorageKey();
            localStorage.setItem(storageKey, JSON.stringify(json.data));
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

    const oldStars = student.stars || 0;
    // Cho phép tích điểm liên tục (100 -> 200 -> 300...) không giới hạn trần
    student.stars = Math.max(0, oldStars + points);
    const actualPoints = student.stars - oldStars;

    // Cập nhật mốc thời gian trứng nở
    const hatchReq = window.EggEvolution ? window.EggEvolution.getHatchRequirement(student) : { threshold: 100 };
    if (student.stars >= hatchReq.threshold) {
      if (!student.hatchedAt) student.hatchedAt = Date.now();
      if (!student.firstHatchedAt) student.firstHatchedAt = Date.now();
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
    return { student, group, data, actualPoints, reachedMilestone: student.stars >= hatchReq.threshold };
  },

  addPointsToGroup(groupId, points, reason, icon = '🌟') {
    const data = this.loadData();
    const group = data.groups.find(g => g.id === groupId);
    if (!group) return null;

    group.stars = Math.max(0, group.stars + points);

    // Also distribute to members in the group (không giới hạn trần)
    const members = data.students.filter(s => s.group === groupId);
    members.forEach(s => {
      const oldStars = s.stars || 0;
      s.stars = Math.max(0, oldStars + points);
      const sActual = s.stars - oldStars;
      const sReq = window.EggEvolution ? window.EggEvolution.getHatchRequirement(s) : { threshold: 100 };
      if (s.stars >= sReq.threshold) {
        if (!s.hatchedAt) s.hatchedAt = Date.now();
        if (!s.firstHatchedAt) s.firstHatchedAt = Date.now();
      }

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
      const oldStars = s.stars || 0;
      s.stars = Math.max(0, oldStars + points);
      const sActual = s.stars - oldStars;
      const sReq = window.EggEvolution ? window.EggEvolution.getHatchRequirement(s) : { threshold: 100 };
      if (s.stars >= sReq.threshold) {
        if (!s.hatchedAt) s.hatchedAt = Date.now();
        if (!s.firstHatchedAt) s.firstHatchedAt = Date.now();
      }

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

  async submitHomework(studentId, { readingCount, writingStars, choresDone, stickerCount = 0, dateStr }) {
    const validDate = dateStr || this.getTodayDateString();
    const rCount = Math.max(0, parseInt(readingCount, 10) || 0);
    const rStars = rCount * 1;
    const wStars = Math.max(0, parseInt(writingStars, 10) || 0);
    const cStars = choresDone ? 5 : 0;
    const sCount = Math.max(0, parseInt(stickerCount, 10) || 0);
    const sStars = sCount * 5;
    const totalStars = rStars + wStars + cStars + sStars;

    // 1. Ưu tiên hàng đầu: Gửi trực tiếp lên Google Firebase Đám Mây 24/24
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      try {
        const fbResult = await window.FirebaseSync.submitHomework(studentId, {
          readingCount: rCount,
          writingStars: wStars,
          choresDone: !!choresDone,
          stickerCount: sCount,
          dateStr: validDate
        });
        if (fbResult && fbResult.data) {
          localStorage.setItem(this.getStorageKey(), JSON.stringify(fbResult.data));
          if (this.broadcast) {
            this.broadcast.postMessage({ type: 'DATA_CHANGED', data: fbResult.data, classId: this.getClassId() });
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
        const classId = this.getClassId();
        const res = await fetch(`/api/homework?class=${encodeURIComponent(classId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId,
            readingCount: rCount,
            writingStars: wStars,
            choresDone: !!choresDone,
            stickerCount: sCount,
            dateStr: validDate
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(json.data));
            if (this.broadcast) {
              this.broadcast.postMessage({ type: 'DATA_CHANGED', data: json.data, classId: this.getClassId() });
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
      stickerCount: sCount,
      stickerStars: sStars,
      totalStars: accumulatedTotal,
      updatedAt: Date.now()
    };

    student.stars = Math.max(0, (student.stars || 0) + totalStars);
    const hatchReq = window.EggEvolution ? window.EggEvolution.getHatchRequirement(student) : { threshold: 100 };
    if (student.stars >= hatchReq.threshold) {
      if (!student.hatchedAt) student.hatchedAt = Date.now();
      if (!student.firstHatchedAt) student.firstHatchedAt = Date.now();
    } else {
      student.hatchedAt = null;
    }

    const group = data.groups.find(g => g.id === student.group);
    if (group) {
      group.stars = Math.max(0, (group.stars || 0) + totalStars);
    }

    if (!student.logs) student.logs = [];
    const reasonDetail = `Phụ huynh gửi điểm ở nhà: Đọc ${rCount} lượt (${rStars}⭐), Viết (${wStars}⭐)${sCount > 0 ? `, Sticker ${sCount} cái (${sStars}⭐)` : ''}, Dặn dò (${cStars}⭐)`;
    student.logs.unshift({
      id: 'log-hw-' + Date.now(),
      time: this.getTimeString(),
      points: totalStars,
      reason: reasonDetail,
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

  // Quản lý danh sách quà tặng (Túi mù & Vòng quay) - mốc 100 và mốc 200
  getGiftItems(milestone = 100) {
    const data = this.loadData();
    if (Number(milestone) === 200) {
      if (!data.giftItems200 || data.giftItems200.length === 0) {
        return this.getDefaultData().giftItems200;
      }
      return data.giftItems200;
    }
    if (!data.giftItems || data.giftItems.length === 0) {
      return this.getDefaultData().giftItems;
    }
    return data.giftItems;
  },

  async saveGiftItems(items, milestone = 100) {
    const data = this.loadData();
    if (Number(milestone) === 200) {
      data.giftItems200 = items;
    } else {
      data.giftItems = items;
    }
    data.lastUpdated = Date.now();

    if (window.location.protocol.startsWith('http')) {
      try {
        const classId = this.getClassId();
        const payload = Number(milestone) === 200 ? { giftItems200: items } : { giftItems: items };
        await fetch(`/api/gifts?class=${encodeURIComponent(classId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {}
    }

    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      window.FirebaseSync.saveGiftItems(data.giftItems, data.giftItems200);
    }

    this.saveData(data);
    return items;
  },

  // Lưu lịch sử nhận quà của học sinh (Tối đa 2 lượt) & Tự động hoàn về 0
  async claimStudentGift(studentId, gift, source = 'teacher', milestone = 100) {
    if (window.location.protocol.startsWith('http')) {
      try {
        const classId = this.getClassId();
        const res = await fetch(`/api/claim-gift?class=${encodeURIComponent(classId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, gift, source, milestone })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(json.data));
            if (this.broadcast) {
              this.broadcast.postMessage({ type: 'DATA_CHANGED', data: json.data, classId: this.getClassId() });
            }
            return json.student;
          }
        } else if (res.status === 403) {
          const errJson = await res.json();
          throw new Error(errJson.error || 'Bé đã quay quà ở thiết bị khác!');
        }
      } catch (e) {
        if (e.message && e.message.includes('Bé đã quay')) throw e;
      }
    }

    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      try {
        const fbStudent = await window.FirebaseSync.claimStudentGift(studentId, gift, source, milestone);
        if (fbStudent) return fbStudent;
      } catch (e) {
        console.warn('Lỗi nhận quà qua Firebase:', e);
        if (e.message && e.message.includes('quay')) throw e;
      }
    }

    // Fallback lưu local
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (!student) return null;

    if (!student.giftHistory) student.giftHistory = [];
    if (student.giftHistory.length >= 2) return student;

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

    if (!data.giftSummaryRecords) data.giftSummaryRecords = [];
    const group = (data.groups || []).find(g => g.id === student.group);

    // Cập nhật quà trên bảng tổng hợp: chỉ tìm bản ghi thật sự đang dang dở (chưa có gift2 và chưa completed)
    let summaryEntry = data.giftSummaryRecords.find(r => r.studentId === student.id && !r.completed && !r.gift2);

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
        data.giftSummaryRecords.unshift(summaryEntry);
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
        data.giftSummaryRecords.unshift(summaryEntry);
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
      student.milestoneChoice = null;
      student.giftHistory = [];
      student.giftSessionSource = null;

      if (!student.logs) student.logs = [];
      student.logs.unshift({
        id: 'log-cycle-' + Date.now(),
        time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        points: 0,
        reason: `Bắt đầu chu kỳ ấp mới (vừa nhận quà mốc ${currentMilestone}⭐: ${summaryEntry.gift1 ? summaryEntry.gift1.name : ''}, ${record.name})`,
        icon: '🥚'
      });
      if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);
    }

    this.saveData(data);
    return student;
  },

  async setMilestoneChoice(studentId, choice) {
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      try {
        await window.FirebaseSync.setMilestoneChoice(studentId, choice);
      } catch (e) {}
    }
    if (window.location.protocol.startsWith('http')) {
      try {
        const classId = this.getClassId();
        await fetch(`/api/milestone-choice?class=${encodeURIComponent(classId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId, choice })
        });
      } catch (e) {}
    }
    const data = this.loadData();
    const student = data.students.find(s => s.id === studentId);
    if (student) {
      student.milestoneChoice = choice;
      if (choice === 'accumulate') {
        student.accumulateBonus = true;
      }
      this.saveData(data);
    }
    return student;
  },

  // Hoàn tất mở quà & reset trứng về 0 ⭐ bắt đầu chu kỳ mới (Lưu bảng tổng hợp quà)
  async finishAndResetStudentCycle(studentId) {
    // 1. Firebase nếu có
    if (window.FirebaseSync && window.FirebaseSync.isInitialized) {
      try {
        const res = await window.FirebaseSync.finishAndResetStudentCycle(studentId);
        if (res && res.data) {
          localStorage.setItem(this.getStorageKey(), JSON.stringify(res.data));
          if (this.broadcast) {
            this.broadcast.postMessage({ type: 'DATA_CHANGED', data: res.data, classId: this.getClassId() });
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
        const classId = this.getClassId();
        const res = await fetch(`/api/reset-cycle?class=${encodeURIComponent(classId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            localStorage.setItem(this.getStorageKey(), JSON.stringify(json.data));
            if (this.broadcast) {
              this.broadcast.postMessage({ type: 'DATA_CHANGED', data: json.data, classId: this.getClassId() });
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
        const classId = this.getClassId();
        await fetch(`/api/toggle-gift-delivered?class=${encodeURIComponent(classId)}`, {
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
  },

  // ========================================================
  // --- QUẢN LÝ CÂU HỎI & BÀI TOÁN TÍCH HỢP VÒNG QUAY ---
  // ========================================================
  QUESTIONS_KEY: 'classroom_wheel_questions',
  DEFAULT_QUESTIONS: [
    { id: 'q-1', content: 'Tính: 15 + 24 = ?' },
    { id: 'q-2', content: 'Tính: 38 - 19 = ?' },
    { id: 'q-3', content: 'Đặt một câu có từ "chăm chỉ".' },
    { id: 'q-4', content: 'Tìm từ chỉ sự vật trong câu: "Mặt trời tỏa ánh nắng ấm áp".' },
    { id: 'q-5', content: 'Tính: 45 + 55 = ?' },
    { id: 'q-6', content: 'Đọc thuộc lòng 4 câu thơ đầu bài thơ em yêu thích.' },
    { id: 'q-7', content: 'Điền dấu >, <, = :  47 + 12 ... 60' },
    { id: 'q-8', content: 'Kể tên 3 con vật nuôi trong gia đình.' },
    { id: 'q-9', content: 'Tính: 70 - 25 = ?' },
    { id: 'q-10', content: 'Tìm từ chỉ hoạt động trong câu: "Bé Mai đang chăm chú quét nhà".' },
    { id: 'q-11', content: 'Tính: 6 x 2 = ?' },
    { id: 'q-12', content: 'Đặt câu hỏi cho bộ phận in đậm: "Hôm nay, **thời tiết rất đẹp**."' },
    { id: 'q-13', content: 'Tính: 100 - 45 = ?' },
    { id: 'q-14', content: 'Kể một việc tốt con đã làm để giúp đỡ bố mẹ.' },
    { id: 'q-15', content: 'Đoạn thẳng AB dài 12 cm, đoạn thẳng CD ngắn hơn đoạn thẳng AB 4 cm. Hỏi đoạn thẳng CD dài bao nhiêu cm?' }
  ],

  async getQuestions() {
    // 1. Nếu có server HTTP, ưu tiên đọc từ thư mục cau_hoi trên ổ đĩa
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/questions');
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.questions)) {
            localStorage.setItem(this.QUESTIONS_KEY, JSON.stringify(json.questions));
            return json.questions;
          }
        }
      } catch (e) {}
    }

    // 2. Dự phòng đọc từ LocalStorage (tôn trọng mảng rỗng [] khi cô giáo đã xóa hết)
    try {
      const stored = localStorage.getItem(this.QUESTIONS_KEY);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}

    // 3. Khởi tạo danh sách mặc định chỉ khi chưa từng có dữ liệu
    localStorage.setItem(this.QUESTIONS_KEY, JSON.stringify(this.DEFAULT_QUESTIONS));
    return [...this.DEFAULT_QUESTIONS];
  },

  async saveQuestions(questions) {
    if (!Array.isArray(questions)) return;
    localStorage.setItem(this.QUESTIONS_KEY, JSON.stringify(questions));

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch('/api/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions })
        });
      } catch (e) {}
    }
  },

  async addQuestion(content) {
    if (!content || !content.trim()) return null;
    const questions = await this.getQuestions();
    const newQ = {
      id: 'q-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      content: content.trim()
    };
    questions.push(newQ);
    await this.saveQuestions(questions);
    return newQ;
  },

  async deleteQuestion(id) {
    let questions = await this.getQuestions();
    questions = questions.filter(q => q.id !== id);
    await this.saveQuestions(questions);
    return questions;
  },

  async openQuestionsFolder() {
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/questions/open-folder', { method: 'POST' });
        return res.ok;
      } catch (e) {
        return false;
      }
    }
    return false;
  }
};

window.StorageManager = StorageManager;
