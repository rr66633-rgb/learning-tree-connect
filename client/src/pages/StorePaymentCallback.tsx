import { useEffect, useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, useSearch } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type PaymentStatus = "loading" | "success" | "failed" | "error";

export default function StorePaymentCallback() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);

  const paymentId = params.get("id"); // Moyasar payment ID
  const status = params.get("status");
  const orderId = params.get("orderId");

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("loading");
  const [message, setMessage] = useState("جاري التحقق من الدفع...");
  const processedRef = useRef(false);

  const verifyPayment = trpc.store.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.status === "paid") {
        setPaymentStatus("success");
        setMessage("تم الدفع بنجاح! سيتم إعداد طلبك.");
      } else if (data.status === "failed") {
        setPaymentStatus("failed");
        setMessage("فشلت عملية الدفع. يرجى المحاولة مرة أخرى.");
      } else {
        // Still pending - retry
        setTimeout(() => {
          if (paymentId && orderId) {
            verifyPayment.mutate({ orderId: Number(orderId), moyasarPaymentId: paymentId });
          }
        }, 3000);
      }
    },
    onError: () => {
      setPaymentStatus("error");
      setMessage("حدث خطأ أثناء التحقق من الدفع.");
    },
  });

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    if (!paymentId || !orderId) {
      setPaymentStatus("error");
      setMessage("معلومات الدفع غير مكتملة");
      return;
    }

    if (status === "paid") {
      verifyPayment.mutate({ orderId: Number(orderId), moyasarPaymentId: paymentId });
    } else if (status === "failed") {
      setPaymentStatus("failed");
      setMessage("فشلت عملية الدفع. يرجى المحاولة مرة أخرى.");
    } else {
      // Try to verify anyway
      verifyPayment.mutate({ orderId: Number(orderId), moyasarPaymentId: paymentId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, status, orderId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
          {paymentStatus === "loading" && (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">جاري التحقق من الدفع</h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
            </>
          )}

          {paymentStatus === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">تم الدفع بنجاح!</h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="space-y-3 w-full">
                <Button className="w-full" onClick={() => navigate("/parent/store/orders")}>
                  عرض طلباتي
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate("/parent/store")}>
                  متابعة التسوق
                </Button>
              </div>
            </>
          )}

          {(paymentStatus === "failed" || paymentStatus === "error") && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">
                  {paymentStatus === "failed" ? "فشلت عملية الدفع" : "حدث خطأ"}
                </h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="space-y-3 w-full">
                <Button className="w-full" onClick={() => navigate("/parent/store")}>
                  العودة للمتجر
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
