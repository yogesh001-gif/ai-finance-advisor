@echo off
echo ================================================
echo  AI Personal Finance & Investment Advisor
echo ================================================
echo.
echo Starting backend server on port 5000...
start "Backend Server" cmd /k "cd /d "C:\web app\ai-finance-advisor\backend" && npm start"

echo Waiting for backend to start...
timeout /t 3 /nobreak > nul

echo Starting frontend server on port 3001...
start "Frontend Server" cmd /k "cd /d "C:\web app\ai-finance-advisor\frontend" && npm start"

echo.
echo ================================================
echo  Servers are starting up...
echo ================================================
echo  Backend:  http://127.0.0.1:5000
echo  Frontend: http://127.0.0.1:3001
echo ================================================
echo.
echo Press any key to exit...
pause > nul
