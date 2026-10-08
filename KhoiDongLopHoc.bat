@echo off
chcp 65001 > nul
title Vườn Thú Kỳ Diệu - Lớp Học

echo ====================================================
echo   ĐANG KHỞI ĐỘNG ỨNG DỤNG LỚP HỌC VƯỜN THÚ KỲ DIỆU...
echo ====================================================

:: Dọn dẹp tiến trình kẹt cổng 3000 nếu có
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
  taskkill /F /PID %%a >nul 2>&1
)

echo 👉 Đang kết nối dữ liệu và tự động mở trình duyệt...
echo 👉 Thầy/Cô vui lòng GIỮ NGUYÊN cửa sổ này trong suốt buổi dạy!
echo ====================================================

node server.js
pause
