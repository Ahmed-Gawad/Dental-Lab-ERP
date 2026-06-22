import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Layers,
  FileText,
  Receipt,
  Package,
  Wallet,
  TrendingDown,
  BarChart2,
  FlaskConical,
  Settings,
  DatabaseBackup,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

const navItems = [
  { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/customers", label: "العملاء", icon: Users },
  { href: "/cases", label: "الحالات", icon: Layers },
  { href: "/invoices", label: "الفواتير", icon: FileText },
  { href: "/receipts", label: "الإيصالات", icon: Receipt },
  { href: "/inventory", label: "المخزون", icon: Package },
  { href: "/cashbox", label: "الصندوق", icon: Wallet },
  { href: "/expenses", label: "المصاريف", icon: TrendingDown },
  { href: "/reports", label: "التقارير", icon: BarChart2 },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [backing, setBacking] = useState(false);

  async function handleBackup() {
    if (!window.electronAPI) {
      toast.error("النسخ الاحتياطي متاح فقط في نسخة سطح المكتب");
      return;
    }
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
    if (!window.electronAPI) {
      toast.error("الاستعادة متاحة فقط في نسخة سطح المكتب");
      return;
    }
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

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onMenuBackup(() => handleBackup());
    window.electronAPI.onMenuRestore(() => handleRestore());
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir="rtl">
      {/* Right Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col h-full bg-sidebar text-sidebar-foreground shadow-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white leading-tight">A to Z</p>
            <p className="text-xs text-sidebar-foreground/70 leading-tight">Digital Service</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <p className="text-xs text-sidebar-foreground/40 font-semibold px-3 mb-2 mt-1">القائمة الرئيسية</p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150 text-right",
                    isActive
                      ? "bg-primary text-white shadow-md"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
                  )}
                >
                  <Icon className={cn("w-4.5 h-4.5 flex-shrink-0", isActive ? "text-white" : "text-sidebar-foreground/70")} />
                  <span>{label}</span>
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border space-y-3">
          <button
            onClick={handleBackup}
            disabled={backing}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white transition-colors disabled:opacity-50"
          >
            <DatabaseBackup className="w-4 h-4" />
            <span>{backing ? "جارٍ الحفظ..." : "نسخة احتياطية الآن"}</span>
          </button>
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
              <span className="text-xs font-bold text-white">م</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">مختبر الأسنان</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">النظام v1.0</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
