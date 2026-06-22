import { useState, useMemo } from "react";
import { db, CashboxEntry } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

type FormData = Omit<CashboxEntry, "id" | "created_at" | "source" | "source_id">;
const today = new Date().toISOString().slice(0, 10);
const emptyForm: FormData = { date: today, type: "income", amount: 0, description: "", reference: "" };

function formatCurrency(n: number) { return n.toLocaleString("ar-EG") + " ج.م"; }

export default function Cashbox() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<CashboxEntry | null>(null);
  const [refresh, setRefresh] = useState(0);

  const entries = useMemo(() => {
    const all = db.cashbox.getAll();
    return typeFilter === "all" ? all : all.filter((e) => e.type === typeFilter);
  }, [refresh, typeFilter]);
  const balance = useMemo(() => db.cashbox.getBalance(), [refresh]);
  const totalIncome = useMemo(() => db.cashbox.getAll().filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0), [refresh]);
  const totalExpense = useMemo(() => db.cashbox.getAll().filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0), [refresh]);

  const { register, handleSubmit, reset, control } = useForm<FormData>({ defaultValues: emptyForm });

  function openAdd() { setEditItem(null); reset(emptyForm); setOpen(true); }
  function openEdit(e: CashboxEntry) {
    if (e.source !== "manual") {
      toast.error(
        e.source === "receipt"
          ? "هذه الحركة أُنشئت تلقائياً من إيصال قبض. عدّل الإيصال نفسه من صفحة الإيصالات."
          : "هذه الحركة أُنشئت تلقائياً من مصروف. عدّل المصروف نفسه من صفحة المصاريف."
      );
      return;
    }
    setEditItem(e);
    reset({ date: e.date, type: e.type, amount: e.amount, description: e.description, reference: e.reference });
    setOpen(true);
  }

  function onSubmit(data: FormData) {
    const payload = { ...data, amount: Number(data.amount) };
    if (editItem) { db.cashbox.update(editItem.id, payload); toast.success("تم التحديث"); }
    else { db.cashbox.add(payload); toast.success("تم الإضافة"); }
    setOpen(false); setRefresh((r) => r + 1);
  }

  function onDelete() {
    if (!deleteId) return;
    const entry = entries.find((e) => e.id === deleteId);
    if (entry && entry.source !== "manual") {
      toast.error("لا يمكن حذف حركة تلقائية مباشرة. احذف الإيصال أو المصروف المرتبط بها بدلاً من ذلك.");
      setDeleteId(null);
      return;
    }
    db.cashbox.delete(deleteId);
    setDeleteId(null);
    setRefresh((r) => r + 1);
    toast.success("تم الحذف");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">الصندوق</h1>
            <p className="text-xs text-muted-foreground">حركات الأموال اليومية</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm"><Plus className="w-4 h-4" />إضافة حركة</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-xs text-muted-foreground">إجمالي الدخل</p><p className="text-lg font-bold text-green-600">{formatCurrency(totalIncome)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-600" /></div>
              <div><p className="text-xs text-muted-foreground">إجمالي المصروف</p><p className="text-lg font-bold text-red-600">{formatCurrency(totalExpense)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className={`shadow-sm border-border ${balance >= 0 ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${balance >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                <Wallet className={`w-5 h-5 ${balance >= 0 ? "text-green-600" : "text-red-600"}`} />
              </div>
              <div><p className="text-xs text-muted-foreground">الرصيد الحالي</p><p className={`text-lg font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(balance)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[{ v: "all", l: "الكل" }, { v: "income", l: "الدخل فقط" }, { v: "expense", l: "المصروف فقط" }].map(({ v, l }) => (
          <Button key={v} size="sm" variant={typeFilter === v ? "default" : "outline"} onClick={() => setTypeFilter(v)}>{l}</Button>
        ))}
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="py-16 text-center"><Wallet className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">لا توجد حركات بعد</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">التاريخ</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">النوع</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">المبلغ</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">البيان</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">المرجع</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">{e.date}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${e.type === "income" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                        {e.type === "income" ? "دخل" : "مصروف"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold">
                      <span className={e.type === "income" ? "text-green-600" : "text-red-600"}>
                        {e.type === "income" ? "+" : "-"}{formatCurrency(e.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {e.description || "—"}
                      {e.source !== "manual" && (
                        <span className="mr-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 align-middle">تلقائي</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{e.reference || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={e.source !== "manual"} onClick={() => openEdit(e)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-white" disabled={e.source !== "manual"} onClick={() => setDeleteId(e.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
          <DialogHeader><DialogTitle>{editItem ? "تعديل الحركة" : "إضافة حركة للصندوق"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>التاريخ *</Label>
                <Input type="date" {...register("date", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>النوع *</Label>
                <Controller name="type" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">دخل</SelectItem>
                      <SelectItem value="expense">مصروف</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>المبلغ (ج.م) *</Label>
                <Input type="number" min="0" step="0.01" {...register("amount", { required: true, min: 0 })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>البيان</Label>
                <Input {...register("description")} placeholder="وصف الحركة" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>المرجع</Label>
                <Input {...register("reference")} placeholder="رقم الفاتورة / الإيصال" />
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
          <AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف هذه الحركة؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
