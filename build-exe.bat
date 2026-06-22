@echo off
chcp 65001 > nul
echo.
echo ╔══════════════════════════════════════════════════╗
echo ║     A to Z Digital Service — بناء ملف التثبيت  ║
echo ╚══════════════════════════════════════════════════╝
echo.

echo [1/3] التحقق من وجود Node.js...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] Node.js غير مثبت. يرجى تثبيته من https://nodejs.org
    pause
    exit /b 1
)
echo [✓] Node.js موجود

echo.
echo [2/3] تثبيت المكتبات المطلوبة...
call npm install
if %errorlevel% neq 0 (
    echo [خطأ] فشل تثبيت المكتبات. راجع الـ README للمساعدة.
    pause
    exit /b 1
)
echo [✓] تم تثبيت المكتبات

echo.
echo [3/3] بناء ملف التثبيت...
call npm run build-exe
if %errorlevel% neq 0 (
    echo [خطأ] فشل بناء الملف. راجع الـ README للمساعدة.
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════╗
echo ║  ✅ تم بناء ملف التثبيت بنجاح!                  ║
echo ║  📁 ستجده في مجلد: dist\                        ║
echo ╚══════════════════════════════════════════════════╝
echo.
explorer dist
pause
