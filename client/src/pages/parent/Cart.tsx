import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Package } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function Cart() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const locale = i18n.language === "ar" ? "ar-SA" : "en-US";
  const [, navigate] = useLocation();
  const { data: cart, isLoading } = trpc.store.getCart.useQuery();
  const utils = trpc.useUtils();

  const updateCartItem = trpc.store.updateCartItem.useMutation({
    onSuccess: () => utils.store.getCart.invalidate(),
    onError: (e: any) => toast.error(e.message || (isAr ? "حدث خطأ" : "An error occurred")),
  });

  const removeFromCart = trpc.store.removeFromCart.useMutation({
    onSuccess: () => { utils.store.getCart.invalidate(); toast.success(isAr ? "تم الحذف من السلة" : "Removed from cart"); },
    onError: (e: any) => toast.error(e.message || (isAr ? "حدث خطأ" : "An error occurred")),
  });

  const clearCart = trpc.store.clearCart.useMutation({
    onSuccess: () => { utils.store.getCart.invalidate(); toast.success(isAr ? "تم تفريغ السلة" : "Cart cleared"); },
    onError: (e: any) => toast.error(e.message || (isAr ? "حدث خطأ" : "An error occurred")),
  });

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  const total = cart?.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0) || 0;

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAr ? "سلة المشتريات" : "Shopping Cart"}</h1>
          <p className="text-muted-foreground">{cart?.length || 0} {isAr ? "عنصر" : "Item"}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate("/parent/store")}>
          <ArrowLeft className="h-4 w-4 ml-1" />
          {isAr ? "متابعة التسوق" : "Continue Shopping"}
        </Button>
      </div>

      {!cart?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{isAr ? "السلة فارغة" : "Cart is Empty"}</p>
            <p className="text-muted-foreground mb-4">{isAr ? "أضف منتجات من المتجر لتظهر هنا" : "Add products from the store to appear here"}</p>
            <Button onClick={() => navigate("/parent/store")}>{isAr ? "تصفح المتجر" : "Browse Store"}</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cart Items */}
          <div className="space-y-3">
            {cart.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product.nameAr} className="w-20 h-20 object-contain rounded-lg bg-muted" />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{item.product.nameAr}</h3>
                      <p className="text-primary font-bold mt-1">{item.product.price} {isAr ? "ر.س" : "SAR"}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 border rounded-lg">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={item.quantity <= 1 || updateCartItem.isPending}
                            onClick={() => updateCartItem.mutate({ cartItemId: item.id, quantity: item.quantity - 1 })}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            disabled={updateCartItem.isPending}
                            onClick={() => updateCartItem.mutate({ cartItemId: item.id, quantity: item.quantity + 1 })}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeFromCart.mutate({ cartItemId: item.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">{(Number(item.product.price) * item.quantity).toFixed(2)} {isAr ? "ر.س" : "SAR"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{isAr ? "ملخص الطلب" : "Request Summary"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isAr ? "المجموع الفرعي" : "Subtotal"}</span>
                <span>{total.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{isAr ? "التوصيل" : "Delivery"}</span>
                <span className="text-green-600">{isAr ? "استلام من الحضانة" : "Pick up from Nursery"}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>{isAr ? "الإجمالي" : "Total"}</span>
                <span className="text-primary">{total.toFixed(2)} {isAr ? "ر.س" : "SAR"}</span>
              </div>
              <Button className="w-full mt-4" size="lg" onClick={() => navigate("/parent/store/checkout")}>
                {isAr ? "إتمام الطلب" : "Complete Order"}
              </Button>
              <Button variant="ghost" className="w-full text-red-500" onClick={() => { if (confirm(isAr ? "هل تريد تفريغ السلة؟" : "Do you want to empty the cart?")) clearCart.mutate(); }}>
                {isAr ? "تفريغ السلة" : "Empty Cart"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
