import { useMemo } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Users, Layers, FileText, Package, Wallet, TrendingUp, Clock, CheckCircle } from "lucide-react";

const MONTH_NAMES: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
  "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
  "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};

function formatMonth(ym: string) {
  const [, m] = ym.split("-");
  return MONTH_NAMES[m] || ym;
}

function formatCurrency(n: number) {
  return n.toLocaleString("ar-EG") + " ج.م";
}

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#06b6d4"];

export default function Dashboard() {
  const summary = useMemo(() => db.reports.summary(), []);
  const monthlyRevenue = useMemo(() => db.reports.monthlyRevenue().map((r) => ({
    ...r,
    month: formatMonth(r.month),
  })), []);
  const powderUsage = useMemo(() => db.reports.powderUsageByMonth().map((r) => ({
    ...r,
    month: formatMonth(r.month),
  })), []);

  const casesPieData = [
    { name: "قيد الانتظار", value: summary.casesByStatus.pending },
    { name: "قيد التنفيذ", value: summary.casesByStatus.in_progress },
    { name: "مكتمل", value: summary.casesByStatus.completed },
    { name: "تم التسليم", value: summary.casesByStatus.delivered },
  ].filter((d) => d.value > 0);

  const recentCases = db.cases.getAll().slice(0, 5);
  const recentInvoices = db.invoices.getAll().slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
          <p className="text-muted-foreground text-sm mt-0.5">مرحباً بك في نظام A to Z Digital Service</p>
        </div>
        <div className="text-sm text-muted-foreground bg-card px-4 py-2 rounded-lg border border-border shadow-sm">
          {new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="العملاء" value={summary.customers} color="blue" />
        <StatCard icon={Layers} label="الحالات" value={summary.cases} color="indigo" />
        <StatCard icon={FileText} label="الإجمالي" value={formatCurrency(summary.totalRevenue)} color="green" />
        <StatCard icon={Wallet} label="الصندوق" value={formatCurrency(summary.cashBalance)} color="emerald" />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="المحصّل" value={formatCurrency(summary.totalCollected)} color="teal" />
        <StatCard icon={Clock} label="مستحق" value={formatCurrency(summary.totalPending)} color="amber" />
        <StatCard icon={Package} label="المخزون" value={`${summary.inventoryBalance.toFixed(1)} غم`} color="purple" />
        <StatCard icon={CheckCircle} label="مسلّمة" value={summary.casesByStatus.delivered} color="cyan" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">الإيرادات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyRevenue.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات بعد</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: "Cairo" }} />
                    <YAxis tick={{ fontSize: 11, fontFamily: "Cairo" }} />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v)]}
                      labelStyle={{ fontFamily: "Cairo", direction: "rtl" }}
                      contentStyle={{ fontFamily: "Cairo", direction: "rtl" }}
                    />
                    <Legend wrapperStyle={{ fontFamily: "Cairo" }} />
                    <Bar dataKey="revenue" name="الفواتير" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="collected" name="المحصّل" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cases Pie */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">حالات الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {casesPieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات بعد</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={casesPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={false}>
                    {casesPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 12 }} />
                  <Tooltip contentStyle={{ fontFamily: "Cairo" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Powder Usage Chart */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">استهلاك مسحوق CoCr (جرام/شهر)</CardTitle>
        </CardHeader>
        <CardContent>
          {powderUsage.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات بعد</div>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={powderUsage} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fontFamily: "Cairo" }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(1)} غم`]}
                  contentStyle={{ fontFamily: "Cairo" }}
                />
                <Bar dataKey="usage" name="الاستهلاك" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Cases */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">آخر الحالات</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentCases.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">لا توجد حالات بعد</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">العميل</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">النوع</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-medium">{c.customer_name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{c.work_type}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">آخر الفواتير</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentInvoices.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">لا توجد فواتير بعد</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">الرقم</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">العميل</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">المبلغ</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs">{inv.invoice_number}</td>
                      <td className="px-4 py-2 font-medium">{inv.customer_name}</td>
                      <td className="px-4 py-2">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-2">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    green: "bg-green-500",
    emerald: "bg-emerald-500",
    teal: "bg-teal-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
  };
  return (
    <Card className="shadow-sm border-border hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${colorMap[color] || "bg-blue-500"} flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
            <p className="text-lg font-bold text-foreground leading-tight truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "قيد الانتظار",
    in_progress: "قيد التنفيذ",
    completed: "مكتمل",
    delivered: "تم التسليم",
  };
  return (
    <span className={`status-${status.replace("_", "-")} text-xs px-2 py-0.5 rounded-full font-medium`}>
      {map[status] || status}
    </span>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { unpaid: "غير مدفوعة", partial: "مدفوع جزئياً", paid: "مدفوعة" };
  return (
    <span className={`status-${status} text-xs px-2 py-0.5 rounded-full font-medium`}>
      {map[status] || status}
    </span>
  );
}
