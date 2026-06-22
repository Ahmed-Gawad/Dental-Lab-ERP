import { useState, useMemo, useRef } from "react";
import { db, Receipt } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Edit, Trash2, Receipt as ReceiptIcon, Printer } from "lucide-react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { useReactToPrint } from "react-to-print";

function formatCurrency(n: number) { return n.toLocaleString("ar-EG", { minimumFractionDigits: 2 }) + " ج.م"; }

const PAYMENT_METHODS = [{ value: "cash", label: "نقدي" }, { value: "transfer", label: "تحويل بنكي" }, { value: "check", label: "شيك" }];

type FormData = Omit<Receipt, "id" | "receipt_number" | "created_at">;
const today = new Date().toISOString().slice(0, 10);
const emptyForm: FormData = { invoice_id: "", customer_id: "", customer_name: "", date: today, amount: 0, payment_method: "cash", notes: "" };

function PrintReceipt({ receipt }: { receipt: Receipt }) {
  return (
    <div className="p-8 bg-white" style={{ fontFamily: "Cairo, Arial, sans-serif", direction: "rtl", color: "#000", maxWidth: "400px", margin: "0 auto" }}>
      <div className="text-center border-b-2 border-blue-700 pb-4 mb-6">
        <h1 className="text-xl font-bold text-blue-700">A to Z Digital Service</h1>
        <p className="text-xs text-gray-500">إيصال قبض</p>
      </div>
      <div className="space-y-2 mb-6">
        <div className="flex justify-between"><span className="text-gray-600 text-sm">رقم الإيصال:</span><span className="font-mono font-bold">{receipt.receipt_number}</span></div>
        <div className="flex justify-between"><span className="text-gray-600 text-sm">التاريخ:</span><span>{receipt.date}</span></div>
        <div className="flex justify-between"><span className="text-gray-600 text-sm">العميل:</span><span className="font-bold">{receipt.customer_name}</span></div>
        <div className="flex justify-between"><span className="text-gray-600 text-sm">طريقة السداد:</span><span>{receipt.payment_method === "cash" ? "نقدي" : receipt.payment_method === "transfer" ? "تحويل" : "شيك"}</span></div>
      </div>
      <div className="bg-blue-50 border-2 border-blue-700 rounded p-4 text-center mb-6">
        <p className="text-xs text-gray-600 mb-1">المبلغ المستلم</p>
        <p className="text-2xl font-bold text-blue-700">{formatCurrency(receipt.amount)}</p>
      </div>
      {receipt.notes && <p className="text-sm text-gray-600">ملاحظات: {receipt.notes}</p>}
      <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
        <p>توقيع المحاسب: _______________</p>
        <p className="mt-4">شكراً لثقتكم</p>
      </div>
    </div>
  );
}

export default function Receipts() {
  const [open, setOpen] = useState(false);
  const [printReceipt, setPrintReceipt] = useState<Receipt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<Receipt | null>(null);
  const [refresh, setRefresh] = useState(0);
  const printRef = useRef<HTMLDivElement>(null);

  const receipts = useMemo(() => db.receipts.getAll(), [refresh]);
  const customers = useMemo(() => db.customers.getAll(), []);
  const invoices = useMemo(() => db.invoices.getAll(), [refresh]);
  const totalCollected = useMemo(() => receipts.reduce((s, r) => s + r.amount, 0), [receipts]);

  const handlePrint = useReactToPrint({ contentRef: printRef, documentTitle: printReceipt?.receipt_number || "إيصال" });

  const { register, handleSubmit, reset, control, setValue, watch } = useForm<FormData>({ defaultValues: emptyForm });
  const selectedCustomer = watch("customer_id");
  const selectedInvoiceId = watch("invoice_id");
  const customerInvoices = invoices.filter((inv) => inv.customer_id === selectedCustomer);

  function openAdd() { setEditItem(null); reset(emptyForm); setOpen(true); }
  function openEdit(r: Receipt) { setEditItem(r); reset({ invoice_id: r.invoice_id, customer_id: r.customer_id, customer_name: r.customer_name, date: r.date, amount: r.amount, payment_method: r.payment_method, notes: r.notes }); setOpen(true); }

  function onSubmit(data: FormData) {
    const customer = customers.find((c) => c.id === data.customer_id);
    const payload = { ...data, amount: Number(data.amount), customer_name: customer?.name || "" };
    if (editItem) { db.receipts.update(editItem.id, payload); toast.success("تم التحديث"); }
    else { db.receipts.add(payload); toast.success("تم تسجيل الإيصال"); }
    setOpen(false); setRefresh((r) => r + 1);
  }

  function onDelete() {
    if (deleteId) { db.receipts.delete(deleteId); setDeleteId(null); setRefresh((r) => r + 1); toast.success("تم حذف الإيصال وتحديث حالة الفاتورة المرتبطة"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm">
            <ReceiptIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">الإيصالات</h1>
            <p className="text-xs text-muted-foreground">إجمالي المحصّل: {formatCurrency(totalCollected)}</p>
          </div>
        </div>
        <Button onClick={openAdd} className="gap-2 shadow-sm"><Plus className="w-4 h-4" />إيصال جديد</Button>
      </div>

      <Card className="shadow-sm border-border">
        <CardContent className="p-0">
          {receipts.length === 0 ? (
            <div className="py-16 text-center"><ReceiptIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" /><p className="text-muted-foreground">لا توجد إيصالات بعد</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">الرقم</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">العميل</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">التاريخ</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">المبلغ</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground">طريقة الدفع</th>
                  <th className="text-right px-4 py-3 font-semibold text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold">{r.receipt_number}</td>
                    <td className="px-4 py-2.5 font-semibold">{r.customer_name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-2.5 font-bold text-teal-600">{formatCurrency(r.amount)}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {r.payment_method === "cash" ? "نقدي" : r.payment_method === "transfer" ? "تحويل" : "شيك"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => { setPrintReceipt(r); setTimeout(() => handlePrint(), 100); }}>
                          <Printer className="w-3 h-3" />طباعة
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => openEdit(r)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-destructive hover:bg-destructive hover:text-white" onClick={() => setDeleteId(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
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
      <div className="hidden"><div ref={printRef}>{printReceipt && <PrintReceipt receipt={printReceipt} />}</div></div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader><DialogTitle>{editItem ? "تعديل الإيصال" : "إيصال قبض جديد"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>العميل *</Label>
                <Controller name="customer_id" control={control} rules={{ required: true }} render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => { field.onChange(v); const c = customers.find((x) => x.id === v); if (c) setValue("customer_name", c.name); setValue("invoice_id", ""); }}>
                    <SelectTrigger><SelectValue placeholder="اختر العميل" /></SelectTrigger>
                    <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              {customerInvoices.length > 0 && (
                <div className="col-span-2 space-y-1.5">
                  <Label>الفاتورة المرتبطة</Label>
                  <Controller name="invoice_id" control={control} render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(v) => {
                      const id = v === "none" ? "" : v;
                      field.onChange(id);
                      if (id) {
                        const inv = customerInvoices.find((i) => i.id === id);
                        if (inv) setValue("amount", Math.max(0, inv.total - inv.paid_amount));
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="اختر الفاتورة (اختياري)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">بدون فاتورة</SelectItem>
                        {customerInvoices.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.invoice_number} — الإجمالي {formatCurrency(inv.total)} — المتبقي {formatCurrency(Math.max(0, inv.total - inv.paid_amount))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )} />
                  {selectedInvoiceId && (
                    <p className="text-xs text-muted-foreground">
                      سيتم تحديث حالة سداد الفاتورة تلقائياً بعد حفظ هذا الإيصال.
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-1.5">
                <Label>التاريخ *</Label>
                <Input type="date" {...register("date", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>طريقة الدفع</Label>
                <Controller name="payment_method" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                  </Select>
                )} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>المبلغ (ج.م) *</Label>
                <Input type="number" min="0" step="0.01" {...register("amount", { required: true, min: 0.01 })} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>ملاحظات</Label>
                <Textarea {...register("notes")} placeholder="ملاحظات..." rows={2} />
              </div>
            </div>
            <DialogFooter className="gap-2 flex-row-reverse">
              <Button type="submit">{editItem ? "تحديث" : "تسجيل"}</Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader><AlertDialogTitle>تأكيد الحذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف هذا الإيصال؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
