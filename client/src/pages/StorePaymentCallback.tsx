import { useEffect, useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, useSearch } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next';

type PaymentStatus = "loading" | "success" | "failed" | "error";

export default function StorePaymentCallback() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);

  const paymentId = params.get("id"); // Moyasar payment ID
  const status = params.get("status");
  const orderId = params.get("orderId");

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("loading");
  const [message, setMessage] = useState(isAr ? "جاري التحقق من الدفع..." : "Verifying Payment...");
  const processedRef = useRef(false);

  const verifyPayment = trpc.store.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.status === "paid") {
        setPaymentStatus("success");
        setMessage(isAr ? "تم الدفع بنجاح! سيتم إعداد طلبك." : "Payment successful! Your order will be prepared.");
      } else if (data.status === "failed") {
        setPaymentStatus("failed");
        setMessage(isAr ? "فشلت عملية الدفع. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.");
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
      setMessage(isAr ? "حدث خطأ أثناء التحقق من الدفع." : "An error occurred while verifying payment.");
    },
  });

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    if (!paymentId || !orderId) {
      setPaymentStatus("error");
      setMessage(isAr ? "معلومات الدفع غير مكتملة" : "Incomplete Payment Information");
      return;
    }

    if (status === "paid") {
      verifyPayment.mutate({ orderId: Number(orderId), moyasarPaymentId: paymentId });
    } else if (status === "failed") {
      setPaymentStatus("failed");
      setMessage(isAr ? "فشلت عملية الدفع. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.");
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
                <h2 className="text-xl font-semibold">{isAr ? "جاري التحقق من الدفع" : "Verifying Payment"}</h2>
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
                <h2 className="text-xl font-semibold">{isAr ? "تم الدفع بنجاح!" : "Payment successful!"}</h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="space-y-3 w-full">
                <Button className="w-full" onClick={() => navigate("/parent/store/orders")}>
                  {isAr ? "عرض طلباتي" : "View My Orders"}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate("/parent/store")}>
                  {isAr ? "متابعة التسوق" : "Continue Shopping"}
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
                  {paymentStatus === "failed" ? isAr ? "فشلت عملية الدفع" : "Payment Failed" : isAr ? "حدث خطأ" : "An error occurred"}
                </h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="space-y-3 w-full">
                <Button className="w-full" onClick={() => navigate("/parent/store")}>
                  {isAr ? "العودة للمتجر" : "Back to Store"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
