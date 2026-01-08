@echo off
echo ===============================================
echo  AI Finance Advisor with Gamification System
echo ===============================================
echo.
echo This application now includes:
echo ✓ Complete Gamification System
echo ✓ Achievement Tracking
echo ✓ Daily/Weekly/Monthly Challenges  
echo ✓ Streak Tracking
echo ✓ Level Progression
echo ✓ Points System
echo.
echo Starting both servers...
echo.

echo Starting Backend Server...
start /B cmd /c "cd /d "%~dp0\backend" && node server.js"

echo Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start /B cmd /c "cd /d "%~dp0\frontend" && python -m http.server 3001"

echo Waiting 2 seconds for frontend to start...
timeout /t 2 /nobreak >nul

echo.
echo ===============================================
echo  🎮 GAMIFICATION FEATURES OVERVIEW 🎮
echo ===============================================
echo.
echo 🏆 ACHIEVEMENTS SYSTEM:
echo   • Getting Started - Record your first transaction
echo   • Tracking Pro - Record 10 transactions
echo   • Data Master - Record 50 transactions
echo   • Smart Saver - Save ₹1000+ in a month
echo   • Week Warrior - 7-day transaction streak
echo   • Monthly Master - 30-day transaction streak
echo   • Budget Boss - Stay under monthly budget
echo   • Future Planner - Make first investment
echo   • And many more...
echo.
echo 🎯 CHALLENGES SYSTEM:
echo   • Daily: Record transactions, save money
echo   • Weekly: Budget goals, category tracking
echo   • Monthly: Investment goals, saving targets
echo.
echo 🔥 STREAK TRACKING:
echo   • Daily Transaction Streaks
echo   • Saving Goal Streaks  
echo   • Budget Control Streaks
echo.
echo 📈 LEVEL PROGRESSION:
echo   • Earn XP points for activities
echo   • Level up from 1 to 10
echo   • Track progress to next level
echo.
echo ===============================================
echo.
echo Opening application in browser...
start http://localhost:3001
echo.
echo Backend API: http://localhost:5000
echo Frontend App: http://localhost:3001
echo.
echo Navigation:
echo • Dashboard - View financial overview
echo • Transactions - Add and manage transactions
echo • AI Advisor - Get personalized advice
echo • AI Chat - Ask financial questions
echo • Achievements - Track your gamification progress
echo.
echo Press any key to exit and stop servers...
pause >nul

echo Stopping servers...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
echo Servers stopped.
