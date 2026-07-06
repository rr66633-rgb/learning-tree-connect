import { useEffect, useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, useSearch } from "wouter";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";

type PaymentStatus = "loading" | "success" | "failed" | "error";

export default function PaymentCallback() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = useMemo(() => new URLSearchParams(searchString), [searchString]);
  
  const paymentId = params.get("id"); // Moyasar payment ID
  const status = params.get("status");
  const invoiceId = params.get("invoiceId");
  const planId = params.get("plan");
  const billingCycle = params.get("cycle") || "yearly";
  const orgId = params.get("org");

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("loading");
  const [message, setMessage] = useState("");
  const processedRef = useRef(false);

  // Activate subscription after successful payment
  const activateSubscription = trpc.subscriptionPayment.activate.useMutation({
    onSuccess: () => {
      // Subscription activated successfully
    },
    onError: (err: any) => {
      console.error("Failed to activate subscription:", err);
    },
  });

  // Verify invoice payment
  const verifyPayment = trpc.payments.verify.useMutation({
    onSuccess: (data) => {
      if (data.status === 'paid') {
        setPaymentStatus("success");
        setMessage("تم دفع الفاتورة بنجاح!");
      } else if (data.status === 'failed') {
        setPaymentStatus("failed");
        setMessage("فشلت عملية الدفع. يرجى المحاولة مرة أخرى.");
      } else if (data.status === 'not_configured') {
        setPaymentStatus("success");
        setMessage("تم تسجيل الدفع بنجاح.");
      } else {
        // Still processing - retry after delay
        setTimeout(() => {
          if (paymentId) {
            verifyPayment.mutate({ moyasarPaymentId: paymentId });
          }
        }, 3000);
      }
    },
    onError: (err: any) => {
      console.error("Payment verification failed:", err);
      if (err.data?.code === 'NOT_FOUND' && paymentId && invoiceId) {
        // Payment record not found - try to save it first
        savePayment.mutate({
          moyasarPaymentId: paymentId,
          invoiceId: Number(invoiceId),
          amount: 0,
          method: 'apple_pay',
          status: status || 'initiated',
        });
      } else {
        setPaymentStatus("error");
        setMessage("حدث خطأ أثناء التحقق من الدفع. يرجى التواصل مع الإدارة.");
      }
    },
  });

  // Save payment from callback (fallback when on_completed didn't fire)
  const savePayment = trpc.payments.saveFromMoyasar.useMutation({
    onSuccess: () => {
      if (paymentId) {
        verifyPayment.mutate({ moyasarPaymentId: paymentId });
      }
    },
    onError: () => {
      // Even if save fails, try to verify (might already exist)
      if (paymentId) {
        verifyPayment.mutate({ moyasarPaymentId: paymentId });
      }
    },
  });

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    if (!paymentId) {
      setPaymentStatus("error");
      setMessage("لم يتم العثور على معرف الدفع");
      return;
    }

    const isSubscription = planId && orgId;
    const isInvoicePayment = !!invoiceId;

    if (status === "paid") {
      if (isSubscription) {
        setPaymentStatus("success");
        setMessage("تم الدفع بنجاح! تم تفعيل اشتراكك.");
        activateSubscription.mutate({
          moyasarPaymentId: paymentId,
          organizationId: Number(orgId),
          planId: Number(planId),
          billingCycle: billingCycle as "monthly" | "yearly",
        });
      } else if (isInvoicePayment) {
        setMessage("جاري التحقق من الدفع...");
        verifyPayment.mutate({ moyasarPaymentId: paymentId });
      } else {
        setPaymentStatus("success");
        setMessage("تم الدفع بنجاح!");
      }
    } else if (status === "failed") {
      setPaymentStatus("failed");
      setMessage("فشلت عملية الدفع. يرجى المحاولة مرة أخرى.");
    } else if (isInvoicePayment && paymentId) {
      setMessage("جاري التحقق من حالة الدفع...");
      verifyPayment.mutate({ moyasarPaymentId: paymentId });
    } else {
      setPaymentStatus("error");
      setMessage("حالة الدفع غير معروفة. يرجى التواصل مع الدعم الفني.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, status]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background to-muted/20">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
          {paymentStatus === "loading" && (
            <>
              <div className="w-16 h-16 rounded-full bg-[#00C9B7]/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#00C9B7]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">جاري التحقق من الدفع</h2>
                <p className="text-muted-foreground text-sm">{message || "يرجى الانتظار..."}</p>
              </div>
            </>
          )}

          {paymentStatus === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-[#00C9B7]/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[#00C9B7]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">تم الدفع بنجاح!</h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="space-y-3 w-full">
                {invoiceId ? (
                  <Button
                    className="w-full bg-[#00C9B7] hover:bg-[#00C9B7]/90"
                    onClick={() => navigate("/parent/finance")}
                  >
                    العودة للفواتير
                  </Button>
                ) : (
                  <>
                    <Button
                      className="w-full bg-[#00C9B7] hover:bg-[#00C9B7]/90"
                      onClick={() => navigate("/staff")}
                    >
                      الذهاب للوحة التحكم
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/onboarding")}
                    >
                      إعداد الحضانة
                    </Button>
                  </>
                )}
              </div>
            </>
          )}

          {(paymentStatus === "failed" || paymentStatus === "error") && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {paymentStatus === "failed" ? "فشلت عملية الدفع" : "حدث خطأ"}
                </h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="space-y-3 w-full">
                {invoiceId ? (
                  <Button
                    className="w-full"
                    onClick={() => navigate("/parent/finance")}
                  >
                    العودة للفواتير والمحاولة مرة أخرى
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/checkout?plan=${planId}&cycle=${billingCycle}&org=${orgId || ""}`)}
                  >
                    إعادة المحاولة
                  </Button>
                )}
                <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-muted-foreground">
                  <ArrowRight className="w-4 h-4 ml-1" />
                  العودة للرئيسية
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
