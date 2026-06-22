import { useState, useMemo, useRef } from "react";
import { db, Invoice, InvoiceItem } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, FileText, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { useReactToPrint } from "react-to-print";

function formatCurrency(n: number) { return n.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) + " ج.م"; }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { unpaid: "غير مدفوعة", partial: "مدفوع جزئياً", paid: "مدفوعة" };
  return <span className={`status-${status} text-xs px-2 py-0.5 rounded-full font-medium`}>{map[status] || status}</span>;
}

type FormData = { customer_id: string; date: string; discount: number; notes: string; };
const today = new Date().toISOString().slice(0, 10);
const emptyForm: FormData = { customer_id: "", date: today, discount: 0, notes: "" };

function PrintInvoice({ invoice }: { invoice: Invoice }) {
  return (
    <div className="p-8 bg-white" style={{ fontFamily: "Cairo, Arial, sans-serif", direction: "rtl", color: "#000" }}>
      <div className="border-b-2 border-blue-700 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-700">A to Z Digital Service</h1>
        <p className="text-sm text-gray-600">مختبر أسنان رقمي متكامل</p>
      </div>
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold mb-1">فاتورة</h2>
          <p className="text-sm">رقم: <span className="font-mono font-bold">{invoice.invoice_number}</span></p>
          <p className="text-sm">التاريخ: {invoice.date}</p>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold">العميل:</p>
          <p className="text-base font-bold">{invoice.customer_name}</p>
        </div>
      </div>
      <table className="w-full border-collapse mb-6 text-sm">
        <thead>
          <tr className="bg-blue-700 text-white">
            <th className="border border-blue-600 px-3 py-2 text-right">الوصف</th>
            <th className="border border-blue-600 px-3 py-2 text-center">الكمية</th>
            <th className="border border-blue-600 px-3 py-2 text-left">سعر الوحدة</th>
            <th className="border border-blue-600 px-3 py-2 text-left">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}>
              <td className="border border-gray-200 px-3 py-2">{item.description}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{item.quantity}</td>
              <td className="border border-gray-200 px-3 py-2 text-left">{formatCurrency(item.unit_price)}</td>
              <td className="border border-gray-200 px-3 py-2 text-left font-semibold">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end">
        <div className="w-64">
          <div className="flex justify-between py-1"><span>المجموع الفرعي</span><span>{formatCurrency(invoice.subtotal)}</span></div>
          <div className="flex justify-between py-1 text-red-600"><span>الخصم</span><span>- {formatCurrency(invoice.discount)}</span></div>
          <div className="flex justify-between py-2 border-t-2 border-blue-700 font-bold text-lg"><span>الإجمالي</span><span className="text-blue-700">{formatCurrency(invoice.total)}</span></div>
          {invoice.paid_amount > 0 && (
            <>
              <div className="flex justify-between py-1 text-green-700 text-sm"><span>المحصّل</span><span>{formatCurrency(invoice.paid_amount)}</span></div>
              <div className="flex justify-between py-1 font-semibold text-sm"><span>المتبقي</span><span>{formatCurrency(Math.max(0, invoice.total - invoice.paid_amount))}</span></div>
            </>
          )}
        </div>
      </div>
      {invoice.notes && <p className="mt-4 text-sm text-gray-600 border-t pt-3">ملاحظات: {invoice.notes}</p>}
      <p className="mt-6 text-center text-xs text-gray-400">شكراً لثقتكم - A to Z Digital Service</p>
    </div>
  );
}

export default function Invoices() {
  const [open, setOpen] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [refresh, setRefresh] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  const invoices = useMemo(() => db.invoices.getAll(), [refresh]);
  const customers = useMemo(() => db.customers.getAll(), []);

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: printInvoice?.invoice_number || "فاتورة" });

  const { register, handleSubmit, reset, control, watch } = useForm<FormData>({ defaultValues: emptyForm });
  const discount = watch("discount") || 0;
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = Math.max(0, subtotal - Number(discount));

  function addItem() {
    setItems((prev) => [...prev, { case_id: "", description: "", quantity: 1, unit_price: 0, total: 0 }]);
  }

  function updateItem(idx: number, field: keyof InvoiceItem, val: string | number) {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx], [field]: val };
      if (field === "quantity" || field === "unit_price") {
        item.total = Number(item.quantity) * Number(item.unit_price);
      }
      next[idx] = item;
      return next;
    });
  }

  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  function openAdd() { setEditItem(null); reset(emptyForm); setItems([]); setOpen(true); }

  function openEdit(inv: Invoice) {
    setEditItem(inv);
    reset({ customer_id: inv.customer_id, date: inv.date, discount: inv.discount, notes: inv.notes });
    setItems(inv.items);
    setOpen(true);
  }

  function onSubmit(data: FormData) {
    if (items.length === 0) { toast.error("أضف بنداً واحداً على الأقل"); return; }
    const customer = customers.find((c) => c.id === data.customer_id);
    const payload = {
      customer_id: data.customer_id,
      customer_name: customer?.name || "",
      date: data.date,
      items,
      subtotal,
      discount: Number(data.discount),
      total,
      notes: data.notes,
    };
    if (editItem) { db.invoices.update(editItem.id, payload); toast.success("تم تحديث الفاتورة"); }
    else { db.invoices.add(payload); toast.success("تم إنشاء الفاتورة"); }
    setOpen(false); setRefresh((r) => r + 1);
  }

  function onDelete() {
    if (!deleteId) return;
    const linkedReceipts = db.receipts.getByInvoice(deleteId).length;
    if (linkedReceipts > 0) {
      toast.error("لا يمكن حذف هذه الفاتورة لوجود إيصالات قبض مرتبطة بها. احذف الإيصالات المرتبطة أولاً من صفحة الإيصالات.");
      setDeleteId(null);
      return;
    }
    db.invoices.delete(deleteId);
    setDeleteId(null);
    setRefresh((r) => r + 1);
    toast.success("تم حذف الفاتورة");
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div><h1 className="text-xl font-bold text-foreground">الفواتير</h1><p className="text-xs text-muted-foreground">{invoices.length} فاتورة</p></div>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm"><Plus className="w-4 h-4" />فاتورة جديدة</Button>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="py-16 text-center"><FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">لا توجد فواتير بعد</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الرقم</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">العميل</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">التاريخ</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الإجمالي</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">المتبقي</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الحالة</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold">{inv.invoice_number}</td>
                    <td className="px-4 py-2.5 font-semibold">{inv.customer_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{inv.date}</td>
                    <td className="px-4 py-2.5 font-bold text-primary">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {inv.status === "paid" ? "—" : formatCurrency(Math.max(0, inv.total - inv.paid_amount))}
                    </td>
                    <td className="px-4 py-2.5"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => { setPrintInvoice(inv); setTimeout(() => handlePrint(), 100); }}>
                          <Printer className="w-3 h-3" />طباعة
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(inv)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-white" onClick={() => setDeleteId(inv.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Hidden print area */}
      <div className="hidden">
        <div ref={printRef}>{printInvoice && <PrintInvoice invoice={printInvoice} />}</div>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{editItem ? "تعديل الفاتورة" : "فاتورة جديدة"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>العميل *</Label>
                <Controller name="customer_id" control={control} rules={{ required: true }} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label>التاريخ *</Label>
                <Input type="date" {...register("date", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>الحالة</Label>
                <div className="h-9 flex items-center px-3 bg-muted/30 border border-dashed border-border rounded-md text-xs text-muted-foreground">
                  {editItem ? <StatusBadge status={editItem.status} /> : "تُحسب تلقائياً من الإيصالات"}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>الخصم (ج.م)</Label>
                <Input type="number" min="0" step="0.01" {...register("discount")} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              ملاحظة: حالة سداد الفاتورة (غير مدفوعة / جزئي / مدفوعة) تُحدَّث تلقائياً عند تسجيل إيصالات قبض من صفحة الإيصالات، ولا يمكن تعديلها يدوياً هنا.
            </p>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">بنود الفاتورة</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1 text-xs h-7"><Plus className="w-3 h-3" />إضافة بند</Button>
              </div>
              {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-lg border border-dashed border-border">لم يتم إضافة بنود بعد</p>}
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-muted/20 p-2 rounded-lg">
                  <div className="col-span-5">
                    {idx === 0 && <Label className="text-xs mb-1 block">الوصف</Label>}
                    <Input value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} placeholder="وصف العمل" className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs mb-1 block">الكمية</Label>}
                    <Input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs mb-1 block">السعر</Label>}
                    <Input type="number" min="0" step="0.01" value={item.unit_price} onChange={(e) => updateItem(idx, "unit_price", Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <Label className="text-xs mb-1 block">الإجمالي</Label>}
                    <div className="h-8 flex items-center px-2 bg-primary/5 border border-primary/20 rounded text-sm font-semibold text-primary">{item.total.toLocaleString("ar-EG")}</div>
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <div className="mb-1 h-4" />}
                    <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => removeItem(idx)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">المجموع الفرعي</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-red-600"><span>الخصم</span><span>- {formatCurrency(Number(discount))}</span></div>
                <div className="flex justify-between border-t border-border pt-1.5"><span className="font-bold">الإجمالي</span><span className="font-bold text-primary text-base">{formatCurrency(total)}</span></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ملاحظات</Label>
              <Textarea {...register("notes")} placeholder="ملاحظات..." rows={2} />
            </div>

            <DialogFooter className="gap-2 flex-row-reverse">
              <Button type="submit">{editItem ? "تحديث" : "إنشاء الفاتورة"}</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف هذه الفاتورة؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
