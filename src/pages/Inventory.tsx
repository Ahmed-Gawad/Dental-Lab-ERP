import { useState, useMemo } from "react";
import { db, InventoryEntry } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, Package, TrendingUp, TrendingDown, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

type FormData = Omit<InventoryEntry, "id" | "created_at">;
const today = new Date().toISOString().slice(0, 10);
const emptyForm: FormData = { date: today, type: "in", quantity: 0, notes: "" };

export default function Inventory() {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<InventoryEntry | null>(null);
  const [refresh, setRefresh] = useState(0);

  const entries = useMemo(() => db.inventory.getAll(), [refresh]);
  const balance = useMemo(() => db.inventory.getBalance(), [refresh]);
  const totalIn = useMemo(() => entries.filter((e) => e.type === "in").reduce((s, e) => s + e.quantity, 0), [entries]);
  const totalOut = useMemo(() => entries.filter((e) => e.type === "out").reduce((s, e) => s + e.quantity, 0), [entries]);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({ defaultValues: emptyForm });

  function openAdd() { setEditItem(null); reset(emptyForm); setOpen(true); }
  function openEdit(e: InventoryEntry) { setEditItem(e); reset({ date: e.date, type: e.type, quantity: e.quantity, notes: e.notes }); setOpen(true); }

  function onSubmit(data: FormData) {
    const payload = { ...data, quantity: Number(data.quantity) };
    if (editItem) { db.inventory.update(editItem.id, payload); toast.success("تم التحديث"); }
    else { db.inventory.add(payload); toast.success("تم الإضافة"); }
    setOpen(false); setRefresh((r) => r + 1);
  }

  function onDelete() {
    if (deleteId) { db.inventory.delete(deleteId); setDeleteId(null); setRefresh((r) => r + 1); toast.success("تم الحذف"); }
  }

  const balanceColor = balance > 0 ? "text-green-600" : balance < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center shadow-sm">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">مخزون مسحوق CoCr</h1>
            <p className="text-xs text-muted-foreground">إدارة المخزون والاستهلاك</p>
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
              <div>
                <p className="text-xs text-muted-foreground">إجمالي الوارد</p>
                <p className="text-lg font-bold text-green-600">{totalIn.toFixed(1)} غم</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center"><TrendingDown className="w-5 h-5 text-red-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">إجمالي المستهلك</p>
                <p className="text-lg font-bold text-red-600">{totalOut.toFixed(1)} غم</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><FlaskConical className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="text-xs text-muted-foreground">الرصيد الحالي</p>
                <p className={`text-lg font-bold ${balanceColor}`}>{balance.toFixed(1)} غم</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <div className="py-16 text-center"><Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">لا توجد حركات مخزون بعد</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">التاريخ</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">النوع</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الكمية (غم)</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">ملاحظات</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5">{e.date}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${e.type === "in" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
                        {e.type === "in" ? "وارد" : "صادر"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold">
                      <span className={e.type === "in" ? "text-green-600" : "text-red-600"}>
                        {e.type === "in" ? "+" : "-"}{e.quantity.toFixed(1)}
                      </span>
                    </td>
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
          <DialogHeader><DialogTitle>{editItem ? "تعديل الحركة" : "إضافة حركة مخزون"}</DialogTitle></DialogHeader>
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
                      <SelectItem value="in">وارد (إضافة)</SelectItem>
                      <SelectItem value="out">صادر (استهلاك)</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>الكمية (غرام) *</Label>
                <Input type="number" step="0.1" min="0.1" {...register("quantity", { required: true, min: 0.1 })} />
                {errors.quantity && <p className="text-destructive text-xs">الكمية مطلوبة</p>}
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
