@echo off
REM GitHub Actions 工作流修复脚本 (Windows)

echo ========================================
echo GitHub Actions 工作流修复脚本
echo ========================================
echo.

echo [1/5] 备份现有工作流...
if exist .github\workflows\release.yml.backup (
    echo 备份文件已存在，跳过...
) else (
    copy .github\workflows\release.yml .github\workflows\release.yml.backup
    echo ✓ 已备份 release.yml
)

if exist .github\workflows\publish.yml.backup (
    echo 备份文件已存在，跳过...
) else (
    if exist .github\workflows\publish.yml (
        copy .github\workflows\publish.yml .github\workflows\publish.yml.backup
        echo ✓ 已备份 publish.yml
    )
)

echo.
echo [2/5] 删除冲突的 publish.yml...
if exist .github\workflows\publish.yml (
    del .github\workflows\publish.yml
    echo ✓ 已删除 publish.yml
) else (
    echo publish.yml 不存在，跳过...
)

echo.
echo [3/5] 替换为修复后的 release.yml...
copy /Y .github\workflows\release-fixed.yml .github\workflows\release.yml
echo ✓ 已更新 release.yml

echo.
echo [4/5] 检查 pnpm-lock.yaml...
if exist pnpm-lock.yaml (
    echo ✓ pnpm-lock.yaml 已存在
) else (
    echo ⚠ pnpm-lock.yaml 不存在
    echo 正在生成 lockfile...
    pnpm install
    if %ERRORLEVEL% EQU 0 (
        echo ✓ 已生成 pnpm-lock.yaml
    ) else (
        echo ✗ 生成失败，请手动运行: pnpm install
    )
)

echo.
echo [5/5] 清理临时文件...
if exist .github\workflows\release-fixed.yml (
    del .github\workflows\release-fixed.yml
    echo ✓ 已清理临时文件
)

echo.
echo ========================================
echo 修复完成！
echo ========================================
echo.
echo 下一步操作：
echo 1. 检查 GitHub Secrets 中是否配置了 NPM_TOKEN
echo 2. 提交更改: git add . ^&^& git commit -m "fix: resolve workflow conflicts"
echo 3. 推送到仓库: git push
echo.
echo 如需恢复，运行: copy .github\workflows\*.backup .github\workflows\
echo.

pause
