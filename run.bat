@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo =======================================================
echo    TIKTOK LIVE PHOTO DOWNLOADER WEB SERVER
echo    May tinh:   http://127.0.0.1:5000
echo    Dien thoai: http://192.168.1.215:5000
echo =======================================================
start "" http://127.0.0.1:5000
C:\Tools\TikTokDownloader\venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 5000
pause
