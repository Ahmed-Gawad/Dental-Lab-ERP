# README_EXPORT — دليل التصدير إلى GitHub

## ما الذي تم تعديله؟

### 1. `vite.config.ts` ✏️ (معدَّل)
- **السابق:** كان الملف يُوقف البناء بخطأ إذا لم تُضبط متغيّرات البيئة `PORT` و `BASE_PATH` (وهي خاصة بـ Replit فقط).
- **الحالي:** المتغيّران أصبحا اختياريَّين مع قيم افتراضية (`PORT=3030`, `BASE_PATH="/"`).
- **السابق:** كانت إضافات Replit (`@replit/vite-plugin-runtime-error-modal`, `cartographer`, `devBanner`) تُحمَّل دائماً وتُسبِّب خطأ خارج Replit.
- **الحالي:** الإضافات الخاصة بـ Replit تُحمَّل فقط إذا كان متغيّر `REPL_ID` موجوداً، وداخل `try/catch` حتى لا تُوقف البناء عند غيابها.
- **السابق:** كان alias `@assets` يشير إلى مسار مطلق خاص بـ Replit (`../../attached_assets`).
- **الحالي:** تم حذف هذا الـ alias لأنه غير موجود في البنية العادية.

### 2. `tsconfig.json` ✏️ (معدَّل)
- **السابق:** كان يرث (`extends`) من `../../tsconfig.base.json` وهو مسار داخل monorepo Replit فقط.
- **الحالي:** تم دمج خيارات `tsconfig.base.json` مباشرةً داخل الملف ليكون مستقلاً تماماً.
- **السابق:** كان يحتوي على `references` تشير إلى `../../lib/api-client-react` داخل الـ monorepo.
- **الحالي:** تم حذف هذا الـ reference لأن المشروع المُصدَّر لا يحتاجه.

### 3. `package.json` ✏️ (معدَّل)
- تم إضافة `typescript` كـ `devDependency` صريحة (كانت موجودة في جذر الـ monorepo فقط).
- تم تحديد منفذ ثابت (`--port 3030`) في سكريبت `dev` لضمان التشغيل المستقل.

### 4. `.gitignore` ✏️ (محسَّن)
- تم تحسين الملف ليشمل مجلدات البناء الإضافية (`out/`, `.electron-builder/`) وملفات Replit غير اللازمة.

### 5. `.github/workflows/build.yml` 🆕 (جديد)
- **Job 1 — `typecheck-and-web`:** يعمل على كل `push` و `pull_request`، يتحقق من TypeScript ثم يبني نسخة الويب.
- **Job 2 — `build-windows`:** يعمل فقط عند رفع `tag` بصيغة `v*.*.*`، يبني ملف الإعداد `.exe` على Windows runner.
- **Job 3 — `release`:** ينشر الملف على GitHub Releases تلقائياً عند اكتمال البناء.

---

## كيفية الاستخدام على GitHub

### التشغيل المحلي (للتطوير)
```bash
npm install
npm run dev         # تشغيل الواجهة على http://localhost:3030
```

### بناء نسخة الويب فقط
```bash
npm run build       # الناتج في dist/public/
```

### بناء ملف EXE للويندوز
> **ملاحظة:** يتطلب Windows مع Node.js ومكتبة `better-sqlite3` المثبَّتة محلياً.
```bash
npm install
npm run build-exe   # الناتج في dist/*.exe
```

### رفع إصدار جديد (GitHub Release تلقائي)
```bash
git tag v1.0.1
git push origin v1.0.1
# GitHub Actions سيبني الـ EXE وينشره تلقائياً
```

### إعداد GitHub Secrets
لا يحتاج البناء العادي أي secrets. الـ `GITHUB_TOKEN` يُولَّد تلقائياً بواسطة GitHub Actions.

---

## ملفات محذوفة من الـ ZIP
- `node_modules/` — ضخمة جداً، تُثبَّت بـ `npm install`
- `dist/`, `www/`, `release/` — مجلدات البناء المؤقتة
- `.tsbuildinfo` — ملف cache لـ TypeScript
- ملفات Replit: `.replit`, `replit.nix`, `.local/`, `.upm/`

---

*تم إنشاء هذا الملف تلقائياً — آخر تحديث: 19 يونيو 2026*
