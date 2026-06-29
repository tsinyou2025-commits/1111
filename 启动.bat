@echo off
chcp 65001 >nul
title 长夜故事 - 启动中

echo ========================================
echo    长夜故事 - 正在启动...
echo ========================================
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo [1/2] 正在安装依赖，请稍候...
    call npm install
    echo.
)

echo [2/2] 正在启动前端和后端...
echo.
echo 前端地址: http://localhost:5173
echo 后端地址: http://localhost:3001
echo.
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

call .\node_modules\.bin\concurrently.cmd ".\node_modules\.bin\vite.cmd" ".\node_modules\.bin\tsx.cmd api-express/server.ts"
