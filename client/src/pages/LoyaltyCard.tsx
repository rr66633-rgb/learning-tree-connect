import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Star, CreditCard, Handshake, Download, History, Coins, Smartphone, QrCode, Calendar } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function LoyaltyCard() {
  const { data: card, isLoading: cardLoading } = trpc.loyalty.myCard.useQuery();
  const { data: balance } = trpc.loyalty.balance.useQuery();
  const { data: rewards } = trpc.loyalty.rewards.useQuery();
  const { data: partners } = trpc.loyalty.partners.useQuery();
  const { data: transactions } = trpc.loyalty.transactions.useQuery();
  const utils = trpc.useUtils();

  const generateCard = trpc.loyalty.generateCard.useMutation({
    onSuccess: () => {
      utils.loyalty.myCard.invalidate();
      toast.success("تم إصدار بطاقتك بنجاح");
    },
    onError: () => toast.error("حدث خطأ أثناء إصدار البطاقة"),
  });

  const redeemReward = trpc.loyalty.redeem.useMutation({
    onSuccess: () => {
      utils.loyalty.balance.invalidate();
      utils.loyalty.transactions.invalidate();
      toast.success("تم استبدال المكافأة بنجاح");
    },
    onError: (err) => toast.error(err.message || "رصيد النقاط غير كافٍ"),
  });

  const currentPoints = balance?.points ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
          <CreditCard className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">بطاقة الولاء</h1>
          <p className="text-sm text-muted-foreground">بطاقتك الرقمية ونقاطك ومكافآتك</p>
        </div>
      </div>

      {/* Digital Card Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Display */}
        <div className="space-y-4">
          {card ? (
            <DigitalCard card={card} points={currentPoints} />
          ) : (
            <Card className="border-2 border-dashed border-teal-300 bg-teal-50/30">
              <CardContent className="p-8 text-center space-y-4">
                <CreditCard className="h-16 w-16 mx-auto text-teal-400" />
                <div>
                  <h3 className="text-lg font-semibold">احصل على بطاقتك الرقمية</h3>
                  <p className="text-sm text-muted-foreground mt-1">بطاقة ولاء رقمية مع باركود للاستفادة من خصومات شركائنا</p>
                </div>
                <Button size="lg" onClick={() => generateCard.mutate()} disabled={generateCard.isPending} className="bg-gradient-to-r from-teal-500 to-teal-600">
                  {generateCard.isPending ? "جارٍ الإصدار..." : "إصدار البطاقة"}
                </Button>
              </CardContent>
            </Card>
          )}

          {card && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => toast.success("سيتم إضافة دعم Apple Wallet قريباً")}>
                <Smartphone className="h-4 w-4 ml-2" />
                إضافة إلى المحفظة
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => {
                // Download card as image
                const cardEl = document.getElementById('loyalty-card-visual');
                if (cardEl) toast.success("يمكنك تصوير البطاقة من الشاشة");
              }}>
                <Download className="h-4 w-4 ml-2" />
                تحميل البطاقة
              </Button>
            </div>
          )}
        </div>

        {/* Points Summary */}
        <div className="space-y-4">
          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-100">
                  <Coins className="h-8 w-8 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-amber-700">رصيد النقاط</p>
                  <p className="text-4xl font-bold text-amber-800">{currentPoints}</p>
                  <p className="text-xs text-amber-600 mt-1">نقطة متاحة للاستبدال</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {card && (
            <Card>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">رقم البطاقة</span>
                  <span className="font-mono font-medium">{card.cardNumber}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">تاريخ الانتهاء</span>
                  <span className="font-medium">{new Date(card.expiryDate).toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">الحالة</span>
                  <Badge variant={card.isActive && new Date(card.expiryDate) > new Date() ? "default" : "destructive"}>
                    {card.isActive && new Date(card.expiryDate) > new Date() ? "نشطة" : "منتهية"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tabs: Partners, Rewards, History */}
      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="partners"><Handshake className="h-4 w-4 ml-1" />خصومات الشركاء</TabsTrigger>
          <TabsTrigger value="rewards"><Gift className="h-4 w-4 ml-1" />المكافآت</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 ml-1" />سجل النقاط</TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partners && partners.length > 0 ? partners.map((partner: any) => (
              <Card key={partner.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt={partner.nameAr} className="h-14 w-14 rounded-xl object-contain border p-1" />
                    ) : (
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                        {partner.nameAr?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{partner.nameAr}</h3>
                      {partner.discountDescriptionAr && <p className="text-sm text-muted-foreground mt-1">{partner.discountDescriptionAr}</p>}
                    </div>
                    {partner.discountPercentage > 0 && (
                      <Badge className="bg-green-100 text-green-700 text-lg px-3 py-1">
                        {partner.discountPercentage}%
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا يوجد شركاء خصم حالياً</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rewards">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards?.map((reward: any) => (
              <Card key={reward.id} className="border-2 hover:border-amber-300 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold">{reward.nameAr || reward.name}</h3>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                      <Star className="h-3 w-3 ml-1" />{reward.pointsCost}
                    </Badge>
                  </div>
                  {(reward.descriptionAr || reward.description) && (
                    <p className="text-sm text-muted-foreground">{reward.descriptionAr || reward.description}</p>
                  )}
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
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد مكافآت متاحة حالياً</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
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
                    {(transactions as any[]).map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'earned' ? 'default' : 'secondary'}>
                            {tx.type === 'earned' ? 'مكتسبة' : tx.type === 'redeemed' ? 'مستبدلة' : 'تعديل'}
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
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
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

function DigitalCard({ card, points }: { card: any; points: number }) {
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Generate QR code on canvas
    const generateQR = async () => {
      if (!qrRef.current || !card.cardNumber) return;
      try {
        const QRCode = await import('qrcode');
        await QRCode.toCanvas(qrRef.current, card.qrCodeData || card.cardNumber, {
          width: 120,
          margin: 1,
          color: { dark: '#1a1a2e', light: '#ffffff' },
        });
      } catch (e) {
        console.error('QR generation failed:', e);
      }
    };
    generateQR();
  }, [card]);

  const bgColor = card.backgroundColor || '#2BBAA4';
  const textColor = card.textColor || '#FFFFFF';
  const accentColor = card.accentColor || '#7C3AED';
  const pattern = card.backgroundPattern || 'gradient';

  const bgStyle = pattern === 'gradient'
    ? { background: `linear-gradient(135deg, ${bgColor} 0%, ${accentColor} 100%)` }
    : pattern === 'dots'
    ? { background: `${bgColor}`, backgroundImage: `radial-gradient(circle, ${accentColor}22 1px, transparent 1px)`, backgroundSize: '20px 20px' }
    : pattern === 'waves'
    ? { background: `linear-gradient(180deg, ${bgColor} 0%, ${accentColor}88 50%, ${bgColor} 100%)` }
    : { background: bgColor };

  return (
    <div id="loyalty-card-visual" className="relative rounded-2xl overflow-hidden shadow-xl aspect-[1.6/1] p-6 flex flex-col justify-between" style={{ ...bgStyle, color: textColor }}>
      {/* Top Row */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-wide">نشأة</h2>
          <p className="text-xs opacity-80 mt-1">بطاقة ولاء</p>
        </div>
        <div className="bg-white rounded-lg p-1 shadow-md">
          <canvas ref={qrRef} className="w-[100px] h-[100px]" />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4" />
          <span className="text-lg font-bold">{points} نقطة</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm tracking-wider opacity-90">{card.cardNumber}</span>
          <div className="flex items-center gap-1 text-xs opacity-80">
            <Calendar className="h-3 w-3" />
            <span>{new Date(card.expiryDate).toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
      </div>

      {/* Decorative circles */}
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-10" style={{ background: textColor }} />
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10" style={{ background: textColor }} />
    </div>
  );
}
