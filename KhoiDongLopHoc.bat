@echo off
chcp 65001 > nul
title Vườn Thú Kỳ Diệu - Lớp Học

echo ====================================================
echo   ĐANG MỞ GOOGLE CHROME VÀO ỨNG DỤNG LỚP HỌC...
echo ====================================================

start chrome http://localhost:3000
if %ERRORLEVEL% NEQ 0 (
  start msedge http://localhost:3000
)
if %ERRORLEVEL% NEQ 0 (
  start http://localhost:3000
)

echo.
echo 👉 Vui lòng giữ cửa sổ này trong suốt buổi dạy!
echo ====================================================
node server.js
pause

