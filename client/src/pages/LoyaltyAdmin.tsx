import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Star, Users, Settings, CreditCard, Handshake, Plus, Trash2, Edit, Award, TrendingUp, Coins } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function LoyaltyAdmin() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
          <Award className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">برنامج الولاء</h1>
          <p className="text-sm text-muted-foreground">إدارة النقاط والمكافآت والبطاقات والشركاء</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview"><TrendingUp className="h-4 w-4 ml-1" />نظرة عامة</TabsTrigger>
          <TabsTrigger value="rewards"><Gift className="h-4 w-4 ml-1" />المكافآت</TabsTrigger>
          <TabsTrigger value="partners"><Handshake className="h-4 w-4 ml-1" />الشركاء</TabsTrigger>
          <TabsTrigger value="cards"><CreditCard className="h-4 w-4 ml-1" />البطاقات</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 ml-1" />الإعدادات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="rewards"><RewardsTab /></TabsContent>
        <TabsContent value="partners"><PartnersTab /></TabsContent>
        <TabsContent value="cards"><CardsTab /></TabsContent>
        <TabsContent value="settings"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const { data: allPoints } = trpc.loyalty.allParentsPoints.useQuery();
  const { data: allRedemptions } = trpc.loyalty.allRedemptions.useQuery();
  const { data: rewards } = trpc.loyalty.rewards.useQuery();

  const totalPoints = allPoints?.reduce((sum: number, p: any) => sum + (p.points || 0), 0) ?? 0;
  const totalRedemptions = allRedemptions?.length ?? 0;
  const pendingRedemptions = allRedemptions?.filter((r: any) => r.status === 'pending').length ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي النقاط الموزعة</p>
                <p className="text-2xl font-bold text-amber-700">{totalPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">أولياء أمور مشتركين</p>
                <p className="text-2xl font-bold">{allPoints?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">عمليات الاستبدال</p>
                <p className="text-2xl font-bold">{totalRedemptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">بانتظار الموافقة</p>
                <p className="text-2xl font-bold text-orange-600">{pendingRedemptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Parents Points Table */}
      <Card>
        <CardHeader><CardTitle>أرصدة أولياء الأمور</CardTitle></CardHeader>
        <CardContent>
          {allPoints && allPoints.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>البريد الإلكتروني</TableHead>
                  <TableHead>النقاط</TableHead>
                  <TableHead>إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPoints.map((p: any) => (
                  <TableRow key={p.userId}>
                    <TableCell className="font-medium">{p.userNameAr || p.userName}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        <Star className="h-3 w-3 ml-1" />{p.points}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AddPointsDialog userId={p.userId} userName={p.userNameAr || p.userName} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا يوجد أولياء أمور مسجلين في البرنامج بعد</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Redemptions */}
      {pendingRedemptions > 0 && (
        <Card className="border-orange-200">
          <CardHeader><CardTitle>طلبات استبدال بانتظار الموافقة</CardTitle></CardHeader>
          <CardContent>
            <RedemptionsTable redemptions={allRedemptions?.filter((r: any) => r.status === 'pending') ?? []} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AddPointsDialog({ userId, userName }: { userId: number; userName: string }) {
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const utils = trpc.useUtils();

  const addPoints = trpc.loyalty.addPoints.useMutation({
    onSuccess: () => {
      utils.loyalty.allParentsPoints.invalidate();
      toast.success("تم إضافة النقاط بنجاح");
      setOpen(false);
      setPoints("");
      setDescription("");
    },
    onError: () => toast.error("حدث خطأ"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="h-3 w-3 ml-1" />إضافة نقاط</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>إضافة نقاط لـ {userName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>عدد النقاط</Label><Input type="number" value={points} onChange={e => setPoints(e.target.value)} placeholder="50" /></div>
          <div><Label>السبب</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="مكافأة حضور منتظم" /></div>
          <Button className="w-full" onClick={() => addPoints.mutate({ userId, points: Number(points), description })} disabled={!points || !description || addPoints.isPending}>
            {addPoints.isPending ? "جارٍ الإضافة..." : "إضافة النقاط"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RedemptionsTable({ redemptions }: { redemptions: any[] }) {
  const utils = trpc.useUtils();
  const updateStatus = trpc.loyalty.updateRedemptionStatus.useMutation({
    onSuccess: () => {
      utils.loyalty.allRedemptions.invalidate();
      toast.success("تم تحديث الحالة");
    },
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ولي الأمر</TableHead>
          <TableHead>المكافأة</TableHead>
          <TableHead>النقاط</TableHead>
          <TableHead>التاريخ</TableHead>
          <TableHead>الحالة</TableHead>
          <TableHead>إجراء</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {redemptions.map((r: any) => (
          <TableRow key={r.id}>
            <TableCell>{r.userNameAr || r.userName}</TableCell>
            <TableCell>{r.rewardNameAr || r.rewardName}</TableCell>
            <TableCell>{r.pointsSpent}</TableCell>
            <TableCell>{new Date(r.createdAt).toLocaleDateString('ar-SA')}</TableCell>
            <TableCell>
              <Badge variant={r.status === 'pending' ? 'secondary' : r.status === 'fulfilled' ? 'default' : 'destructive'}>
                {r.status === 'pending' ? 'بانتظار' : r.status === 'approved' ? 'موافق' : r.status === 'fulfilled' ? 'مكتمل' : 'مرفوض'}
              </Badge>
            </TableCell>
            <TableCell className="flex gap-1">
              {r.status === 'pending' && (
                <>
                  <Button size="sm" variant="default" onClick={() => updateStatus.mutate({ id: r.id, status: 'approved' })}>موافقة</Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: r.id, status: 'rejected' })}>رفض</Button>
                </>
              )}
              {r.status === 'approved' && (
                <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: 'fulfilled' })}>تم التسليم</Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RewardsTab() {
  const { data: rewards, isLoading } = trpc.loyalty.rewards.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", nameAr: "", description: "", descriptionAr: "", pointsCost: "", category: "custom", maxRedemptions: "" });

  const createReward = trpc.loyalty.createReward.useMutation({
    onSuccess: () => { utils.loyalty.rewards.invalidate(); toast.success("تم إضافة المكافأة"); setOpen(false); setForm({ name: "", nameAr: "", description: "", descriptionAr: "", pointsCost: "", category: "custom", maxRedemptions: "" }); },
    onError: () => toast.error("حدث خطأ"),
  });

  const deleteReward = trpc.loyalty.deleteReward.useMutation({
    onSuccess: () => { utils.loyalty.rewards.invalidate(); toast.success("تم حذف المكافأة"); },
  });

  const categoryLabels: Record<string, string> = {
    discount: "خصم",
    free_day: "يوم مجاني",
    gift: "هدية",
    upgrade: "ترقية",
    custom: "أخرى",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">كتالوج المكافآت</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />مكافأة جديدة</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>إضافة مكافأة جديدة</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>اسم المكافأة (عربي)</Label><Input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="خصم 10% على الرسوم" /></div>
              <div><Label>اسم المكافأة (إنجليزي)</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="10% Tuition Discount" /></div>
              <div><Label>الوصف</Label><Textarea value={form.descriptionAr} onChange={e => setForm(f => ({ ...f, descriptionAr: e.target.value }))} placeholder="وصف تفصيلي للمكافأة" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>النقاط المطلوبة</Label><Input type="number" value={form.pointsCost} onChange={e => setForm(f => ({ ...f, pointsCost: e.target.value }))} /></div>
                <div>
                  <Label>التصنيف</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">خصم</SelectItem>
                      <SelectItem value="free_day">يوم مجاني</SelectItem>
                      <SelectItem value="gift">هدية</SelectItem>
                      <SelectItem value="upgrade">ترقية</SelectItem>
                      <SelectItem value="custom">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>الحد الأقصى للاستبدال (اختياري)</Label><Input type="number" value={form.maxRedemptions} onChange={e => setForm(f => ({ ...f, maxRedemptions: e.target.value }))} placeholder="بدون حد" /></div>
              <Button className="w-full" onClick={() => createReward.mutate({ name: form.name || form.nameAr, nameAr: form.nameAr, description: form.description, descriptionAr: form.descriptionAr, pointsCost: Number(form.pointsCost), category: form.category as any, maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null })} disabled={!form.nameAr || !form.pointsCost || createReward.isPending}>
                {createReward.isPending ? "جارٍ الإضافة..." : "إضافة المكافأة"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards?.map((reward: any) => (
          <Card key={reward.id} className="relative group">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{reward.nameAr || reward.name}</h3>
                  <Badge variant="outline" className="mt-1">{categoryLabels[reward.category] || "أخرى"}</Badge>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  <Star className="h-3 w-3 ml-1" />{reward.pointsCost}
                </Badge>
              </div>
              {reward.descriptionAr && <p className="text-sm text-muted-foreground">{reward.descriptionAr}</p>}
              {reward.maxRedemptions && (
                <p className="text-xs text-muted-foreground">الاستبدال: {reward.currentRedemptions ?? 0}/{reward.maxRedemptions}</p>
              )}
              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteReward.mutate({ id: reward.id })}>
                <Trash2 className="h-4 w-4 ml-1" />حذف
              </Button>
            </CardContent>
          </Card>
        ))}
        {(!rewards || rewards.length === 0) && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد مكافآت بعد. أضف مكافأة جديدة للبدء.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PartnersTab() {
  const { data: partners } = trpc.loyalty.allPartners.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", nameAr: "", discountDescriptionAr: "", discountPercentage: "", contactInfo: "", website: "", logoUrl: "" });

  const createPartner = trpc.loyalty.createPartner.useMutation({
    onSuccess: () => { utils.loyalty.allPartners.invalidate(); toast.success("تم إضافة الشريك"); setOpen(false); setForm({ name: "", nameAr: "", discountDescriptionAr: "", discountPercentage: "", contactInfo: "", website: "", logoUrl: "" }); },
    onError: () => toast.error("حدث خطأ"),
  });

  const deletePartner = trpc.loyalty.deletePartner.useMutation({
    onSuccess: () => { utils.loyalty.allPartners.invalidate(); toast.success("تم حذف الشريك"); },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">شركاء الخصومات</h2>
          <p className="text-sm text-muted-foreground">أضف الشركات والمتاجر التي تقدم خصومات لحاملي البطاقة</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />شريك جديد</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>إضافة شريك جديد</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>اسم الشريك (عربي)</Label><Input value={form.nameAr} onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="مثال: مكتبة جرير" /></div>
              <div><Label>اسم الشريك (إنجليزي)</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jarir Bookstore" /></div>
              <div><Label>وصف الخصم</Label><Textarea value={form.discountDescriptionAr} onChange={e => setForm(f => ({ ...f, discountDescriptionAr: e.target.value }))} placeholder="خصم 15% على جميع المستلزمات المدرسية" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>نسبة الخصم %</Label><Input type="number" value={form.discountPercentage} onChange={e => setForm(f => ({ ...f, discountPercentage: e.target.value }))} placeholder="15" /></div>
                <div><Label>رقم التواصل</Label><Input value={form.contactInfo} onChange={e => setForm(f => ({ ...f, contactInfo: e.target.value }))} placeholder="+966..." /></div>
              </div>
              <div><Label>رابط اللوقو (اختياري)</Label><Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." /></div>
              <Button className="w-full" onClick={() => createPartner.mutate({ name: form.name || form.nameAr, nameAr: form.nameAr, discountDescriptionAr: form.discountDescriptionAr, discountPercentage: Number(form.discountPercentage) || 0, contactInfo: form.contactInfo, logoUrl: form.logoUrl || undefined })} disabled={!form.nameAr || createPartner.isPending}>
                {createPartner.isPending ? "جارٍ الإضافة..." : "إضافة الشريك"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners?.map((partner: any) => (
          <Card key={partner.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                {partner.logoUrl ? (
                  <img src={partner.logoUrl} alt={partner.nameAr} className="h-12 w-12 rounded-lg object-contain border" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                    {partner.nameAr?.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold">{partner.nameAr}</h3>
                  {partner.discountPercentage > 0 && (
                    <Badge className="bg-green-100 text-green-700">خصم {partner.discountPercentage}%</Badge>
                  )}
                </div>
              </div>
              {partner.discountDescriptionAr && <p className="text-sm text-muted-foreground">{partner.discountDescriptionAr}</p>}
              <div className="flex justify-between items-center">
                <Badge variant={partner.isActive ? "default" : "secondary"}>{partner.isActive ? "نشط" : "معطل"}</Badge>
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deletePartner.mutate({ id: partner.id })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!partners || partners.length === 0) && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا يوجد شركاء بعد. أضف شركاء لتقديم خصومات لأولياء الأمور.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CardsTab() {
  const { data: cards } = trpc.loyalty.allCards.useQuery();
  const { data: templates } = trpc.loyalty.cardTemplates.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">البطاقات المصدرة</h2>
          <p className="text-sm text-muted-foreground">جميع بطاقات الولاء المصدرة لأولياء الأمور</p>
        </div>
      </div>

      {/* Templates Preview */}
      <Card>
        <CardHeader><CardTitle>قوالب البطاقات المتاحة</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {templates?.map((t: any) => (
              <div key={t.id} className="min-w-[200px] h-[120px] rounded-xl p-4 flex flex-col justify-between text-sm" style={{ background: t.backgroundPattern === 'gradient' ? `linear-gradient(135deg, ${t.backgroundColor}, ${t.accentColor})` : t.backgroundColor, color: t.textColor }}>
                <div className="font-bold">نشأة</div>
                <div className="text-xs opacity-80">{t.nameAr}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cards Table */}
      <Card>
        <CardHeader><CardTitle>البطاقات ({cards?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {cards && cards.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ولي الأمر</TableHead>
                  <TableHead>رقم البطاقة</TableHead>
                  <TableHead>القالب</TableHead>
                  <TableHead>تاريخ الانتهاء</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card: any) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">{card.userNameAr || card.userName}</TableCell>
                    <TableCell className="font-mono text-sm">{card.cardNumber}</TableCell>
                    <TableCell>{card.templateName}</TableCell>
                    <TableCell>{new Date(card.expiryDate).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <Badge variant={card.isActive && new Date(card.expiryDate) > new Date() ? "default" : "destructive"}>
                        {card.isActive && new Date(card.expiryDate) > new Date() ? "نشطة" : "منتهية"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لم يتم إصدار بطاقات بعد. سيتم إصدار البطاقات تلقائياً عند طلب أولياء الأمور.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab() {
  const { data: settings, isLoading } = trpc.loyalty.getSettings.useQuery();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<any>(null);

  const updateSettings = trpc.loyalty.updateSettings.useMutation({
    onSuccess: () => { utils.loyalty.getSettings.invalidate(); toast.success("تم حفظ الإعدادات"); },
    onError: () => toast.error("حدث خطأ"),
  });

  if (isLoading) return <div className="text-center py-8">جارٍ التحميل...</div>;

  const s = form ?? settings ?? {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>إعدادات كسب النقاط</CardTitle>
          <p className="text-sm text-muted-foreground">حدد عدد النقاط المكتسبة لكل نشاط</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>نقاط الإحالة (تسجيل طفل جديد)</Label>
              <Input type="number" value={s.pointsPerReferral ?? 100} onChange={e => setForm({ ...s, pointsPerReferral: Number(e.target.value) })} />
            </div>
            <div>
              <Label>نقاط الدفع في الوقت</Label>
              <Input type="number" value={s.pointsPerOnTimePayment ?? 20} onChange={e => setForm({ ...s, pointsPerOnTimePayment: Number(e.target.value) })} />
            </div>
            <div>
              <Label>نقاط الحضور المنتظم (أسبوعياً)</Label>
              <Input type="number" value={s.pointsPerPerfectAttendanceWeek ?? 10} onChange={e => setForm({ ...s, pointsPerPerfectAttendanceWeek: Number(e.target.value) })} />
            </div>
            <div>
              <Label>نقاط المشاركة في الفعاليات</Label>
              <Input type="number" value={s.pointsPerEventParticipation ?? 15} onChange={e => setForm({ ...s, pointsPerEventParticipation: Number(e.target.value) })} />
            </div>
            <div>
              <Label>نقاط تعبئة الاستبيان</Label>
              <Input type="number" value={s.pointsPerSurveyCompletion ?? 5} onChange={e => setForm({ ...s, pointsPerSurveyCompletion: Number(e.target.value) })} />
            </div>
            <div>
              <Label>نقاط الاستلام المبكر</Label>
              <Input type="number" value={s.pointsPerEarlyPickup ?? 5} onChange={e => setForm({ ...s, pointsPerEarlyPickup: Number(e.target.value) })} />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">مكافآت إضافية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>مكافأة الترحيب (تسجيل جديد)</Label>
                <Input type="number" value={s.welcomeBonus ?? 50} onChange={e => setForm({ ...s, welcomeBonus: Number(e.target.value) })} />
              </div>
              <div>
                <Label>مكافأة عيد الميلاد</Label>
                <Input type="number" value={s.birthdayBonus ?? 25} onChange={e => setForm({ ...s, birthdayBonus: Number(e.target.value) })} />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div>
              <Label>تفعيل البرنامج</Label>
              <p className="text-sm text-muted-foreground">تفعيل أو إيقاف برنامج الولاء</p>
            </div>
            <Switch checked={s.isActive ?? true} onCheckedChange={v => setForm({ ...s, isActive: v })} />
          </div>

          <Button className="w-full" onClick={() => updateSettings.mutate(form ?? s)} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
