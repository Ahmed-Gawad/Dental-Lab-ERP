import { useState, useMemo } from "react";
import { db, Expense } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

const CATEGORIES = ["إيجار", "رواتب", "مواد ومستلزمات", "كهرباء وماء", "صيانة", "مصاريف إدارية", "مواصلات", "أخرى"];

type FormData = Omit<Expense, "id" | "created_at">;
const today = new Date().toISOString().slice(0, 10);
const emptyForm: FormData = { date: today, category: "أخرى", amount: 0, description: "", notes: "" };

function formatCurrency(n: number) { return n.toLocaleString("ar-EG") + " ج.م"; }

export default function Expenses() {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Expense | null>(null);
  const [refresh, setRefresh] = useState(0);

  const expenses = useMemo(() => {
    const all = db.expenses.getAll();
    return categoryFilter === "all" ? all : all.filter((e) => e.category === categoryFilter);
  }, [refresh, categoryFilter]);

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const allExpenses = useMemo(() => db.expenses.getAll(), [refresh]);
  const grandTotal = useMemo(() => allExpenses.reduce((s, e) => s + e.amount, 0), [allExpenses]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    allExpenses.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allExpenses]);

  const { register, handleSubmit, reset, control } = useForm<FormData>({ defaultValues: emptyForm });

  function openAdd() { setEditItem(null); reset(emptyForm); setOpen(true); }
  function openEdit(e: Expense) { setEditItem(e); reset({ date: e.date, category: e.category, amount: e.amount, description: e.description, notes: e.notes }); setOpen(true); }

  function onSubmit(data: FormData) {
    const payload = { ...data, amount: Number(data.amount) };
    if (editItem) { db.expenses.update(editItem.id, payload); toast.success("تم تحديث المصروف وتحديث الصندوق تلقائياً"); }
    else { db.expenses.add(payload); toast.success("تم تسجيل المصروف وخصمه من الصندوق تلقائياً"); }
    setOpen(false); setRefresh((r) => r + 1);
  }

  function onDelete() {
    if (deleteId) { db.expenses.delete(deleteId); setDeleteId(null); setRefresh((r) => r + 1); toast.success("تم حذف المصروف وعكس أثره في الصندوق"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-sm">
            <TrendingDown className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">المصاريف</h1>
            <p className="text-xs text-muted-foreground">الإجمالي: {formatCurrency(grandTotal)}</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm"><Plus className="w-4 h-4" />إضافة مصروف</Button>
      </div>

      {/* Category Stats */}
      {categoryTotals.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categoryTotals.slice(0, 4).map(([cat, amt]) => (
            <Card key={cat} className="shadow-sm border-border">
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground truncate">{cat}</p>
                <p className="text-base font-bold text-red-600 mt-0.5">{formatCurrency(amt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="فلتر التصنيف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع التصنيفات</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">المجموع: <span className="font-bold text-red-600">{formatCurrency(total)}</span></span>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="py-16 text-center"><TrendingDown className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">لا توجد مصاريف بعد</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">التاريخ</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">التصنيف</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">المبلغ</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">البيان</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">ملاحظات</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">{e.date}</td>
                    <td className="px-4 py-2.5"><span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-700 border border-red-100">{e.category}</span></td>
                    <td className="px-4 py-2.5 font-bold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.description || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.notes || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(e)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-white" onClick={() => setDeleteId(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editItem ? "تعديل المصروف" : "إضافة مصروف"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>التاريخ *</Label>
                <Input type="date" {...register("date", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>التصنيف *</Label>
                <Controller name="category" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>المبلغ (ج.م) *</Label>
                <Input type="number" min="0" step="0.01" {...register("amount", { required: true, min: 0 })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>البيان</Label>
                <Input {...register("description")} placeholder="وصف المصروف" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea {...register("notes")} placeholder="ملاحظات..." rows={2} />
              </div>
            </div>
            <DialogFooter className="gap-2 flex-row-reverse">
              <Button type="submit">{editItem ? "تحديث" : "إضافة"}</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف هذا المصروف؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
