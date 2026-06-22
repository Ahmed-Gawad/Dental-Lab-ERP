import { useState, useMemo } from "react";
import { db, Case } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Layers, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";

const WORK_TYPES = ["تاج", "جسر", "هيكل معدني", "تيجان زركون", "أطقم كاملة", "أطقم جزئية", "فينير", "جذر صناعي", "أخرى"];
const SHADES = ["A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4", "C1", "C2", "C3", "C4", "D2", "D3", "D4", "بلا لون"];
const STATUSES = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "completed", label: "مكتمل" },
  { value: "delivered", label: "تم التسليم" },
];

type FormData = {
  customer_id: string;
  customer_name: string;
  date: string;
  teeth_count: number;
  work_type: string;
  shade: string;
  status: Case["status"];
  price: number;
  notes: string;
};

const today = new Date().toISOString().slice(0, 10);
const emptyForm: FormData = { customer_id: "", customer_name: "", date: today, teeth_count: 1, work_type: "تاج", shade: "A2", status: "pending", price: 0, notes: "" };

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { pending: "قيد الانتظار", in_progress: "قيد التنفيذ", completed: "مكتمل", delivered: "تم التسليم" };
  return <span className={`status-${status.replace("_", "-")} text-xs px-2 py-0.5 rounded-full font-medium`}>{map[status] || status}</span>;
}

export default function Cases() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Case | null>(null);
  const [refresh, setRefresh] = useState(0);

  const customers = useMemo(() => db.customers.getAll(), [refresh]);
  const cases = useMemo(() => {
    let all = db.cases.getAll();
    if (statusFilter !== "all") all = all.filter((c) => c.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      all = all.filter((c) => c.customer_name.toLowerCase().includes(q) || c.work_type.toLowerCase().includes(q));
    }
    return all;
  }, [search, statusFilter, refresh]);

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<FormData>({ defaultValues: emptyForm });
  const teethCount = watch("teeth_count") || 0;

  function openAdd() {
    setEditItem(null);
    reset(emptyForm);
    setOpen(true);
  }

  function openEdit(c: Case) {
    setEditItem(c);
    reset({ customer_id: c.customer_id, customer_name: c.customer_name, date: c.date, teeth_count: c.teeth_count, work_type: c.work_type, shade: c.shade, status: c.status, price: c.price, notes: c.notes });
    setOpen(true);
  }

  function onSubmit(data: FormData) {
    const customer = customers.find((c) => c.id === data.customer_id);
    const payload = { ...data, customer_name: customer?.name || data.customer_name, teeth_count: Number(data.teeth_count), price: Number(data.price) };
    if (editItem) {
      db.cases.update(editItem.id, payload);
      toast.success("تم تحديث الحالة");
    } else {
      db.cases.add(payload);
      toast.success("تم إضافة الحالة");
    }
    setOpen(false);
    setRefresh((r) => r + 1);
  }

  function onDelete() {
    if (deleteId) { db.cases.delete(deleteId); setDeleteId(null); setRefresh((r) => r + 1); toast.success("تم حذف الحالة"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">الحالات</h1>
            <p className="text-xs text-muted-foreground">{cases.length} حالة</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm"><Plus className="w-4 h-4" />إضافة حالة</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          {cases.length === 0 ? (
            <div className="py-16 text-center"><Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">لا توجد حالات</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">العميل</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">التاريخ</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">النوع</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">الأسنان</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">
                      <div className="flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5 text-purple-500" />المسحوق</div>
                    </th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">اللون</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">السعر</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground">الحالة</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-2.5 font-semibold">{c.customer_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{c.date}</td>
                      <td className="px-3 py-2.5">{c.work_type}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100 font-medium">{c.teeth_count}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full border border-purple-100 font-medium">{c.powder_weight.toFixed(1)} غم</span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">{c.shade}</td>
                      <td className="px-3 py-2.5 font-semibold">{c.price.toLocaleString("ar-EG")} ج.م</td>
                      <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(c)}><Edit className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-white" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader><DialogTitle>{editItem ? "تعديل الحالة" : "إضافة حالة جديدة"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>العميل *</Label>
                <Controller name="customer_id" control={control} rules={{ required: true }} render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { field.onChange(v); const c = customers.find((x) => x.id === v); if (c) setValue("customer_name", c.name); }}>
                    <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
                {errors.customer_id && <p className="text-destructive text-xs">العميل مطلوب</p>}
              </div>

              <div className="space-y-1.5">
                <Label>التاريخ *</Label>
                <Input type="date" {...register("date", { required: true })} />
              </div>

              <div className="space-y-1.5">
                <Label>نوع العمل *</Label>
                <Controller name="work_type" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{WORK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>

              <div className="space-y-1.5">
                <Label>عدد الأسنان *</Label>
                <Input type="number" min="1" {...register("teeth_count", { required: true, min: 1 })} />
              </div>

              <div className="space-y-1.5">
                <Label>المسحوق المحسوب</Label>
                <div className="flex items-center h-9 px-3 bg-purple-50 border border-purple-200 rounded-md text-purple-700 font-semibold text-sm">
                  <FlaskConical className="w-4 h-4 ml-1.5" />
                  {(Number(teethCount) * 2.5).toFixed(1)} غم
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>درجة اللون</Label>
                <Controller name="shade" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SHADES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>

              <div className="space-y-1.5">
                <Label>السعر (ج.م)</Label>
                <Input type="number" min="0" {...register("price")} />
              </div>

              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <Controller name="status" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
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
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه الحالة؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
