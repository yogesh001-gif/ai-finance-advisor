@echo off
echo Starting AI Finance Advisor Frontend with Gamification...
cd /d "%~dp0\frontend"
echo.
echo Frontend will be available at http://localhost:3001
echo Features: Dashboard, Transactions, AI Chat, Achievement System
echo.
python -m http.server 3001
