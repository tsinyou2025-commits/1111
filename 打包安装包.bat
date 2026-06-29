@echo off
chcp 65001 >nul
title 长夜故事 - 打包安装包

cd /d "%~dp0"

echo ========================================
echo    长夜故事 - 打包 Windows 安装包
echo ========================================
echo.

call npm run electron:build:win

echo.
echo ========================================
echo    打包完成！安装包在 release 目录
echo ========================================
echo.
pause
