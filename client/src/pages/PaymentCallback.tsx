import { useEffect, useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, useSearch } from "wouter";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { useTranslation } from 'react-i18next';

type PaymentStatus = "loading" | "success" | "failed" | "error";

export default function PaymentCallback() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
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
        setMessage(isAr ? "تم دفع الفاتورة بنجاح!" : "Invoice Paid Successfully!");
      } else if (data.status === 'failed') {
        setPaymentStatus("failed");
        setMessage(isAr ? "فشلت عملية الدفع. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.");
      } else if (data.status === 'not_configured') {
        setPaymentStatus("success");
        setMessage(isAr ? "تم تسجيل الدفع بنجاح." : "Payment recorded successfully.");
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
        // Amount will be corrected from Moyasar API during verify
        savePayment.mutate({
          moyasarPaymentId: paymentId,
          invoiceId: Number(invoiceId),
          amount: 0, // Will be updated from Moyasar API during verification
          method: 'apple_pay',
          status: status || 'initiated',
        });
      } else {
        setPaymentStatus("error");
        setMessage(isAr ? "حدث خطأ أثناء التحقق من الدفع. يرجى التواصل مع الإدارة." : "An error occurred while verifying payment. Please contact administration.");
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
      setMessage(isAr ? "لم يتم العثور على معرف الدفع" : "Payment ID not found");
      return;
    }

    const isSubscription = planId && orgId;
    const isInvoicePayment = !!invoiceId;

    if (status === "paid") {
      if (isSubscription) {
        setPaymentStatus("success");
        setMessage(isAr ? "تم الدفع بنجاح! تم تفعيل اشتراكك." : "Payment successful! Your subscription has been activated.");
        activateSubscription.mutate({
          moyasarPaymentId: paymentId,
          organizationId: Number(orgId),
          planId: Number(planId),
          billingCycle: billingCycle as "monthly" | "yearly",
        });
      } else if (isInvoicePayment) {
        setMessage(isAr ? "جاري التحقق من الدفع..." : "Verifying Payment...");
        verifyPayment.mutate({ moyasarPaymentId: paymentId });
      } else {
        setPaymentStatus("success");
        setMessage(isAr ? "تم الدفع بنجاح!" : "Payment successful!");
      }
    } else if (status === "failed") {
      setPaymentStatus("failed");
      setMessage(isAr ? "فشلت عملية الدفع. يرجى المحاولة مرة أخرى." : "Payment failed. Please try again.");
    } else if (isInvoicePayment && paymentId) {
      setMessage(isAr ? "جاري التحقق من حالة الدفع..." : "Checking Payment Status...");
      verifyPayment.mutate({ moyasarPaymentId: paymentId });
    } else {
      setPaymentStatus("error");
      setMessage(isAr ? "حالة الدفع غير معروفة. يرجى التواصل مع الدعم الفني." : "Payment status unknown. Please contact technical support.");
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
                <h2 className="text-xl font-semibold text-foreground">{isAr ? "جاري التحقق من الدفع" : "Verifying Payment"}</h2>
                <p className="text-muted-foreground text-sm">{message || isAr ? "يرجى الانتظار..." : "Please wait..."}</p>
              </div>
            </>
          )}

          {paymentStatus === "success" && (
            <>
              <div className="w-16 h-16 rounded-full bg-[#00C9B7]/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[#00C9B7]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">{isAr ? "تم الدفع بنجاح!" : "Payment successful!"}</h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="space-y-3 w-full">
                {invoiceId ? (
                  <Button
                    className="w-full bg-[#00C9B7] hover:bg-[#00C9B7]/90"
                    onClick={() => navigate("/parent/finance")}
                  >
                    {isAr ? "العودة للفواتير" : "Back to Invoices"}
                  </Button>
                ) : (
                  <>
                    <Button
                      className="w-full bg-[#00C9B7] hover:bg-[#00C9B7]/90"
                      onClick={() => navigate("/staff")}
                    >
                      {isAr ? "الذهاب للوحة التحكم" : "Go to Dashboard"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate("/onboarding")}
                    >
                      {isAr ? "إعداد الحضانة" : "Nursery Setup"}
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
                  {paymentStatus === "failed" ? isAr ? "فشلت عملية الدفع" : "Payment Failed" : isAr ? "حدث خطأ" : "An error occurred"}
                </h2>
                <p className="text-muted-foreground text-sm">{message}</p>
              </div>
              <div className="space-y-3 w-full">
                {invoiceId ? (
                  <Button
                    className="w-full"
                    onClick={() => navigate("/parent/finance")}
                  >
                    {isAr ? "العودة للفواتير والمحاولة مرة أخرى" : "Back to Invoices & Try Again"}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/checkout?plan=${planId}&cycle=${billingCycle}&org=${orgId || ""}`)}
                  >
                    {isAr ? "إعادة المحاولة" : "Retry"}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => navigate("/")} className="w-full text-muted-foreground">
                  <ArrowRight className="w-4 h-4 ml-1" />
                  {isAr ? "العودة للرئيسية" : "Back to Home"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
