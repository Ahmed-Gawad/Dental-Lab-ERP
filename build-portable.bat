@echo off
chcp 65001 > nul
echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║   A to Z Digital Service — بناء النسخة المحمولة    ║
echo ╚══════════════════════════════════════════════════════╝
echo.

echo [1/4] التحقق من وجود Node.js...
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo [خطأ] Node.js غير مثبت. يرجى تثبيته من https://nodejs.org
    echo       اختر الإصدار LTS وتأكد من تثبيت النسخة 64-bit.
    pause
    exit /b 1
)
echo [✓] Node.js موجود

echo.
echo [2/4] تثبيت الاعتماديات...
call npm install
if %errorlevel% neq 0 (
    echo [خطأ] فشل تثبيت الاعتماديات.
    pause
    exit /b 1
)
echo [✓] تم تثبيت الاعتماديات

echo.
echo [3/4] إعادة بناء المكتبات الأصلية لـ Electron...
call npx electron-builder install-app-deps
if %errorlevel% neq 0 (
    echo [تحذير] فشل إعادة البناء الأصلي - قد لا يؤثر هذا على النتيجة.
)
echo [✓] اكتملت إعادة البناء

echo.
echo [4/4] بناء النسخة المحمولة (Portable)...
call npm run build-portable
if %errorlevel% neq 0 (
    echo [خطأ] فشل بناء الملف. راجع الـ README للمساعدة.
    pause
    exit /b 1
)

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  ✅ اكتمل البناء بنجاح!                             ║
echo ║  📁 ستجد الملف في مجلد: dist\                      ║
echo ║  🚀 الملف: A to Z Digital Service-Portable.exe     ║
echo ╚══════════════════════════════════════════════════════╝
echo.
explorer dist
pause
