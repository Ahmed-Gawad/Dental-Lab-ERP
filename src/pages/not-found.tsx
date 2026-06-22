import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div dir="rtl" className="min-h-screen w-full flex items-center justify-center bg-gray-50" style={{ fontFamily: "Cairo, Arial, sans-serif" }}>
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center gap-2 mb-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">الصفحة غير موجودة</h1>
          </div>

          <p className="mt-2 mb-5 text-sm text-gray-600">
            الصفحة التي تحاول الوصول إليها غير موجودة أو تم نقلها.
          </p>

          <Link href="/">
            <Button className="gap-2">
              <Home className="w-4 h-4" />
              العودة للوحة التحكم
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
