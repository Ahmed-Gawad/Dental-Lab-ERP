import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, DatabaseBackup, FolderOpen, Database, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [dbPath, setDbPath] = useState<string>("");
  const [version, setVersion] = useState<string>("");
  const [backing, setBacking] = useState(false);
  const isDesktop = typeof window !== "undefined" && !!window.electronAPI;

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.getDbPath().then(setDbPath).catch(() => {});
    window.electronAPI.getVersion().then(setVersion).catch(() => {});
  }, []);

  async function handleBackup() {
    if (!window.electronAPI) return;
    setBacking(true);
    try {
      const result = await window.electronAPI.backupDatabase();
      if (result.success) toast.success("تم حفظ النسخة الاحتياطية بنجاح");
    } catch {
      toast.error("تعذّر إنشاء نسخة احتياطية");
    } finally {
      setBacking(false);
    }
  }

  async function handleRestore() {
    if (!window.electronAPI) return;
    try {
      const result = await window.electronAPI.restoreDatabase();
      if (result.success) {
        toast.success("تم استعادة البيانات. سيتم إعادة تحميل البرنامج الآن.");
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch {
      toast.error("تعذّرت عملية الاستعادة");
    }
  }

  async function handleOpenBackupsFolder() {
    if (!window.electronAPI) return;
    await window.electronAPI.openBackupsFolder();
  }

  async function handleCheckUpdates() {
    if (!window.electronAPI) return;
    await window.electronAPI.checkForUpdates();
    toast.info("جارٍ التحقق من وجود تحديثات...");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-600 rounded-xl flex items-center justify-center shadow-sm">
          <SettingsIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-xs text-muted-foreground">إدارة قاعدة البيانات والنسخ الاحتياطي</p>
        </div>
      </div>

      {!isDesktop && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              أنت تستخدم البرنامج في وضع المتصفح للمعاينة. ميزات النسخ الاحتياطي وقاعدة البيانات الحقيقية تعمل فقط في نسخة سطح المكتب (exe) المثبّتة على الجهاز.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            قاعدة البيانات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">موقع ملف البيانات على الجهاز</p>
            <p className="text-sm font-mono bg-muted/40 rounded-lg px-3 py-2 break-all">
              {dbPath || (isDesktop ? "جارٍ التحميل..." : "غير متاح في وضع المعاينة")}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            جميع بياناتك (العملاء، الفواتير، الحالات، الصندوق...) محفوظة في هذا الملف على جهازك فقط، ولا تُرسل لأي خادم خارجي.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <DatabaseBackup className="w-4 h-4 text-primary" />
            النسخ الاحتياطي والاستعادة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            يُنشئ البرنامج نسخة احتياطية تلقائية يومياً عند فتحه (يحتفظ بآخر 10 نسخ). يمكنك أيضاً أخذ نسخة يدوية في أي وقت قبل أي عملية مهمة.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleBackup} disabled={!isDesktop || backing} className="gap-2">
              <DatabaseBackup className="w-4 h-4" />
              {backing ? "جارٍ الحفظ..." : "أخذ نسخة احتياطية الآن"}
            </Button>
            <Button onClick={handleRestore} disabled={!isDesktop} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              استعادة من نسخة احتياطية
            </Button>
            <Button onClick={handleOpenBackupsFolder} disabled={!isDesktop} variant="outline" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              فتح مجلد النسخ التلقائية
            </Button>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            تنبيه: عملية الاستعادة تستبدل كل البيانات الحالية بالنسخة المختارة ولا يمكن التراجع عنها. خذ نسخة احتياطية حالية أولاً إن لم تكن متأكداً.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">عن البرنامج</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">A to Z Digital Service — نظام إدارة مختبر الأسنان</p>
          <p className="text-xs text-muted-foreground">الإصدار: {version || "—"}</p>
          <Button onClick={handleCheckUpdates} disabled={!isDesktop} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            التحقق من وجود تحديثات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
