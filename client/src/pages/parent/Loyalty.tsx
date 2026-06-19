import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Gift } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function ParentLoyalty() {
  const { data: points } = trpc.loyalty.balance.useQuery();
  const { data: rewards } = trpc.loyalty.rewards.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">برنامج الولاء</h1>
      <Card className="bg-gradient-to-l from-amber-50 to-amber-100 border-amber-200">
        <CardContent className="p-6 flex items-center gap-4">
          <Star className="h-12 w-12 text-amber-500" />
          <div>
            <p className="text-3xl font-bold text-amber-700">{(points as any)?.points ?? 0}</p>
            <p className="text-sm text-amber-600">نقاط الولاء المتاحة</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" />المكافآت المتاحة</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rewards?.map((r: any) => (
              <div key={r.id} className="p-4 border rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </div>
                <Badge variant="secondary">{r.pointsCost} نقطة</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
