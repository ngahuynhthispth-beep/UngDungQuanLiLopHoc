// scripts/fix_accidental_minus.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const FIREBASE_URL = 'https://quanlylophocconga-default-rtdb.asia-southeast1.firebasedatabase.app/classData.json';
const CLASS_DATA_PATH = path.join(__dirname, '..', 'class_data.json');
const INITIAL_DATA_PATH = path.join(__dirname, '..', 'js', 'initial-data.js');

const raw = fs.readFileSync(CLASS_DATA_PATH, 'utf8');
const data = JSON.parse(raw);

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const now = Date.now();

console.log('--- BẮT ĐẦU HOÀN ĐIỂM & DỌN DẸP LOG TRỪ NHẦM ---');

const REMOVE_LOG_IDS = new Set([
  // Nhã Uyên (8 lần ngày 28/10)
  'log-1793186335433',
  'log-1793186336189',
  'log-1793186336731',
  'log-1793186338221',
  'log-1793186341417',
  'log-1793186342089',
  'log-1793186342793',
  'log-1793186345548',
  // Đăng Khôi (3 lần ngày 28/10)
  'log-1793186318868',
  'log-1793186324952',
  'log-1793186326109',
  // Ánh Dương (1 lần ngày 28/10)
  'log-1793186446651',
  // Minh An (2 lần ngày 30/10)
  'log-1793331320346',
  'log-1793331321619',
  // Bảo Trân (2 lần ngày 30/10)
  'log-1793331323971',
  'log-1793331324839',
  // Hoàng Phúc (1 lần trùng trong 0.8s ngày 26/10)
  'log-1793002795163'
]);

const REFUND_STARS = {
  'hs-1790097391777-34': 80, // Nhã Uyên
  'hs-1790097391777-17': 30, // Đăng Khôi
  'hs-1790097391777-8': 10,  // Ánh Dương
  'hs-1790097391777-2': 20,  // Minh An
  'hs-1790097391777-33': 20, // Bảo Trân
  'hs-1790097391777-26': 10  // Hoàng Phúc
};

// 1. Hoàn trả điểm & xóa các log trừ nhầm
data.students.forEach(student => {
  if (REFUND_STARS[student.id]) {
    const refund = REFUND_STARS[student.id];
    const oldStars = student.stars || 0;
    student.stars = oldStars + refund;
    console.log(`✅ Hoàn lại +${refund} ⭐ cho bé ${student.name} (${student.id}): ${oldStars} ➔ ${student.stars} ⭐`);
  }

  if (Array.isArray(student.logs)) {
    // Xóa các log ID trong REMOVE_LOG_IDS
    student.logs = student.logs.filter(l => !REMOVE_LOG_IDS.has(l.id));

    // Lọc bỏ log quá 1 tuần (7 ngày)
    student.logs = student.logs.filter(log => {
      let ts = log.timestamp;
      if (!ts && log.id) {
        const m = String(log.id).match(/(\d{12,14})/);
        if (m) {
          const parsed = parseInt(m[1], 10);
          if (parsed > 1500000000000 && parsed < 2500000000000) {
            ts = parsed;
          }
        }
      }
      if (ts) {
        return (now - ts) <= ONE_WEEK_MS;
      }
      return true;
    });

    // Định dạng lại time đầy đủ ngày tháng cho tất cả các log còn lại
    student.logs.forEach(log => {
      let ts = log.timestamp;
      if (!ts && log.id) {
        const m = String(log.id).match(/(\d{12,14})/);
        if (m) {
          const parsed = parseInt(m[1], 10);
          if (parsed > 1500000000000 && parsed < 2500000000000) {
            ts = parsed;
          }
        }
      }
      if (ts) {
        log.timestamp = ts;
        const d = new Date(ts);
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        log.time = `${h}:${min} • ${day}/${month}/${year}`;
      }
    });

    if (student.logs.length > 25) {
      student.logs = student.logs.slice(0, 25);
    }
  }
});

data.lastUpdated = Date.now();

// Lưu ra file local
fs.writeFileSync(CLASS_DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log('💾 Đã lưu dữ liệu cập nhật vào class_data.json');

const initialDataContent = `// js/initial-data.js\n// Dữ liệu khởi tạo và dự phòng đồng bộ cho lớp học\nwindow.CLASS_DATA = ${JSON.stringify(data, null, 2)};\n`;
fs.writeFileSync(INITIAL_DATA_PATH, initialDataContent, 'utf8');
console.log('💾 Đã lưu dữ liệu vào js/initial-data.js');

// 2. Đẩy lên Firebase Realtime Database
console.log('🔄 Đang đồng bộ dữ liệu chuẩn lên Firebase...');
const urlObj = new URL(FIREBASE_URL);
const payload = JSON.stringify(data);

const req = https.request({
  hostname: urlObj.hostname,
  path: urlObj.pathname,
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  console.log('HTTP Status từ Firebase:', res.statusCode);
  let resBody = '';
  res.on('data', chunk => resBody += chunk);
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('🎉 ĐỒNG BỘ LÊN FIREBASE THÀNH CÔNG RỰC RỠ!');
      process.exit(0);
    } else {
      console.error('❌ Lỗi phản hồi từ Firebase:', resBody);
      process.exit(1);
    }
  });
});

req.on('error', err => {
  console.error('❌ Lỗi kết nối Firebase:', err.message);
  process.exit(1);
});

req.write(payload);
req.end();

