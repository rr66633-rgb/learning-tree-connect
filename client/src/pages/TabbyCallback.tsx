import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TabbyCallback() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  const invoiceId = params.get("invoiceId");
  const paymentId = params.get("payment_id");

  const isSuccess = status === "success";
  const isCancelled = status === "cancel";
  const isFailed = status === "failure";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="max-w-md w-full text-center space-y-6">
        {isSuccess && (
          <>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h1 className="text-2xl font-bold text-green-700">تم الدفع بنجاح!</h1>
            <p className="text-muted-foreground">تم تسجيل دفعتك عبر تابي. سيتم تحديث حالة الفاتورة تلقائياً.</p>
          </>
        )}
        {isCancelled && (
          <>
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-bold text-amber-700">تم إلغاء الدفع</h1>
            <p className="text-muted-foreground">لقد ألغيت عملية الدفع. يمكنك المحاولة مرة أخرى أو اختيار طريقة دفع أخرى.</p>
          </>
        )}
        {isFailed && (
          <>
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-red-700">فشلت عملية الدفع</h1>
            <p className="text-muted-foreground">نأسف، تابي غير قادرة على الموافقة على هذه العملية. الرجاء استخدام طريقة دفع أخرى.</p>
          </>
        )}
        <div className="flex gap-3 justify-center pt-4">
          <Button onClick={() => navigate("/parent/finance")}>
            العودة للفواتير
          </Button>
          {!isSuccess && (
            <Button variant="outline" onClick={() => navigate("/parent/finance")}>
              اختيار طريقة دفع أخرى
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
