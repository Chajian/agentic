@echo off
REM 版本更新脚本 (Windows)
REM 用法: scripts\bump-version.bat [patch|minor|major]

setlocal enabledelayedexpansion

set VERSION_TYPE=%1
if "%VERSION_TYPE%"=="" set VERSION_TYPE=patch

echo 📦 更新版本类型: %VERSION_TYPE%

REM 更新 core 包
cd packages\core
for /f "tokens=*" %%i in ('npm version %VERSION_TYPE% --no-git-tag-version') do set NEW_VERSION=%%i
echo ✅ @agentic/core: %NEW_VERSION%
cd ..\..

REM 移除 'v' 前缀
set VERSION_NUMBER=%NEW_VERSION:~1%

REM 更新 storage-memory
cd packages\storage-memory
npm version %VERSION_NUMBER% --no-git-tag-version --allow-same-version
echo ✅ @agentic/storage-memory: %VERSION_NUMBER%
cd ..\..

REM 更新 storage-prisma
cd packages\storage-prisma
npm version %VERSION_NUMBER% --no-git-tag-version --allow-same-version
echo ✅ @agentic/storage-prisma: %VERSION_NUMBER%
cd ..\..

REM 更新 cli
cd packages\cli
npm version %VERSION_NUMBER% --no-git-tag-version --allow-same-version
echo ✅ @agentic/cli: %VERSION_NUMBER%
cd ..\..

echo.
echo 🎉 所有包已更新到版本 %VERSION_NUMBER%
echo.
echo 下一步：
echo 1. 提交更改: git add -A ^&^& git commit -m "chore: bump version to %VERSION_NUMBER%"
echo 2. 推送到 GitHub: git push
echo 3. GitHub Actions 会自动构建并发布到 NPM
