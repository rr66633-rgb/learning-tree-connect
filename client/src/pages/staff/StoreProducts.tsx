import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
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
import { fetchWithCsrf } from "@/lib/csrf";
import { uploadWithProgress, compressImage } from "@/lib/uploadWithProgress";

export default function StoreProducts() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
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
    onSuccess: () => { utils.store.adminGetProducts.invalidate(); toast.success(isAr ? "تم إضافة المنتج" : "Product added"); resetForm(); setOpenCreate(false); },
    onError: (e: any) => toast.error(e.message || (isAr ? "حدث خطأ" : "An error occurred")) });

  const updateProduct = trpc.store.adminUpdateProduct.useMutation({
    onSuccess: () => { utils.store.adminGetProducts.invalidate(); toast.success(isAr ? "تم تحديث المنتج" : "Product updated"); setOpenEdit(false); },
    onError: (e: any) => toast.error(e.message || (isAr ? "حدث خطأ" : "An error occurred")) });

  const deleteProduct = trpc.store.adminDeleteProduct.useMutation({
    onSuccess: () => { utils.store.adminGetProducts.invalidate(); toast.success(isAr ? "تم حذف المنتج" : "Product deleted"); },
    onError: (e: any) => toast.error(e.message || (isAr ? "حدث خطأ" : "An error occurred")) });

  const createCategory = trpc.store.adminCreateCategory.useMutation({
    onSuccess: () => { utils.store.adminGetCategories.invalidate(); toast.success(isAr ? "تم إضافة التصنيف" : "Category added"); setCatName(""); setCatNameAr(""); setOpenCategory(false); },
    onError: (e: any) => toast.error(e.message || (isAr ? "حدث خطأ" : "An error occurred")) });

  function resetForm() {
    setName(""); setNameAr(""); setDescription(""); setDescriptionAr(""); setPrice(""); setCompareAtPrice(""); setCategoryId(""); setType("product"); setImageUrl(""); setStock("");
  }

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', await compressImage(file));
      const { url } = await uploadWithProgress(apiUrl('/api/upload-photo'), formData);
      setImageUrl(url);
      toast.success(isAr ? "تم رفع الصورة" : "Photo uploaded");
    } catch {
      toast.error(isAr ? "فشل رفع الصورة" : "Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  function handleCreate() {
    if (!name || !nameAr || !price) { toast.error(isAr ? "يرجى تعبئة الاسم والسعر" : "Please fill name and price"); return; }
    createProduct.mutate({
      name, nameAr, description, descriptionAr, price,
      compareAtPrice: compareAtPrice || undefined,
      categoryId: categoryId ? parseInt(categoryId) : undefined,
      type, imageUrl: imageUrl || undefined,
      stock: stock ? parseInt(stock) : 0 });
  }

  function handleUpdate() {
    if (!selectedProduct || !name || !price) return;
    updateProduct.mutate({
      id: selectedProduct.id, name, nameAr, description, descriptionAr, price,
      compareAtPrice: compareAtPrice || undefined,
      categoryId: categoryId ? parseInt(categoryId) : null,
      type, imageUrl: imageUrl || undefined,
      stock: stock ? parseInt(stock) : 0 });
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
          <h1 className="text-2xl font-bold">{isAr ? "المتجر" : "Store"}</h1>
          <p className="text-muted-foreground">{isAr ? "إدارة المنتجات والخدمات" : "Product & Service Management"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenCategory(true)}>
            <Plus className="h-4 w-4 ml-1" /> {isAr ? "تصنيف جديد" : "New Category"}
          </Button>
          <Button onClick={() => { resetForm(); setOpenCreate(true); }}>
            <Plus className="h-4 w-4 ml-1" /> {isAr ? "منتج جديد" : "New Product"}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="products"><Package className="h-4 w-4 ml-1" /> {isAr ? "المنتجات (" : "Products ("}{products?.length || 0})</TabsTrigger>
          <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 ml-1" />{isAr ? " الطلبات" : "Orders"}</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          {!products?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{isAr ? "لا توجد منتجات" : "No products"}</p>
                <p className="text-muted-foreground mb-4">{isAr ? "أضف منتجات أو خدمات لعرضها لأولياء الأمور" : "Add products or services to display to parents"}</p>
                <Button onClick={() => { resetForm(); setOpenCreate(true); }}>
                  <Plus className="h-4 w-4 ml-1" /> {isAr ? "إضافة منتج" : "Add Product"}
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
                        {product.isActive ? (isAr ? "نشط" : "Active") : (isAr ? "معطل" : "Disabled")}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">{product.price} {isAr ? "ر.س" : "SAR"}</span>
                        {product.compareAtPrice && (
                          <span className="text-sm text-muted-foreground line-through">{product.compareAtPrice} {isAr ? "ر.س" : "SAR"}</span>
                        )}
                      </div>
                      <Badge variant="outline">{product.type === "product" ? isAr ? "منتج" : "Product" : isAr ? "خدمة" : "Service"}</Badge>
                    </div>
                    {product.type === "product" && product.stock !== -1 && (
                      <p className="text-sm text-muted-foreground mt-1">{isAr ? "المخزون:" : "Inventory:"} {product.stock}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(product)}>
                        <Pencil className="h-3 w-3 ml-1" /> {isAr ? "تعديل" : "Edit"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => { if (confirm(isAr ? "هل أنت متأكد من حذف هذا المنتج؟" : "Are you sure you want to delete this product?")) deleteProduct.mutate({ id: product.id }); }}>
                        <Trash2 className="h-3 w-3 ml-1" /> {isAr ? "حذف" : "Delete"}
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
          <DialogHeader><DialogTitle>{isAr ? "إضافة منتج جديد" : "Add New Product"}</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => setOpenCreate(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleCreate} disabled={createProduct.isPending}>
              {createProduct.isPending ? "جاري الإضافة..." : (isAr ? "إضافة" : "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isAr ? "تعديل المنتج" : "Edit Product"}</DialogTitle></DialogHeader>
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
            <Button variant="outline" onClick={() => setOpenEdit(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={handleUpdate} disabled={updateProduct.isPending}>
              {updateProduct.isPending ? "جاري التحديث..." : (isAr ? "تحديث" : "Update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={openCategory} onOpenChange={setOpenCategory}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{isAr ? "إضافة تصنيف جديد" : "Add New Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{isAr ? "اسم التصنيف (إنجليزي)" : "Category Name (English)"}</Label><Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Category name" /></div>
            <div><Label>{isAr ? "اسم التصنيف (عربي)" : "Category Name (Arabic)"}</Label><Input value={catNameAr} onChange={e => setCatNameAr(e.target.value)} placeholder="مثال: ملابس" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCategory(false)}>{isAr ? "إلغاء" : "Cancel"}</Button>
            <Button onClick={() => { if (!catName || !catNameAr) { toast.error(isAr ? "أدخل اسم التصنيف" : "Enter category name"); return; } createCategory.mutate({ name: catName, nameAr: catNameAr }); }} disabled={createCategory.isPending}>
              {isAr ? "إضافة" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({ name, setName, nameAr, setNameAr, description, setDescription, descriptionAr, setDescriptionAr, price, setPrice, compareAtPrice, setCompareAtPrice, categoryId, setCategoryId, type, setType, imageUrl, setImageUrl, stock, setStock, categories, uploading, onImageUpload }: any) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (
    <div className="space-y-4">
      <div><Label>{isAr ? "اسم المنتج (إنجليزي)" : "Product Name (English)"}</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Product name" /></div>
      <div><Label>اسم المنتج (عربي) *</Label><Input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder={isAr ? "اسم المنتج" : "Product Name"} /></div>
      <div><Label>{isAr ? "الوصف (إنجليزي)" : "Description (English)"}</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows={2} /></div>
      <div><Label>الوصف (عربي)</Label><Textarea value={descriptionAr} onChange={e => setDescriptionAr(e.target.value)} placeholder={isAr ? "وصف المنتج" : "Product Description"} rows={2} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>السعر (ر.س) *</Label><Input value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" /></div>
        <div><Label>{isAr ? "السعر قبل الخصم" : "Price Before Discount"}</Label><Input value={compareAtPrice} onChange={e => setCompareAtPrice(e.target.value)} placeholder="0.00" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>{isAr ? "النوع" : "Type"}</Label>
          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="product">{isAr ? "منتج" : "Product"}</SelectItem>
              <SelectItem value="service">{isAr ? "خدمة" : "Service"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{isAr ? "التصنيف" : "Category"}</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder={isAr ? "اختر تصنيف" : "Select Classification"} /></SelectTrigger>
            <SelectContent>
              {categories.map((cat: any) => <SelectItem key={cat.id} value={String(cat.id)}>{cat.nameAr}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      {type === "product" && (
        <div><Label>{isAr ? "المخزون" : "Inventory"}</Label><Input type="number" value={stock} onChange={e => setStock(e.target.value)} placeholder="0 = غير محدود" min="0" /></div>
      )}
      <div>
        <Label>{isAr ? "صورة المنتج" : "Product Image"}</Label>
        {imageUrl && <img src={imageUrl} alt="preview" className="w-20 h-20 object-contain rounded border mb-2" />}
        <Input type="file" accept="image/*" disabled={uploading} onChange={e => { const f = e.target.files?.[0]; if (f) onImageUpload(f); }} />
        {uploading && <p className="text-sm text-muted-foreground">{isAr ? "جاري رفع الصورة..." : "Uploading image..."}</p>}
      </div>
    </div>
  );
}

function StoreOrdersTab() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: orders, isLoading } = trpc.store.adminGetOrders.useQuery();
  const utils = trpc.useUtils();
  const updateStatus = trpc.store.adminUpdateOrderStatus.useMutation({
    onSuccess: () => { utils.store.adminGetOrders.invalidate(); toast.success(isAr ? "تم تحديث حالة الطلب" : "Order status updated"); },
    onError: (e: any) => toast.error(e.message || (isAr ? "حدث خطأ" : "An error occurred")) });

  const { t } = useTranslation();
  const statusLabels: Record<string, string> = { pending: t("statuses.new"), paid: t("statuses.paid"), processing: t("statuses.processing"), ready: t("statuses.ready"), completed: t("statuses.completed"), cancelled: t("statuses.cancelled"), refunded: t("statuses.refunded") };
  const statusColors: Record<string, string> = { pending: "bg-amber-100 text-amber-700", paid: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700", ready: "bg-green-100 text-green-700", completed: "bg-gray-100 text-gray-700", cancelled: "bg-red-100 text-red-700", refunded: "bg-orange-100 text-orange-700" };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!orders?.length) return (
    <Card><CardContent className="py-12 text-center">
      <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <p className="text-lg font-medium">{isAr ? "لا توجد طلبات" : "No orders"}</p>
      <p className="text-muted-foreground">{isAr ? "ستظهر الطلبات هنا عندما يشتري أولياء الأمور من متجرك" : "Orders will appear here when parents purchase from your store"}</p>
    </CardContent></Card>
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isAr ? "رقم الطلب" : "Order Number"}</TableHead>
            <TableHead>{isAr ? "المبلغ" : "Amount"}</TableHead>
            <TableHead>{isAr ? "الحالة" : "Status"}</TableHead>
            <TableHead>{isAr ? "التاريخ" : "Date"}</TableHead>
            <TableHead>{isAr ? "الإجراء" : "Action"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order: any) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-sm">#{order.orderNumber}</TableCell>
              <TableCell>{order.total} {isAr ? "ر.س" : "SAR"}</TableCell>
              <TableCell><Badge className={statusColors[order.status] || ""}>{statusLabels[order.status] || order.status}</Badge></TableCell>
              <TableCell>{new Date(order.createdAt).toLocaleDateString("ar-SA")}</TableCell>
              <TableCell>
                {order.status === "paid" && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ orderId: order.id, status: "processing" })}>{isAr ? "تجهيز" : "Preparation"}</Button>
                )}
                {order.status === "processing" && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ orderId: order.id, status: "ready" })}>{isAr ? "جاهز" : "Ready"}</Button>
                )}
                {order.status === "ready" && (
                  <Button size="sm" onClick={() => updateStatus.mutate({ orderId: order.id, status: "completed" })}>{isAr ? "تم التسليم" : "Delivered"}</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
