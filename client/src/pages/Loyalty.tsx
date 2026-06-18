import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Star, TrendingUp, Plus, History, Coins } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Loyalty() {
  const { data: rewards, isLoading } = trpc.loyalty.rewards.useQuery();
  const { data: balance } = trpc.loyalty.balance.useQuery();
  const { data: transactions } = trpc.loyalty.transactions.useQuery();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const createReward = trpc.loyalty.createReward.useMutation({
    onSuccess: () => { utils.loyalty.rewards.invalidate(); toast.success("تم إضافة المكافأة"); setOpen(false); },
    onError: () => toast.error("حدث خطأ"),
  });

  const redeemReward = trpc.loyalty.redeem.useMutation({
    onSuccess: () => {
      utils.loyalty.balance.invalidate();
      utils.loyalty.transactions.invalidate();
      toast.success("تم استبدال المكافأة بنجاح");
    },
    onError: (err) => toast.error(err.message || "رصيد النقاط غير كافٍ"),
  });

  const [form, setForm] = useState({ name: "", description: "", pointsCost: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createReward.mutate({ name: form.name, nameAr: form.name, description: form.description, pointsCost: Number(form.pointsCost) });
  };

  const currentPoints = balance?.points ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">برنامج الولاء</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 ml-2" />مكافأة جديدة</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة مكافأة جديدة</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><Label>اسم المكافأة</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="مثال: خصم 10% على الرسوم" /></div>
              <div><Label>الوصف</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف تفصيلي للمكافأة" /></div>
              <div><Label>النقاط المطلوبة</Label><Input type="number" value={form.pointsCost} onChange={e => setForm(f => ({ ...f, pointsCost: e.target.value }))} required /></div>
              <Button type="submit" className="w-full" disabled={createReward.isPending}>
                {createReward.isPending ? "جارٍ الإضافة..." : "إضافة المكافأة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-2 border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Coins className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">رصيد النقاط</p>
              <p className="text-2xl font-bold text-amber-700">{currentPoints}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Gift className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">المكافآت المتاحة</p>
              <p className="text-xl font-bold">{rewards?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">عمليات الاستبدال</p>
              <p className="text-xl font-bold">{transactions?.filter(t => t.type === 'redeemed').length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rewards"><Gift className="h-4 w-4 ml-2" />المكافآت</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 ml-2" />سجل العمليات</TabsTrigger>
        </TabsList>

        <TabsContent value="rewards">
          <Card>
            <CardHeader><CardTitle>المكافآت المتاحة للاستبدال</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rewards?.map(reward => (
                  <Card key={reward.id} className="border-2 hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{reward.name}</h3>
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                          <Star className="h-3 w-3 ml-1" />{reward.pointsCost} نقطة
                        </Badge>
                      </div>
                      {reward.description && <p className="text-sm text-muted-foreground">{reward.description}</p>}
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={currentPoints < reward.pointsCost || redeemReward.isPending}
                        onClick={() => redeemReward.mutate({ rewardId: reward.id })}
                      >
                        {currentPoints >= reward.pointsCost ? "استبدال" : "نقاط غير كافية"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {(!rewards || rewards.length === 0) && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-4" />
                    <p>لا توجد مكافآت بعد</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>سجل عمليات النقاط</CardTitle></CardHeader>
            <CardContent>
              {transactions && transactions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>النقاط</TableHead>
                      <TableHead>الوصف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'earned' ? 'default' : 'secondary'}>
                            {tx.type === 'earned' ? 'مكتسبة' : 'مستبدلة'}
                          </Badge>
                        </TableCell>
                        <TableCell className={tx.points > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {tx.points > 0 ? `+${tx.points}` : tx.points}
                        </TableCell>
                        <TableCell>{tx.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4" />
                  <p>لا توجد عمليات بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
