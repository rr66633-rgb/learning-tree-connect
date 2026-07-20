import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { ShoppingBag, ShoppingCart, Store as StoreIcon, Package, Search, SlidersHorizontal, X } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ParentStore() {
  const [, navigate] = useLocation();
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPriceLimit, setMaxPriceLimit] = useState(1000);

  const { data: organizations, isLoading: orgsLoading } = trpc.store.getStoreOrganizations.useQuery();
  const { data: products, isLoading: productsLoading } = trpc.store.getProducts.useQuery(
    { organizationId: selectedOrgId!, categoryId: selectedCategoryId || undefined },
    { enabled: !!selectedOrgId }
  );
  const { data: categories } = trpc.store.getCategories.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );
  const { data: cart } = trpc.store.getCart.useQuery();

  const addToCart = trpc.store.addToCart.useMutation({
    onSuccess: () => { trpc.useUtils().store.getCart.invalidate(); toast.success("تمت الإضافة للسلة"); },
    onError: (e: any) => toast.error(e.message || "حدث خطأ"),
  });

  // Calculate max price when products change
  useMemo(() => {
    if (products && products.length > 0) {
      const max = Math.max(...products.map(p => Number(p.price)));
      const roundedMax = Math.ceil(max / 50) * 50; // Round up to nearest 50
      setMaxPriceLimit(roundedMax || 1000);
      setPriceRange([0, roundedMax || 1000]);
    }
  }, [products]);

  // Filter products by search and price
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((product) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = product.name?.toLowerCase().includes(query);
        const matchNameAr = product.nameAr?.toLowerCase().includes(query);
        const matchDesc = product.description?.toLowerCase().includes(query);
        const matchDescAr = product.descriptionAr?.toLowerCase().includes(query);
        if (!matchName && !matchNameAr && !matchDesc && !matchDescAr) return false;
      }
      // Price filter
      const price = Number(product.price);
      if (price < priceRange[0] || price > priceRange[1]) return false;
      return true;
    });
  }, [products, searchQuery, priceRange]);

  const cartCount = cart?.length || 0;
  const hasActiveFilters = searchQuery.trim() || priceRange[0] > 0 || priceRange[1] < maxPriceLimit;

  if (orgsLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المتجر</h1>
          <p className="text-muted-foreground">تسوق منتجات وخدمات الحضانة</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/parent/store/cart")} className="relative">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-2 -left-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Button>
      </div>

      {/* Nursery Selection */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm font-medium mb-2 block">اختر الحضانة</Label>
          {!organizations?.length ? (
            <div className="text-center py-8">
              <StoreIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">لا توجد حضانات لديها متجر حالياً</p>
            </div>
          ) : (
            <Select
              value={selectedOrgId?.toString() || ""}
              onValueChange={(v) => { setSelectedOrgId(Number(v)); setSelectedCategoryId(null); setSearchQuery(""); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحضانة لتصفح منتجاتها" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={String(org.id)}>
                    <div className="flex items-center gap-2">
                      {org.logo && <img src={org.logo} alt="" className="w-5 h-5 rounded-full object-cover" />}
                      <span>{org.nameAr || org.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Search & Filters */}
      {selectedOrgId && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          {/* Price Filter */}
          {showFilters && (
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">فلترة حسب السعر</Label>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setPriceRange([0, maxPriceLimit]); setSearchQuery(""); }}
                      className="text-xs h-7"
                    >
                      إعادة تعيين
                    </Button>
                  )}
                </div>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={maxPriceLimit}
                    step={5}
                    value={priceRange}
                    onValueChange={(v) => setPriceRange(v as [number, number])}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{priceRange[0]} ر.س</span>
                  <span>{priceRange[1]} ر.س</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active filters indicator */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>عرض {filteredProducts.length} من {products?.length || 0} منتج</span>
            </div>
          )}
        </div>
      )}

      {/* Category Filter */}
      {selectedOrgId && categories && categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={selectedCategoryId === null ? "default" : "outline"}
            onClick={() => setSelectedCategoryId(null)}
          >
            الكل
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={selectedCategoryId === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCategoryId(cat.id)}
            >
              {cat.nameAr || cat.name}
            </Button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      {selectedOrgId && (
        productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
          </div>
        ) : !filteredProducts.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-medium">
                {hasActiveFilters ? "لا توجد نتائج" : "لا توجد منتجات"}
              </p>
              <p className="text-muted-foreground">
                {hasActiveFilters ? "جرب تغيير معايير البحث أو الفلترة" : "لم تضف هذه الحضانة منتجات بعد"}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => { setPriceRange([0, maxPriceLimit]); setSearchQuery(""); }}
                >
                  مسح الفلاتر
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden group hover:shadow-md transition-shadow">
                {product.imageUrl ? (
                  <div className="h-48 bg-muted overflow-hidden">
                    <img src={product.imageUrl} alt={product.nameAr} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                  </div>
                ) : (
                  <div className="h-48 bg-muted flex items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}
                <CardContent className="pt-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{product.nameAr}</h3>
                    {product.descriptionAr && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.descriptionAr}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-primary">{product.price} ر.س</span>
                      {product.compareAtPrice && (
                        <span className="text-sm text-muted-foreground line-through">{product.compareAtPrice} ر.س</span>
                      )}
                    </div>
                    <Badge variant="outline">{product.type === "product" ? "منتج" : "خدمة"}</Badge>
                  </div>
                  {product.type === "product" && product.stock !== -1 && product.stock === 0 && (
                    <p className="text-sm text-red-500 font-medium">نفذت الكمية</p>
                  )}
                  <Button
                    className="w-full"
                    disabled={addToCart.isPending || (product.type === "product" && product.stock !== -1 && product.stock === 0)}
                    onClick={() => addToCart.mutate({ productId: product.id, quantity: 1 })}
                  >
                    <ShoppingCart className="h-4 w-4 ml-2" />
                    {product.type === "product" && product.stock !== -1 && product.stock === 0 ? "نفذت الكمية" : "أضف للسلة"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* Orders link */}
      {selectedOrgId && (
        <div className="text-center pt-4">
          <Button variant="ghost" onClick={() => navigate("/parent/store/orders")}>
            <ShoppingBag className="h-4 w-4 ml-1" />
            عرض طلباتي السابقة
          </Button>
        </div>
      )}
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`text-sm font-medium ${className || ""}`}>{children}</label>;
}
