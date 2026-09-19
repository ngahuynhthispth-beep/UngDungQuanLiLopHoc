@echo off
chcp 65001 > nul
title Vườn Thú Kỳ Diệu - Lớp Học Lớp 1
echo ====================================================
echo   ĐANG KHỞI ĐỘNG ỨNG DỤNG LỚP HỌC - VƯỜN THÚ KỲ DIỆU
echo   👉 Tự động mở trình duyệt web...
echo   👉 Nhấn Ctrl + C để dừng ứng dụng khi tan học
echo ====================================================
timeout /t 2 /nobreak > nul
start "" http://localhost:3000
node server.js
pause
