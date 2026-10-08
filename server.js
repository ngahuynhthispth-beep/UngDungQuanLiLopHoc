const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

// In-memory data store for live sync across devices (PC teacher <-> Mobile parent)
let liveClassData = null;

// Try to load initial data from file if exists
const DATA_FILE = path.join(__dirname, 'class_data.json');
const FIREBASE_DB_URL = 'https://quanlylophocconga-default-rtdb.asia-southeast1.firebasedatabase.app/classData.json';

// Quản lý thư mục câu hỏi & bài toán cho vòng quay gọi tên
const QUESTIONS_DIR = path.join(__dirname, 'cau_hoi');
const QUESTIONS_JSON_FILE = path.join(QUESTIONS_DIR, 'cau_hoi.json');
const QUESTIONS_TXT_FILE = path.join(QUESTIONS_DIR, 'danh_sach_cau_hoi.txt');

function loadQuestionsFromDisk() {
  if (!fs.existsSync(QUESTIONS_DIR)) {
    try { fs.mkdirSync(QUESTIONS_DIR, { recursive: true }); } catch (e) {}
  }

  let questions = [];
  let txtMtime = 0;
  let jsonMtime = 0;

  if (fs.existsSync(QUESTIONS_TXT_FILE)) {
    try { txtMtime = fs.statSync(QUESTIONS_TXT_FILE).mtimeMs; } catch (e) {}
  }
  if (fs.existsSync(QUESTIONS_JSON_FILE)) {
    try { jsonMtime = fs.statSync(QUESTIONS_JSON_FILE).mtimeMs; } catch (e) {}
  }

  // Nếu file .txt được sửa mới hơn .json (cô giáo vừa sửa bằng Notepad) -> ưu tiên đọc .txt
  if (fs.existsSync(QUESTIONS_TXT_FILE) && (txtMtime > jsonMtime || !fs.existsSync(QUESTIONS_JSON_FILE))) {
    try {
      const text = fs.readFileSync(QUESTIONS_TXT_FILE, 'utf8');
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('===') && !l.startsWith('---'));
      if (lines.length > 0) {
        questions = lines.map((line, idx) => {
          const cleanContent = line.replace(/^(câu\s*\d+[\s:.-]*|\d+[\s:.-]+)/i, '').trim();
          return {
            id: 'q-' + (idx + 1) + '-' + (idx + 1),
            content: cleanContent || line
          };
        });
        try {
          fs.writeFileSync(QUESTIONS_JSON_FILE, JSON.stringify(questions, null, 2), 'utf8');
        } catch (e) {}
        return questions;
      }
    } catch (e) {}
  }

  // Đọc từ file JSON
  if (fs.existsSync(QUESTIONS_JSON_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(QUESTIONS_JSON_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {}
  }

  // Dự phòng đọc từ file txt
  if (fs.existsSync(QUESTIONS_TXT_FILE)) {
    try {
      const text = fs.readFileSync(QUESTIONS_TXT_FILE, 'utf8');
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('==='));
      return lines.map((line, idx) => ({
        id: 'q-' + (idx + 1),
        content: line.replace(/^(câu\s*\d+[\s:.-]*|\d+[\s:.-]+)/i, '').trim() || line
      }));
    } catch (e) {}
  }

  return [];
}

function saveQuestionsToDisk(questions) {
  if (!Array.isArray(questions)) return false;
  if (!fs.existsSync(QUESTIONS_DIR)) {
    try { fs.mkdirSync(QUESTIONS_DIR, { recursive: true }); } catch (e) {}
  }

  try {
    fs.writeFileSync(QUESTIONS_JSON_FILE, JSON.stringify(questions, null, 2), 'utf8');
    const txtContent = questions.map((q, idx) => `${idx + 1}. ${typeof q === 'string' ? q : (q.content || '')}`).join('\r\n');
    fs.writeFileSync(QUESTIONS_TXT_FILE, txtContent, 'utf8');
    return true;
  } catch (err) {
    console.error('Lỗi lưu câu hỏi vào ổ đĩa:', err);
    return false;
  }
}


function syncToFirebase(data) {
  if (!data || !data.students || data.students.length === 0) return;
  const https = require('https');
  try {
    const payload = JSON.stringify(data);
    const req = https.request(FIREBASE_DB_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 10000
    }, res => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`☁️ [Firebase Cloud] Đã tự động đồng bộ ${data.students.length} học sinh lên Đám Mây trực tuyến!`);
      }
    });
    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (e) {}
}

const DEFAULT_GIFTS = [
  { id: 'g-1', name: 'Bút chì siêu đẹp', icon: '✏️' },
  { id: 'g-2', name: 'Bộ lắp ráp Lê gô', icon: '🧩' },
  { id: 'g-3', name: 'Kẹp tóc công chúa', icon: '🎀' },
  { id: 'g-4', name: 'Sổ tay mini đáng yêu', icon: '📓' },
  { id: 'g-5', name: 'Cục tẩy ngộ nghĩnh', icon: '🧼' },
  { id: 'g-6', name: 'Tranh cát sắc màu', icon: '🎨' },
  { id: 'g-7', name: 'Phần quà em yêu thích', icon: '🎁' }
];

const DEFAULT_GIFTS_200 = [
  { id: 'g200-1', name: 'Được làm lớp trưởng 3 ngày', icon: '👑' },
  { id: 'g200-2', name: 'Được ba mẹ dắt đi siêu thị mua quà yêu thích', icon: '🛒' },
  { id: 'g200-3', name: 'Được ăn một món ăn em yêu thích', icon: '🍦' },
  { id: 'g200-4', name: 'Gấu bông xinh xắn', icon: '🧸' },
  { id: 'g200-5', name: 'Bộ xếp hình Lê gô cao cấp', icon: '🧩' },
  { id: 'g200-6', name: 'Bộ cờ vua thông minh', icon: '♟️' },
  { id: 'g200-7', name: 'Bộ cờ cá ngựa vui nhộn', icon: '🐴' },
  { id: 'g200-8', name: 'Phần quà đặc biệt tự chọn', icon: '🎁' }
];

function getStudentHatchRequirement(student) {
  if (!student) return { threshold: 100, isFastHatcher: false, notice: '' };

  const previousHatchTime = student.firstHatchedAt || 
    (student.lastCompletedGifts && student.lastCompletedGifts[0] && student.lastCompletedGifts[0].timestamp) ||
    student.lastHatchedAt || 
    student.previousHatchedAt ||
    null;

  const isSecondHatch = (student.hatchCount >= 1) || 
    (student.lastCompletedGifts && student.lastCompletedGifts.length > 0) ||
    (student.previousHatchedAt != null);

  if (isSecondHatch && previousHatchTime) {
    const elapsedMs = Date.now() - Number(previousHatchTime);
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 ngày = 259,200,000 ms
    if (elapsedMs < THREE_DAYS_MS) {
      return {
        threshold: 150,
        isFastHatcher: true,
        notice: 'Trứng đang nâng cấp mời bạn hãy tích luỹ thêm điểm để nở',
        previousHatchTime: Number(previousHatchTime),
        remainingTimeMs: THREE_DAYS_MS - elapsedMs
      };
    }
  }

  return { threshold: 100, isFastHatcher: false, notice: '', previousHatchTime: null, remainingTimeMs: 0 };
}

function ensureHatchedTimestamps(data) {
  if (!data || !data.students) return false;
  const now = Date.now();
  let modified = false;

  data.students.forEach(student => {
    const stars = Number(student.stars) || 0;
    const hatchReq = getStudentHatchRequirement(student);
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
    data.giftItems = DEFAULT_GIFTS;
    modified = true;
  }
  if (!data.giftItems200 || data.giftItems200.length === 0) {
    data.giftItems200 = DEFAULT_GIFTS_200;
    modified = true;
  }

  return modified;
}

if (fs.existsSync(DATA_FILE)) {
  try {
    liveClassData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (ensureHatchedTimestamps(liveClassData)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(liveClassData, null, 2));
    }
    // Không tự ý đồng bộ đè lên Firebase lúc khởi động để tránh ghi đè dữ liệu mới hơn trên Đám Mây
  } catch (e) {
    console.error('Error reading class_data.json:', e);
  }
}

function pullFromFirebase() {
  const https = require('https');
  const req = https.get(FIREBASE_DB_URL, { timeout: 8000 }, res => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const remoteData = JSON.parse(body);
          if (!remoteData || !remoteData.students || remoteData.students.length === 0) return;

          if (!liveClassData || !liveClassData.students) {
            liveClassData = remoteData;
            fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});
            return;
          }

          let hasChanges = false;
          let diffStudentName = '';
          let diffStars = 0;

          // Đồng bộ danh sách quà bảng tổng hợp từ Firebase
          if (remoteData.giftSummaryRecords && Array.isArray(remoteData.giftSummaryRecords)) {
            if (!liveClassData.giftSummaryRecords) liveClassData.giftSummaryRecords = [];
            const localSummaryMap = new Map(liveClassData.giftSummaryRecords.map(r => [r.id, r]));
            remoteData.giftSummaryRecords.forEach(remR => {
              if (!localSummaryMap.has(remR.id)) {
                liveClassData.giftSummaryRecords.push(remR);
                hasChanges = true;
              } else {
                const locR = localSummaryMap.get(remR.id);
                if (JSON.stringify(locR) !== JSON.stringify(remR)) {
                  Object.assign(locR, remR);
                  hasChanges = true;
                }
              }
            });
            if (hasChanges) {
              liveClassData.giftSummaryRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            }
          }

          remoteData.students.forEach(remS => {
            const locS = liveClassData.students.find(s => s.id === remS.id);
            if (locS) {
              if (remS.homeworkRecords && Object.keys(remS.homeworkRecords).length > 0) {
                const locHwStr = JSON.stringify(locS.homeworkRecords || {});
                const remHwStr = JSON.stringify(remS.homeworkRecords);
                if (locHwStr !== remHwStr) {
                  locS.homeworkRecords = remS.homeworkRecords;
                  hasChanges = true;
                }
              }
              // Nếu bé vừa quay quà xong và hoàn về 0 ⭐ trên Firebase
              if (remS.stars === 0 && (locS.stars || 0) >= 100) {
                locS.stars = 0;
                locS.hatchedAt = null;
                locS.accumulateBonus = false;
                locS.milestoneChoice = null;
                locS.giftHistory = [];
                locS.lastCompletedGifts = remS.lastCompletedGifts || [];
                hasChanges = true;
                broadcastSse({
                  type: 'CYCLE_RESET',
                  studentName: locS.name,
                  data: liveClassData
                });
              } else if ((remS.stars || 0) > (locS.stars || 0)) {
                diffStudentName = locS.name;
                diffStars = (remS.stars || 0) - (locS.stars || 0);
                locS.stars = remS.stars;
                hasChanges = true;
              }
              if (remS.giftHistory && remS.giftHistory.length !== (locS.giftHistory || []).length) {
                locS.giftHistory = remS.giftHistory;
                hasChanges = true;
              }
              if (remS.lastCompletedGifts && JSON.stringify(remS.lastCompletedGifts) !== JSON.stringify(locS.lastCompletedGifts || [])) {
                locS.lastCompletedGifts = remS.lastCompletedGifts;
                hasChanges = true;
              }
              if (remS.accumulateBonus !== locS.accumulateBonus) {
                locS.accumulateBonus = remS.accumulateBonus;
                locS.milestoneChoice = remS.milestoneChoice;
                hasChanges = true;
              }
              if (remS.logs && remS.logs.length > (locS.logs || []).length) {
                locS.logs = remS.logs;
                hasChanges = true;
              }
            }
          });

          if (hasChanges) {
            liveClassData.lastUpdated = Date.now();
            fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});
            if (diffStars > 0) {
              console.log(`⚡ [Tự động cộng điểm] Đã cập nhật điểm rèn luyện phụ huynh chấm vào máy tính!`);
              broadcastSse({
                type: 'HOMEWORK_SUBMITTED',
                studentName: diffStudentName || 'Học sinh',
                diff: diffStars,
                data: liveClassData
              });
            } else {
              broadcastSse({
                type: 'DATA_CHANGED',
                data: liveClassData
              });
            }
          }
        } catch (e) {}
      });
    }
  });
  req.on('error', () => {});
}

// Tự động kéo điểm từ phụ huynh về máy tính giáo viên định kỳ
pullFromFirebase();
setInterval(pullFromFirebase, 12000);

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

let publicTunnelUrl = null;

function startPublicTunnel() {
  const { spawn } = require('child_process');
  try {
    const tunnel = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-R', `80:localhost:${PORT}`,
      'nokey@localhost.run'
    ]);

    tunnel.stdout.on('data', data => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9\.\-]+\.lhr\.life/);
      if (match && !publicTunnelUrl) {
        publicTunnelUrl = match[0];
        console.log(`\n======================================================`);
        console.log(`🌐 ĐƯỜNG LINK ONLINE (4G/Wifi mọi nơi):`);
        console.log(`💻 1. Link Máy tính: ${publicTunnelUrl}`);
        console.log(`📱 2. Link Điện thoại Giáo viên: ${publicTunnelUrl}/mobile.html`);
        console.log(`📢 3. Link Zalo Phụ Huynh: ${publicTunnelUrl}/parent.html`);
        console.log(`======================================================\n`);
      }
    });

    tunnel.on('close', () => {
      publicTunnelUrl = null;
      setTimeout(startPublicTunnel, 5000);
    });

    tunnel.on('error', () => {});
  } catch (err) {}
}

let sseClients = [];

function broadcastSse(payload) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(msg);
    } catch (e) {
      sseClients.splice(i, 1);
    }
  }
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Real-time Event Stream for Instant Sync (Server-Sent Events)
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);
    sseClients.push(res);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // API Endpoints for Real-Time Sync between Teacher and Parents
  if (pathname === '/api/info') {
    const ips = getLocalIpAddresses();
    const primaryIp = ips[0] || 'localhost';
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ips,
      primaryIp,
      port: PORT,
      publicUrl: publicTunnelUrl || null,
      desktopUrl: `http://${primaryIp}:${PORT}`,
      mobileUrl: `http://${primaryIp}:${PORT}/mobile.html`,
      parentUrl: `http://${primaryIp}:${PORT}/parent.html`,
      publicMobileUrl: publicTunnelUrl ? `${publicTunnelUrl}/mobile.html` : null,
      publicParentUrl: publicTunnelUrl ? `${publicTunnelUrl}/parent.html` : null
    }));
    return;
  }

  if (pathname === '/api/sync') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', data: liveClassData }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (!parsed || !parsed.students || parsed.students.length < 30) {
            console.warn('Blocked attempt to overwrite students via /api/sync with incomplete data');
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Cannot overwrite full class with sample or incomplete data' }));
            return;
          }
          liveClassData = parsed;
          fs.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2), () => {});
          syncToFirebase(liveClassData);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'saved', timestamp: Date.now() }));
          broadcastSse({ type: 'DATA_CHANGED', data: liveClassData });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  // API riêng để phụ huynh nộp điểm rèn luyện tại nhà (Đọc, Viết, Dặn dò) an toàn, chống ghi đè
  if (pathname === '/api/homework') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { studentId, readingCount, writingStars, choresDone, stickerCount, dateStr } = JSON.parse(body);
          if (!liveClassData || !liveClassData.students) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Data not initialized' }));
            return;
          }

          const student = liveClassData.students.find(s => s.id === studentId);
          if (!student) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Student not found' }));
            return;
          }

          if (!student.homeworkRecords) student.homeworkRecords = {};
          
          const validDate = dateStr || new Date().toISOString().split('T')[0];
          
          const rCount = Math.max(0, parseInt(readingCount, 10) || 0);
          const rStars = rCount * 1;
          const wStars = Math.max(0, parseInt(writingStars, 10) || 0);
          const cStars = choresDone ? 5 : 0;
          const sCount = Math.max(0, parseInt(stickerCount, 10) || 0);
          const sStars = sCount * 5;
          const pointsEarned = rStars + wStars + cStars + sStars;

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

          const hatchReq = getStudentHatchRequirement(student);
          if (student.stars >= hatchReq.threshold) {
            if (!student.hatchedAt) student.hatchedAt = Date.now();
            if (!student.firstHatchedAt) student.firstHatchedAt = Date.now();
          } else {
            student.hatchedAt = null;
          }

          // Cập nhật điểm cho tổ
          const group = liveClassData.groups.find(g => g.id === student.group);
          if (group && actualAdded > 0) {
            group.stars = Math.max(0, (group.stars || 0) + actualAdded);
          }

          // Ghi nhật ký việc tốt
          if (!student.logs) student.logs = [];
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const reasonDetail = `Phụ huynh gửi điểm ở nhà: Đọc ${rCount} lượt (${rStars}⭐), Viết (${wStars}⭐)${sCount > 0 ? `, Sticker ${sCount} cái (${sStars}⭐)` : ''}, Dặn dò (${cStars}⭐)`;
          student.logs.unshift({
            id: 'log-hw-' + Date.now(),
            time: timeStr,
            points: pointsEarned,
            reason: reasonDetail,
            icon: '🏠'
          });
          if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);

          liveClassData.lastUpdated = Date.now();
          fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});
          syncToFirebase(liveClassData);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'ok', 
            student, 
            record: student.homeworkRecords[validDate],
            diff: pointsEarned,
            data: liveClassData 
          }));

          // Tự động đẩy sự kiện đến trang giáo viên để cộng điểm tức thì
          broadcastSse({
            type: 'HOMEWORK_SUBMITTED',
            studentId,
            studentName: student.name,
            diff: pointsEarned,
            totalStars: student.stars,
            data: liveClassData
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // API nhận quà trứng nở (Túi mù / Vòng quay - Tối đa 2 lượt)
  if (pathname === '/api/claim-gift') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { studentId, gift, source, milestone } = JSON.parse(body);
          if (!liveClassData || !liveClassData.students) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Data not initialized' }));
            return;
          }

          const student = liveClassData.students.find(s => s.id === studentId);
          if (!student) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Student not found' }));
            return;
          }

          if (!student.giftHistory) student.giftHistory = [];

          // Giới hạn đúng 2 lượt quà
          if (student.giftHistory.length >= 2) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Bé đã hoàn tất 2 lượt nhận quà!' }));
            return;
          }

          const claimSource = source || 'teacher';

          // KHÓA QUAY CHÉO: Nếu đã quay ở bên kia thì không cho quay bên này nữa!
          if (student.giftSessionSource && student.giftSessionSource !== claimSource) {
            const otherSourceTitle = student.giftSessionSource === 'parent' ? 'Phụ Huynh' : 'Cô Giáo (trên lớp)';
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              error: `Bé đã quay quà tại trang ${otherSourceTitle}! Không thể quay thêm tại đây.`,
              lockedBy: student.giftSessionSource,
              giftHistory: student.giftHistory
            }));
            return;
          }

          if (!student.giftSessionSource) {
            student.giftSessionSource = claimSource;
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
            claimedBy: claimSource,
            milestone: currentMilestone
          };
          student.giftHistory.push(record);

          let autoReset = false;
          let summaryEntry = null;

          if (!liveClassData.giftSummaryRecords) liveClassData.giftSummaryRecords = [];
          const group = (liveClassData.groups || []).find(g => g.id === student.group);

          // Cập nhật quà trên bảng tổng hợp ngay từ lượt 1 để cô giáo theo dõi tức thì
          summaryEntry = liveClassData.giftSummaryRecords.find(r => r.studentId === student.id && !r.completed);
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
              claimedBy: claimSource,
              dateStr: `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
              timeStr: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
              timestamp: Date.now(),
              completed: false,
              delivered: false
            };
            liveClassData.giftSummaryRecords.unshift(summaryEntry);
          } else {
            summaryEntry.gift2 = record;
            summaryEntry.completed = true;
          }

          // NẾU ĐÃ HOÀN TẤT 2 LƯỢT QUÀ -> TỰ ĐỘNG HOÀN VỀ 0 KHÔNG CẦN THAO TÁC NỮA
          if (student.giftHistory.length >= 2) {
            autoReset = true;
            summaryEntry.gift2 = record;
            summaryEntry.completed = true;

            // Tự động hoàn điểm về 0 để bắt đầu chu kỳ mới
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
            student.lastSummaryEntry = summaryEntry;

            if (!student.logs) student.logs = [];
            student.logs.unshift({
              id: 'log-cycle-' + Date.now(),
              time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
              points: 0,
              reason: `Bắt đầu chu kỳ ấp mới (vừa nhận quà mốc ${currentMilestone}⭐: ${summaryEntry.gift1 ? summaryEntry.gift1.name : ''}, ${record.name})`,
              icon: '🥚'
            });
            if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);
            student.homeworkRecords = {};
          }

          liveClassData.lastUpdated = Date.now();
          fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});
          syncToFirebase(liveClassData);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'ok', 
            record, 
            student, 
            autoReset,
            summaryEntry,
            data: liveClassData 
          }));

          // Broadcast SSE sự kiện học sinh trúng quà để cô giáo chuẩn bị quà
          broadcastSse({
            type: 'GIFT_CLAIMED',
            studentId,
            studentName: student.name,
            gift: record,
            source: claimSource,
            milestone: currentMilestone,
            autoReset,
            summaryEntry,
            data: liveClassData
          });

          if (autoReset) {
            broadcastSse({
              type: 'CYCLE_RESET',
              studentId: student.id,
              studentName: student.name,
              summaryEntry,
              data: liveClassData
            });
          }
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // API lưu lựa chọn mốc điểm (Quay quà 100⭐ hay Tích điểm cộng dồn lên 200⭐)
  if (pathname === '/api/milestone-choice') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { studentId, choice } = JSON.parse(body); // choice: 'accumulate' | 'spin'
          if (!liveClassData || !liveClassData.students) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Data not initialized' }));
            return;
          }
          const student = liveClassData.students.find(s => s.id === studentId);
          if (!student) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Student not found' }));
            return;
          }

          student.milestoneChoice = choice;
          if (choice === 'accumulate') {
            student.accumulateBonus = true;
          }

          liveClassData.lastUpdated = Date.now();
          fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});
          syncToFirebase(liveClassData);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', student, data: liveClassData }));

          broadcastSse({
            type: 'DATA_CHANGED',
            data: liveClassData
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // API hoàn tất mở quà & reset trứng về 0 ⭐ bắt đầu chu kỳ mới (Lưu bảng tổng hợp quà)
  if (pathname === '/api/reset-cycle') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { studentId } = JSON.parse(body);
          if (!liveClassData || !liveClassData.students) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Data not initialized' }));
            return;
          }

          const student = liveClassData.students.find(s => s.id === studentId);
          if (!student) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Student not found' }));
            return;
          }

          if (!liveClassData.giftSummaryRecords) liveClassData.giftSummaryRecords = [];
          const group = (liveClassData.groups || []).find(g => g.id === student.group);
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

          liveClassData.giftSummaryRecords.unshift(summaryEntry);

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
          liveClassData.lastUpdated = Date.now();

          fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'ok', 
            summaryEntry, 
            student, 
            data: liveClassData 
          }));

          broadcastSse({
            type: 'CYCLE_RESET',
            studentId: student.id,
            studentName: student.name,
            summaryEntry,
            data: liveClassData
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // API đánh dấu đã trao quà cho học sinh
  if (pathname === '/api/toggle-gift-delivered') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { summaryId } = JSON.parse(body);
          if (!liveClassData || !liveClassData.giftSummaryRecords) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Data not initialized' }));
            return;
          }

          const record = liveClassData.giftSummaryRecords.find(r => r.id === summaryId);
          if (record) {
            record.delivered = !record.delivered;
            liveClassData.lastUpdated = Date.now();
            fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', record, data: liveClassData }));

          broadcastSse({
            type: 'DATA_CHANGED',
            data: liveClassData
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // API cài đặt / chỉnh sửa danh sách quà tặng (Mốc 100⭐ và Mốc 200⭐)
  if (pathname === '/api/gifts') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        gifts: liveClassData.giftItems || DEFAULT_GIFTS,
        gifts200: liveClassData.giftItems200 || DEFAULT_GIFTS_200
      }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { giftItems, giftItems200 } = JSON.parse(body);
          if (Array.isArray(giftItems)) {
            liveClassData.giftItems = giftItems;
          }
          if (Array.isArray(giftItems200)) {
            liveClassData.giftItems200 = giftItems200;
          }
          liveClassData.lastUpdated = Date.now();
          fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});
          syncToFirebase(liveClassData);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'ok', 
            gifts: liveClassData.giftItems,
            gifts200: liveClassData.giftItems200
          }));

          broadcastSse({
            type: 'GIFTS_UPDATED',
            gifts: liveClassData.giftItems,
            gifts200: liveClassData.giftItems200,
            data: liveClassData
          });
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // API Lấy danh sách câu hỏi / bài toán cho vòng quay gọi tên
  if (pathname === '/api/questions') {
    if (req.method === 'GET') {
      const questions = loadQuestionsFromDisk();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: questions.length, questions }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { questions } = JSON.parse(body);
          if (Array.isArray(questions)) {
            saveQuestionsToDisk(questions);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, count: questions.length, questions }));
            broadcastSse({
              type: 'QUESTIONS_UPDATED',
              questions
            });
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Questions must be an array' }));
          }
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }
  }

  // API Mở thư mục cau_hoi trên máy tính Windows
  if (pathname === '/api/questions/open-folder') {
    if (req.method === 'POST') {
      try {
        const { exec } = require('child_process');
        exec(`explorer.exe "${QUESTIONS_DIR}"`, (err) => {
          if (err) console.warn('Không thể mở Explorer:', err);
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, path: QUESTIONS_DIR }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
  }

  // File serving

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(__dirname, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Không tìm thấy trang');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (ext === '.html') {
      fs.readFile(filePath, 'utf-8', (readErr, htmlContent) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Lỗi đọc trang');
          return;
        }
        const injection = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(liveClassData)};</script>\n</head>`;
        const injectedHtml = htmlContent.includes('</head>') 
          ? htmlContent.replace('</head>', injection) 
          : htmlContent;
        res.writeHead(200, { 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end(injectedHtml);
      });
      return;
    }

    res.writeHead(200, { 
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  const ips = getLocalIpAddresses();
  console.log(`\n======================================================`);
  console.log(`🚀 ỨNG DỤNG LỚP HỌC ĐANG CHẠY:`);
  console.log(`💻 1. GIAO DIỆN MÁY TÍNH (Chuẩn, đầy đủ):`);
  console.log(`   👉 http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`📱 2. GIAO DIỆN ĐIỆN THOẠI GIÁO VIÊN (Nhỏ gọn, cùng Wifi):`);
    ips.forEach(ip => {
      console.log(`   👉 http://${ip}:${PORT}/mobile.html`);
    });
    console.log(`📢 3. GIAO DIỆN PHỤ HUYNH HỌC SINH (Xem & nộp bài tại nhà):`);
    ips.forEach(ip => {
      console.log(`   👉 http://${ip}:${PORT}/parent.html`);
    });
  }
  console.log(`======================================================\n`);

  if (process.env.AUTO_OPEN !== 'false') {
    const openCmd = process.platform === 'win32' ? `start "" chrome http://localhost:${PORT} || start "" msedge http://localhost:${PORT} || start http://localhost:${PORT}` :
                    process.platform === 'darwin' ? `open http://localhost:${PORT}` :
                    `xdg-open http://localhost:${PORT}`;
    const { exec } = require('child_process');
    exec(openCmd, () => {});
  }

  startPublicTunnel();
});
