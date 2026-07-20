import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Shield, CreditCard, CheckCircle2, Loader2, XCircle, Package } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { loadMoyasar } from "@/lib/externalResources";

declare global {
  interface Window {
    Moyasar: any;
  }
}

export default function StoreCheckout() {
  const [, navigate] = useLocation();
  const { data: cart, isLoading: cartLoading } = trpc.store.getCart.useQuery();
  const { data: paymentConfig } = trpc.store.getPaymentConfig.useQuery();
  const utils = trpc.useUtils();

  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"summary" | "payment" | "success" | "failed">("summary");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const moyasarRef = useRef<HTMLDivElement>(null);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  const createOrder = trpc.store.createOrder.useMutation({
    onSuccess: (data) => {
      setOrderId(data.orderId);
      setOrderNumber(data.orderNumber);
      utils.store.getCart.invalidate();
      // Initialize Moyasar payment
      initMoyasarPayment(data.orderId, Number(data.total));
    },
    onError: (e: any) => toast.error(e.message || "حدث خطأ في إنشاء الطلب"),
  });

  const verifyPayment = trpc.store.verifyPayment.useMutation({
    onSuccess: (data) => {
      if (data.status === "paid") {
        setStep("success");
      } else if (data.status === "failed") {
        setStep("failed");
      }
    },
    onError: () => {
      setStep("failed");
    },
  });

  function initMoyasarPayment(oId: number, totalAmount: number) {
    if (!paymentConfig?.publishableKey) {
      toast.error("بوابة الدفع غير مفعلة");
      return;
    }
    setStep("payment");

    setTimeout(() => {
      loadMoyasar().then(() => {
        if (!moyasarRef.current || !window.Moyasar) return;
        moyasarRef.current.innerHTML = "";

        const amountInHalalas = Math.round(totalAmount * 100);

        try {
          window.Moyasar.init({
            element: moyasarRef.current,
            amount: amountInHalalas,
            currency: "SAR",
            description: `طلب متجر #${orderNumber}`,
            publishable_api_key: paymentConfig.publishableKey,
            callback_url: `${window.location.origin}/store-payment-callback?orderId=${oId}`,
            methods: ["creditcard", "applepay"],
            supported_networks: ["visa", "mastercard", "mada"],
            apple_pay: {
              country: "SA",
              label: "Naashah Store",
              validate_merchant_url: "https://api.moyasar.com/v1/applepay/initiate",
              version: 6,
              supported_countries: ["SA"],
            },
            language: "ar",
            fixed_width: false,
            on_initiating: function () {
              setPaymentInitiated(true);
              return true;
            },
            on_completed: function (payment: any) {
              if (payment.status === "paid") {
                verifyPayment.mutate({ orderId: oId, moyasarPaymentId: payment.id });
              } else {
                setStep("failed");
              }
            },
            on_failure: function () {
              setStep("failed");
            },
            metadata: {
              orderId: String(oId),
              type: "store_order",
            },
          });
        } catch (err) {
          console.error("Moyasar init error:", err);
          toast.error("حدث خطأ في تهيئة بوابة الدفع");
        }
      });
    }, 100);
  }

  if (cartLoading) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;

  const total = cart?.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0) || 0;

  if (!cart?.length && step === "summary") {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">السلة فارغة</p>
            <Button className="mt-4" onClick={() => navigate("/parent/store")}>العودة للمتجر</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (step === "success") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">تم الدفع بنجاح!</h2>
              <p className="text-muted-foreground">رقم الطلب: #{orderNumber}</p>
              <p className="text-sm text-muted-foreground">سيتم إعداد طلبك وإشعارك عندما يكون جاهزاً للاستلام من الحضانة</p>
            </div>
            <div className="space-y-3 w-full">
              <Button className="w-full" onClick={() => navigate("/parent/store/orders")}>
                عرض طلباتي
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate("/parent/store")}>
                متابعة التسوق
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Failed state
  if (step === "failed") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">فشلت عملية الدفع</h2>
              <p className="text-muted-foreground">يرجى المحاولة مرة أخرى أو استخدام وسيلة دفع مختلفة</p>
            </div>
            <div className="space-y-3 w-full">
              <Button className="w-full" onClick={() => navigate("/parent/store/cart")}>
                العودة للسلة
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/parent/store")}>
                العودة للمتجر
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment step
  if (step === "payment") {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">إتمام الدفع</h1>
          <p className="text-muted-foreground text-sm">ادفع بأمان عبر بوابة ميسر</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              بيانات الدفع
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentInitiated ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">جاري معالجة الدفع...</p>
              </div>
            ) : (
              <div ref={moyasarRef} className="moyasar-form" />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>مدفوعاتك محمية بتشفير SSL 256-bit</span>
        </div>

        <div className="flex items-center justify-center gap-4 opacity-60">
          <img src="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.9/dist/assets/mada.svg" alt="مدى" className="h-6" />
          <img src="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.9/dist/assets/visa.svg" alt="Visa" className="h-6" />
          <img src="https://cdn.jsdelivr.net/npm/moyasar-payment-form@2.2.9/dist/assets/mastercard.svg" alt="Mastercard" className="h-6" />
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={() => navigate("/parent/store/cart")} className="text-muted-foreground">
            <ArrowRight className="w-4 h-4 ml-1" />
            العودة للسلة
          </Button>
        </div>
      </div>
    );
  }

  // Summary step (default)
  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إتمام الطلب</h1>
        <Button variant="ghost" onClick={() => navigate("/parent/store/cart")}>
          <ArrowRight className="w-4 h-4 ml-1" />
          العودة
        </Button>
      </div>

      {/* Order Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">تفاصيل الطلب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cart?.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                {item.product.imageUrl ? (
                  <img src={item.product.imageUrl} alt="" className="w-10 h-10 object-contain rounded bg-muted" />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{item.product.nameAr}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity} × {item.product.price} ر.س</p>
                </div>
              </div>
              <span className="font-medium">{(Number(item.product.price) * item.quantity).toFixed(2)} ر.س</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-4">
          <label className="text-sm font-medium mb-2 block">ملاحظات (اختياري)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="أي ملاحظات خاصة بالطلب..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Total & Pay */}
      <Card className="border-primary/20">
        <CardContent className="pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">المجموع</span>
            <span>{total.toFixed(2)} ر.س</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">طريقة الاستلام</span>
            <span className="text-green-600">استلام من الحضانة</span>
          </div>
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>الإجمالي</span>
            <span className="text-primary">{total.toFixed(2)} ر.س</span>
          </div>
          <Button
            className="w-full mt-4"
            size="lg"
            disabled={createOrder.isPending}
            onClick={() => createOrder.mutate({ notes: notes || undefined })}
          >
            {createOrder.isPending ? (
              <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> جاري إنشاء الطلب...</>
            ) : (
              <><CreditCard className="h-4 w-4 ml-2" /> ادفع الآن</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
