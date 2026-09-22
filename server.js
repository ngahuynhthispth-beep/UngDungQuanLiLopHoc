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

const DEFAULT_GIFTS = [
  { id: 'g-1', name: 'Bút chì siêu đẹp', icon: '✏️' },
  { id: 'g-2', name: 'Bộ lắp ráp Lê gô', icon: '🧩' },
  { id: 'g-3', name: 'Kẹp tóc công chúa', icon: '🎀' },
  { id: 'g-4', name: 'Sổ tay mini đáng yêu', icon: '📓' },
  { id: 'g-5', name: 'Cục tẩy ngộ nghĩnh', icon: '🧼' },
  { id: 'g-6', name: 'Tranh cát sắc màu', icon: '🎨' },
  { id: 'g-7', name: 'Phần quà em yêu thích', icon: '🎁' }
];

function ensureHatchedTimestamps(data) {
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

  if (!data.giftItems || data.giftItems.length === 0) {
    data.giftItems = DEFAULT_GIFTS;
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
  } catch (e) {
    console.error('Error reading class_data.json:', e);
  }
}

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
        console.log(`🌐 ĐƯỜNG LINK ONLINE CHO PHỤ HUYNH (4G/Wifi mọi nơi):`);
        console.log(`👉 Link Zalo Phụ Huynh: ${publicTunnelUrl}/parent.html`);
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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ips,
      primaryIp: ips[0] || 'localhost',
      port: PORT,
      publicUrl: publicTunnelUrl || null
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
          liveClassData = parsed;
          fs.writeFile(DATA_FILE, JSON.stringify(parsed, null, 2), () => {});
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
          const { studentId, readingCount, writingStars, choresDone, dateStr } = JSON.parse(body);
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
          const wStars = Math.max(0, Math.min(3, parseInt(writingStars, 10) || 0));
          const cStars = choresDone ? 5 : 0;
          const pointsEarned = rStars + wStars + cStars;

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

          // Không cho tích sao nữa nếu đã đạt 100 sao (bắt buộc mở quà nhận thưởng)
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

          // Cập nhật điểm cho tổ
          const group = liveClassData.groups.find(g => g.id === student.group);
          if (group && actualAdded > 0) {
            group.stars = Math.max(0, (group.stars || 0) + actualAdded);
          }

          // Ghi nhật ký việc tốt
          if (!student.logs) student.logs = [];
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          student.logs.unshift({
            id: 'log-hw-' + Date.now(),
            time: timeStr,
            points: pointsEarned,
            reason: `Phụ huynh gửi điểm ở nhà: Đọc ${rCount} lượt (${rStars}⭐), Viết (${wStars}⭐), Dặn dò (${cStars}⭐)`,
            icon: '🏠'
          });
          if (student.logs.length > 30) student.logs = student.logs.slice(0, 30);

          liveClassData.lastUpdated = Date.now();
          fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});

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
          const { studentId, gift, source } = JSON.parse(body);
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
          if (!student.giftSessionSource) {
            student.giftSessionSource = claimSource;
          }

          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}, ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
          const record = {
            id: 'gift-' + Date.now(),
            name: gift.name,
            icon: gift.icon || '🎁',
            time: timeStr,
            timestamp: Date.now(),
            claimedBy: claimSource
          };
          student.giftHistory.push(record);
          liveClassData.lastUpdated = Date.now();
          fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            status: 'ok', 
            record, 
            student, 
            data: liveClassData 
          }));

          broadcastSse({
            type: 'GIFT_CLAIMED',
            studentId,
            studentName: student.name,
            gift: record,
            source: claimSource,
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

  // API cài đặt / chỉnh sửa danh sách quà tặng (Túi mù & Vòng quay)
  if (pathname === '/api/gifts') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        gifts: liveClassData.giftItems || DEFAULT_GIFTS 
      }));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const { giftItems } = JSON.parse(body);
          if (Array.isArray(giftItems)) {
            liveClassData.giftItems = giftItems;
            liveClassData.lastUpdated = Date.now();
            fs.writeFile(DATA_FILE, JSON.stringify(liveClassData, null, 2), () => {});

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', gifts: liveClassData.giftItems }));

            broadcastSse({
              type: 'GIFTS_UPDATED',
              gifts: liveClassData.giftItems,
              data: liveClassData
            });
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'giftItems must be an array' }));
          }
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
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
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(injectedHtml);
      });
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  const ips = getLocalIpAddresses();
  console.log(`\n======================================================`);
  console.log(`🚀 ỨNG DỤNG LỚP HỌC ĐANG CHẠY:`);
  console.log(`👉 Máy giáo viên: http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`📱 Phụ huynh xem trên điện thoại (cùng Wifi):`);
    ips.forEach(ip => {
      console.log(`   http://${ip}:${PORT}/parent.html`);
    });
  }
  console.log(`======================================================\n`);

  if (process.env.AUTO_OPEN !== 'false') {
    const openCmd = process.platform === 'win32' ? `start http://localhost:${PORT}` :
                    process.platform === 'darwin' ? `open http://localhost:${PORT}` :
                    `xdg-open http://localhost:${PORT}`;
    const { exec } = require('child_process');
    exec(openCmd, () => {});
  }

  startPublicTunnel();
});
