@echo off
echo Starting AI Finance Advisor Backend Server with Gamification...
cd /d "%~dp0\backend"
echo.
echo Backend server will start on http://localhost:5000
echo Features: Transactions, AI Advice, Gamification System
echo.
node server.js
pause
