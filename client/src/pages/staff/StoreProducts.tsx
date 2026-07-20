import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Package, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { apiUrl } from "@/lib/apiBase";

export default function StoreProducts() {
  const { data: products, isLoading } = trpc.store.adminGetProducts.useQuery();
  const { data: categories } = trpc.store.adminGetCategories.useQuery();
  const utils = trpc.useUtils();

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [openCategory, setOpenCategory] = useState(false);
  const [tab, setTab] = useState("products");

  // Form state
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState<"product" | "service">("product");
  const [imageUrl, setImageUrl] = useState("");
  const [stock, setStock] = useState("");
  const [uploading, setUploading] = useState(false);

  // Category form
  const [catName, setCatName] = useState("");
  const [catNameAr, setCatNameAr] = useState("");

  const createProduct = trpc.store.adminCreateProduct.useMutation({
    onSuccess: () => { utils.store.adminGetProducts.invalidate(); toast.success("تم إضافة المنتج"); resetForm(); setOpenCreate(false); },
    onError: (e: any) => toast.error(e.message || "حدث خطأ"),
  });

  const updateProduct = trpc.store.adminUpdateProduct.useMutation({
    onSuccess: () => { utils.store.adminGetProducts.invalidate(); toast.success("تم تحديث المنتج"); setOpenEdit(false); },
    onError: (e: any) => toast.error(e.message || "حدث خطأ"),
  });

  const deleteProduct = trpc.store.adminDeleteProduct.useMutation({
    onSuccess: () => { utils.store.adminGetProducts.invalidate(); toast.success("تم حذف المنتج"); },
    onError: (e: any) => toast.error(e.message || "حدث خطأ"),
  });

  const createCategory = trpc.store.adminCreateCategory.useMutation({
    onSuccess: () => { utils.store.adminGetCategories.invalidate(); toast.success("تم إضافة التصنيف"); setCatName(""); setCatNameAr(""); setOpenCategory(false); },
    onError: (e: any) => toast.error(e.message || "حدث خطأ"),
  });

  function resetForm() {
    setName(""); setNameAr(""); setDescription(""); setDescriptionAr(""); setPrice(""); setCompareAtPrice(""); setCategoryId(""); setType("product"); setImageUrl(""); setStock("");
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(apiUrl('/api/upload-photo'), { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("فشل رفع الصورة");
      const { url } = await res.json();
      setImageUrl(url);
      toast.success("تم رفع الصورة");
    } catch {
      toast.error("فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  function handleCreate() {
    if (!name || !nameAr || !price) { toast.error("يرجى تعبئة الاسم والسعر"); return; }
    createProduct.mutate({
      name, nameAr, description, descriptionAr, price,
      compareAtPrice: compareAtPrice || undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      type, imageUrl: imageUrl || undefined,
      stock: stock ? parseInt(stock) : 0,
    });
  }

  function handleUpdate() {
    if (!selectedProduct || !name || !price) return;
    updateProduct.mutate({
      id: selectedProduct.id, name, nameAr, description, descriptionAr, price,
      compareAtPrice: compareAtPrice || undefined,
      categoryId: categoryId ? parseInt(categoryId) : null,
      type, imageUrl: imageUrl || undefined,
      stock: stock ? parseInt(stock) : 0,
    });
  }

  function openEditDialog(product: any) {
    setSelectedProduct(product);
    setName(product.name || "");
    setNameAr(product.nameAr || "");
    setDescription(product.description || "");
    setDescriptionAr(product.descriptionAr || "");
    setPrice(product.price?.toString() || "");
    setCompareAtPrice(product.compareAtPrice?.toString() || "");
    setCategoryId(product.categoryId?.toString() || "");
    setType(product.type || "product");
    setImageUrl(product.imageUrl || "");
    setStock(product.stock?.toString() || "");
    setOpenEdit(true);
  }

  if (isLoading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المتجر</h1>
          <p className="text-muted-foreground">إدارة المنتجات والخدمات</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenCategory(true)}>
            <Plus className="h-4 w-4 ml-1" /> تصنيف جديد
          </Button>
          <Button onClick={() => { resetForm(); setOpenCreate(true); }}>
            <Plus className="h-4 w-4 ml-1" /> منتج جديد
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="products"><Package className="h-4 w-4 ml-1" /> المنتجات ({products?.length || 0})</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 ml-1" /> الطلبات</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          {!products?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">لا توجد منتجات</p>
                <p className="text-muted-foreground mb-4">أضف منتجات أو خدمات لعرضها لأولياء الأمور</p>
                <Button onClick={() => { resetForm(); setOpenCreate(true); }}>
                  <Plus className="h-4 w-4 ml-1" /> إضافة منتج
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product: any) => (
                <Card key={product.id} className="overflow-hidden">
                  {product.imageUrl && (
                    <div className="h-40 bg-muted">
                      <img src={product.imageUrl} alt={product.nameAr} className="w-full h-full object-contain" />
                    </div>
                  )}
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{product.nameAr}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{product.descriptionAr || product.description}</p>
                      </div>
                      <Badge variant={product.isActive ? "default" : "secondary"}>
                        {product.isActive ? "نشط" : "معطل"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">{product.price} ر.س</span>
                        {product.compareAtPrice && (
                          <span className="text-sm text-muted-foreground line-through">{product.compareAtPrice} ر.س</span>
                        )}
                      </div>
                      <Badge variant="outline">{product.type === "product" ? "منتج" : "خدمة"}</Badge>
                    </div>
                    {product.type === "product" && product.stock !== -1 && (
                      <p className="text-sm text-muted-foreground mt-1">المخزون: {product.stock}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(product)}>
                        <Pencil className="h-3 w-3 ml-1" /> تعديل
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) deleteProduct.mutate({ id: product.id }); }}>
                        <Trash2 className="h-3 w-3 ml-1" /> حذف
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          <StoreOrdersTab />
        </TabsContent>
      </Tabs>

      {/* Create Product Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إضافة منتج جديد</DialogTitle></DialogHeader>
          <ProductForm
            name={name} setName={setName} nameAr={nameAr} setNameAr={setNameAr}
            description={description} setDescription={setDescription}
            descriptionAr={descriptionAr} setDescriptionAr={setDescriptionAr}
            price={price} setPrice={setPrice} compareAtPrice={compareAtPrice} setCompareAtPrice={setCompareAtPrice}
            categoryId={categoryId} setCategoryId={setCategoryId}
            type={type} setType={setType} imageUrl={imageUrl} setImageUrl={setImageUrl}
            stock={stock} setStock={setStock} categories={categories || []}
            uploading={uploading} onImageUpload={handleImageUpload}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={createProduct.isPending}>
              {createProduct.isPending ? "جاري الإضافة..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>تعديل المنتج</DialogTitle></DialogHeader>
          <ProductForm
            name={name} setName={setName} nameAr={nameAr} setNameAr={setNameAr}
            description={description} setDescription={setDescription}
            descriptionAr={descriptionAr} setDescriptionAr={setDescriptionAr}
            price={price} setPrice={setPrice} compareAtPrice={compareAtPrice} setCompareAtPrice={setCompareAtPrice}
            categoryId={categoryId} setCategoryId={setCategoryId}
            type={type} setType={setType} imageUrl={imageUrl} setImageUrl={setImageUrl}
            stock={stock} setStock={setStock} categories={categories || []}
            uploading={uploading} onImageUpload={handleImageUpload}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>إلغاء</Button>
            <Button onClick={handleUpdate} disabled={updateProduct.isPending}>
              {updateProduct.isPending ? "جاري التحديث..." : "تحديث"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={openCategory} onOpenChange={setOpenCategory}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>إضافة تصنيف جديد</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>اسم التصنيف (إنجليزي)</Label><Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" /></div>
            <div><Label>اسم التصنيف (عربي)</Label><Input value={catNameAr} onChange={e => setCatNameAr(e.target.value)} placeholder="مثال: ملابس" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCategory(false)}>إلغاء</Button>
            <Button onClick={() => { if (!catName || !catNameAr) { toast.error("أدخل اسم التصنيف"); return; } createCategory.mutate({ name: catName, nameAr: catNameAr }); }} disabled={createCategory.isPending}>
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({ name, setName, nameAr, setNameAr, description, setDescription, descriptionAr, setDescriptionAr, price, setPrice, compareAtPrice, setCompareAtPrice, categoryId, setCategoryId, type, setType, imageUrl, setImageUrl, stock, setStock, categories, uploading, onImageUpload }: any) {
  return (
    <div className="space-y-4">
      <div><Label>اسم المنتج (إنجليزي)</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Product name" /></div>
      <div><Label>اسم المنتج (عربي) *</Label><Input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="اسم المنتج" /></div>
      <div><Label>الوصف (إنجليزي)</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} /></div>
      <div><Label>الوصف (عربي)</Label><Textarea value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)} placeholder="وصف المنتج" rows={2} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>السعر (ر.س) *</Label><Input value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" /></div>
        <div><Label>السعر قبل الخصم</Label><Input value={compareAtPrice} onChange={e => setCompareAtPrice(e.target.value)} placeholder="0.00" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>النوع</Label>
          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="product">منتج</SelectItem>
              <SelectItem value="service">خدمة</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>التصنيف</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="اختر تصنيف" /></SelectTrigger>
            <SelectContent>
              {categories.map((cat: any) => <SelectItem key={cat.id} value={String(cat.id)}>{cat.nameAr}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {type === "product" && (
        <div><Label>المخزون</Label><Input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="0 = غير محدود" min="0" /></div>
      )}
      <div>
        <Label>صورة المنتج</Label>
        {imageUrl && <img src={imageUrl} alt="preview" className="w-20 h-20 object-contain rounded border mb-2" />}
        <Input type="file" accept="image/*" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload(f); }} />
        {uploading && <p className="text-sm text-muted-foreground">جاري رفع الصورة...</p>}
      </div>
    </div>
  );
}

function StoreOrdersTab() {
  const { data: orders, isLoading } = trpc.store.adminGetOrders.useQuery();
  const utils = trpc.useUtils();
  const updateStatus = trpc.store.adminUpdateOrderStatus.useMutation({
    onSuccess: () => { utils.store.adminGetOrders.invalidate(); toast.success("تم تحديث حالة الطلب"); },
    onError: (e: any) => toast.error(e.message || "حدث خطأ"),
  });

  const statusLabels: Record<string, string> = { pending: "جديد", paid: "مدفوع", processing: "قيد التجهيز", ready: "جاهز للاستلام", completed: "مكتمل", cancelled: "ملغي", refunded: "مسترجع" };
  const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700", ready: "bg-green-100 text-green-700", completed: "bg-gray-100 text-gray-700", cancelled: "bg-red-100 text-red-700", refunded: "bg-orange-100 text-orange-700" };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!orders?.length) return (
    <Card><CardContent className="py-12 text-center">
      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-lg font-medium">لا توجد طلبات</p>
      <p className="text-muted-foreground">ستظهر الطلبات هنا عندما يشتري أولياء الأمور من متجرك</p>
    </CardContent></Card>
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>رقم الطلب</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>الحالة</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>الإجراء</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order: any) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-sm">#{order.orderNumber}</TableCell>
              <TableCell>{order.total} ر.س</TableCell>
              <TableCell><Badge className={statusColors[order.status] || ""}>{statusLabels[order.status] || order.status}</Badge></TableCell>
              <TableCell>{new Date(order.createdAt).toLocaleDateString("ar-SA")}</TableCell>
              <TableCell>
                {order.status === "paid" && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ orderId: order.id, status: "processing" })}>تجهيز</Button>
                )}
                {order.status === "processing" && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ orderId: order.id, status: "ready" })}>جاهز</Button>
                )}
                {order.status === "ready" && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ orderId: order.id, status: "completed" })}>تم التسليم</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
