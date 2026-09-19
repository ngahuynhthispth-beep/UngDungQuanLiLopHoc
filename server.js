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
if (fs.existsSync(DATA_FILE)) {
  try {
    liveClassData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
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
          const prev = student.homeworkRecords[validDate] || { totalStars: 0 };
          
          const rCount = Math.max(0, Math.min(20, parseInt(readingCount, 10) || 0));
          const rStars = rCount * 1;
          const wStars = Math.max(0, Math.min(3, parseInt(writingStars, 10) || 0));
          const cStars = choresDone ? 5 : 0;
          const newTotalStars = rStars + wStars + cStars;
          const starDiff = newTotalStars - (prev.totalStars || 0);

          student.homeworkRecords[validDate] = {
            date: validDate,
            readingCount: rCount,
            readingStars: rStars,
            writingStars: wStars,
            choresDone: !!choresDone,
            choresStars: cStars,
            totalStars: newTotalStars,
            updatedAt: Date.now()
          };

          student.stars = Math.max(0, (student.stars || 0) + starDiff);

          // Cập nhật điểm cho tổ
          const group = liveClassData.groups.find(g => g.id === student.group);
          if (group) {
            group.stars = Math.max(0, (group.stars || 0) + starDiff);
          }

          // Ghi nhật ký việc tốt
          if (!student.logs) student.logs = [];
          const now = new Date();
          const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          student.logs.unshift({
            id: 'log-hw-' + Date.now(),
            time: timeStr,
            points: newTotalStars,
            reason: `Phụ huynh ghi nhận: Đọc ${rCount} lượt (${rStars}⭐), Viết (${wStars}⭐), Dặn dò (${cStars}⭐)`,
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
            diff: starDiff,
            data: liveClassData 
          }));
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
  startPublicTunnel();
});
