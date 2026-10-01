@echo off
chcp 65001 > nul
title Mở Cửa Sổ Mini Dạy Học - Vườn Thú Kỳ Diệu
echo ===================================================================
echo   ĐANG MỞ CỬA SỔ MINI ĐỂ DÙNG SONG SONG VỚI POWERPOINT BÀI GIẢNG...
echo ===================================================================
start msedge --app=http://localhost:3000 --window-size=430,760 --window-position=50,30
if %ERRORLEVEL% NEQ 0 (
  start chrome --app=http://localhost:3000 --window-size=430,760 --window-position=50,30
)
if %ERRORLEVEL% NEQ 0 (
  start http://localhost:3000
)
