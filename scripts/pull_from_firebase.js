// scripts/pull_from_firebase.js
const fs = require('fs');
const https = require('https');
const path = require('path');

const FIREBASE_URL = 'https://quanlylophocconga-default-rtdb.asia-southeast1.firebasedatabase.app/classData.json';
const CLASS_DATA_PATH = path.join(__dirname, '..', 'class_data.json');
const INITIAL_DATA_PATH = path.join(__dirname, '..', 'js', 'initial-data.js');

console.log('🔄 Đang kết nối tới Firebase để kéo dữ liệu mới nhất (ngày hôm qua)...');

https.get(FIREBASE_URL, res => {
  console.log('HTTP Status:', res.statusCode);
  if (res.statusCode === 401) {
    console.error('❌ Firebase vẫn đang bị khóa Rules (Permission Denied).');
    console.error('👉 Cô giáo hãy vào Firebase Console cập nhật Rules (.read: true, .write: true) rồi chạy lại nhé!');
    process.exit(1);
  }
  if (res.statusCode !== 200) {
    console.error('❌ Lỗi kết nối Firebase:', res.statusCode);
    process.exit(1);
  }

  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      if (!data || !data.students || data.students.length === 0) {
        console.error('❌ Dữ liệu trên Firebase rỗng hoặc không hợp lệ.');
        process.exit(1);
      }

      const totalStars = data.students.reduce((s, x) => s + (Number(x.stars) || 0), 0);
      const hwDates = new Set();
      data.students.forEach(s => {
        if (s.homeworkRecords) Object.keys(s.homeworkRecords).forEach(k => hwDates.add(k));
      });
      const sortedDates = Array.from(hwDates).sort();

      console.log('✅ ĐÃ KÉO THÀNH CÔNG DỮ LIỆU TỪ FIREBASE!');
      console.log('📊 Tổng số học sinh:', data.students.length);
      console.log('⭐ Tổng số sao toàn lớp:', totalStars);
      console.log('📅 Các ngày làm bài tập có trong dữ liệu:', sortedDates);
      console.log('📅 Ngày gần nhất:', sortedDates[sortedDates.length - 1]);

      // Ghi vào class_data.json
      fs.writeFileSync(CLASS_DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
      console.log('💾 Đã lưu vào class_data.json');

      // Ghi vào js/initial-data.js
      const jsContent = '// js/initial-data.js - Dữ liệu mới nhất kéo từ Firebase\nwindow.__INITIAL_DATA__ = ' + JSON.stringify(data) + ';\n';
      fs.writeFileSync(INITIAL_DATA_PATH, jsContent, 'utf8');
      console.log('💾 Đã cập nhật vào js/initial-data.js');

      console.log('🎉 HOÀN TẤT PHỤC HỒI DỮ LIỆU MỚI NHẤT!');
    } catch (e) {
      console.error('❌ Lỗi parse JSON:', e.message);
      process.exit(1);
    }
  });
}).on('error', err => {
  console.error('❌ Lỗi kết nối mạng:', err.message);
  process.exit(1);
});
