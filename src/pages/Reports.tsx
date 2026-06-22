import { useMemo } from "react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { BarChart2, TrendingUp, Package, Wallet, Users, Layers } from "lucide-react";

const MONTH_NAMES: Record<string, string> = {
  "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
  "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
  "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
};
function fMonth(ym: string) { const [, m] = ym.split("-"); return MONTH_NAMES[m] || ym; }
function fCur(n: number) { return n.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) + " ج.م"; }

const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#06b6d4", "#8b5cf6", "#ef4444"];

export default function Reports() {
  const summary = useMemo(() => db.reports.summary(), []);
  const monthlyRevenue = useMemo(() => db.reports.monthlyRevenue().map((r) => ({ ...r, month: fMonth(r.month) })), []);
  const powderUsage = useMemo(() => db.reports.powderUsageByMonth().map((r) => ({ ...r, month: fMonth(r.month) })), []);

  const expenses = useMemo(() => db.expenses.getAll(), []);
  const expenseByCat = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const monthlyExpenses = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => { const key = e.date.slice(0, 7); map.set(key, (map.get(key) || 0) + e.amount); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([month, amount]) => ({ month: fMonth(month), amount }));
  }, [expenses]);

  const cases = useMemo(() => db.cases.getAll(), []);
  const workTypeDist = useMemo(() => {
    const map = new Map<string, number>();
    cases.forEach((c) => map.set(c.work_type, (map.get(c.work_type) || 0) + 1));
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [cases]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = summary.totalCollected - totalExpenses;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">التقارير والإحصائيات</h1>
          <p className="text-xs text-muted-foreground">نظرة شاملة على أداء المختبر</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={Users} label="العملاء" value={summary.customers} color="blue" />
        <KPICard icon={Layers} label="الحالات" value={summary.cases} color="indigo" />
        <KPICard icon={TrendingUp} label="الإيرادات" value={fCur(summary.totalRevenue)} color="green" />
        <KPICard icon={TrendingUp} label="المحصّل" value={fCur(summary.totalCollected)} color="teal" />
        <KPICard icon={TrendingUp} label="المتبقي" value={fCur(summary.totalPending)} color="amber" />
        <KPICard icon={Wallet} label="صافي الربح" value={fCur(netProfit)} color={netProfit >= 0 ? "green" : "red"} />
      </div>

      {/* Revenue vs Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">الإيرادات والمصروفات الشهرية</CardTitle></CardHeader>
          <CardContent>
            {monthlyRevenue.length === 0 && monthlyExpenses.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyRevenue.map((r) => {
                  const exp = monthlyExpenses.find((e) => e.month === r.month);
                  return { ...r, expenses: exp?.amount || 0 };
                })} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "Cairo" }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [fCur(v)]} contentStyle={{ fontFamily: "Cairo" }} />
                  <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 12 }} />
                  <Bar dataKey="revenue" name="الإيرادات" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="collected" name="المحصّل" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="expenses" name="المصروفات" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">توزيع المصروفات حسب التصنيف</CardTitle></CardHeader>
          <CardContent>
            {expenseByCat.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expenseByCat} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>
                    {expenseByCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontFamily: "Cairo", fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [fCur(v)]} contentStyle={{ fontFamily: "Cairo" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cases Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">توزيع الحالات حسب النوع</CardTitle></CardHeader>
          <CardContent>
            {workTypeDist.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={workTypeDist} layout="vertical" margin={{ top: 5, right: 10, left: 70, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11, fontFamily: "Cairo" }} />
                  <Tooltip contentStyle={{ fontFamily: "Cairo" }} />
                  <Bar dataKey="value" name="العدد" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">استهلاك مسحوق CoCr (غم/شهر)</CardTitle></CardHeader>
          <CardContent>
            {powderUsage.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">لا توجد بيانات</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={powderUsage} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: "Cairo" }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} غم`]} contentStyle={{ fontFamily: "Cairo" }} />
                  <Line type="monotone" dataKey="usage" name="الاستهلاك" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card className="shadow-sm border-border">
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">ملخص الأداء المالي</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: "إجمالي الإيرادات (الفواتير)", value: fCur(summary.totalRevenue), color: "text-blue-600" },
                { label: "إجمالي المحصّل", value: fCur(summary.totalCollected), color: "text-green-600" },
                { label: "المبالغ المستحقة", value: fCur(summary.totalPending), color: "text-amber-600" },
                { label: "إجمالي المصروفات", value: fCur(totalExpenses), color: "text-red-600" },
                { label: "صافي الربح", value: fCur(netProfit), color: netProfit >= 0 ? "text-green-700" : "text-red-700" },
                { label: "رصيد الصندوق", value: fCur(summary.cashBalance), color: "text-primary" },
                { label: "رصيد مسحوق CoCr", value: `${summary.inventoryBalance.toFixed(1)} غم`, color: "text-purple-600" },
              ].map(({ label, value, color }) => (
                <tr key={label} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-muted-foreground">{label}</td>
                  <td className={`px-4 py-2.5 font-bold text-left ${color}`}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  const bg: Record<string, string> = { blue: "bg-blue-500", indigo: "bg-indigo-500", green: "bg-green-500", teal: "bg-teal-500", amber: "bg-amber-500", red: "bg-red-500" };
  return (
    <Card className="shadow-sm border-border">
      <CardContent className="p-3">
        <div className={`w-8 h-8 rounded-lg ${bg[color] || "bg-blue-500"} flex items-center justify-center mb-2 shadow-sm`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground mt-0.5 truncate">{value}</p>
      </CardContent>
    </Card>
  );
}
