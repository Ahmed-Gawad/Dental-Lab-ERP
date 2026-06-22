import { useState, useMemo } from "react";
import { db, Customer } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Phone, MapPin, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

type FormData = Omit<Customer, "id" | "created_at">;

const empty: FormData = { name: "", phone: "", address: "", notes: "" };

export default function Customers() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const [refresh, setRefresh] = useState(0);

  const customers = useMemo(() => {
    const all = db.customers.getAll();
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [search, refresh]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({ defaultValues: empty });

  function openAdd() {
    setEditItem(null);
    reset(empty);
    setOpen(true);
  }

  function openEdit(c: Customer) {
    setEditItem(c);
    reset({ name: c.name, phone: c.phone, address: c.address, notes: c.notes });
    setOpen(true);
  }

  function onSubmit(data: FormData) {
    if (editItem) {
      db.customers.update(editItem.id, data);
      toast.success("تم تحديث بيانات العميل");
    } else {
      db.customers.add(data);
      toast.success("تم إضافة العميل بنجاح");
    }
    setOpen(false);
    setRefresh((r) => r + 1);
  }

  function onDelete() {
    if (!deleteId) return;
    const linkedCases = db.cases.getByCustomer(deleteId).length;
    const linkedInvoices = db.invoices.getByCustomer(deleteId).length;
    if (linkedCases > 0 || linkedInvoices > 0) {
      toast.error("لا يمكن حذف هذا العميل لوجود حالات أو فواتير مرتبطة به. احذفها أولاً إن كنت متأكداً.");
      setDeleteId(null);
      return;
    }
    db.customers.delete(deleteId);
    setDeleteId(null);
    setRefresh((r) => r + 1);
    toast.success("تم حذف العميل");
  }

  const caseCount = (id: string) => db.cases.getByCustomer(id).length;
  const invoiceCount = (id: string) => db.invoices.getByCustomer(id).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">العملاء</h1>
            <p className="text-xs text-muted-foreground">{customers.length} عميل</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm">
          <Plus className="w-4 h-4" />
          إضافة عميل
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* Table */}
      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">لا يوجد عملاء{search ? " مطابقون للبحث" : " بعد"}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">#</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الاسم</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الهاتف</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">العنوان</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الحالات</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الفواتير</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{c.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span dir="ltr">{c.phone || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{c.address || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-100">
                        <FileText className="w-3 h-3" />
                        {caseCount(c.id)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full border border-green-100">
                        <FileText className="w-3 h-3" />
                        {invoiceCount(c.id)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(c)}>
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-white" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>الاسم *</Label>
              <Input {...register("name", { required: true })} placeholder="اسم العميل" />
              {errors.name && <p className="text-destructive text-xs">الاسم مطلوب</p>}
            </div>
            <div className="space-y-1.5">
              <Label>رقم الهاتف</Label>
              <Input {...register("phone")} placeholder="رقم الهاتف" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>العنوان</Label>
              <Input {...register("address")} placeholder="العنوان" />
            </div>
            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea {...register("notes")} placeholder="ملاحظات إضافية" rows={3} />
            </div>
            <DialogFooter className="gap-2 flex-row-reverse">
              <Button type="submit">{editItem ? "تحديث" : "إضافة"}</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
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
