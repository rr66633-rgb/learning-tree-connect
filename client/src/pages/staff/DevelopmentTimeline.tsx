import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  MessageCircle,
  Activity,
  Heart,
  FileText,
  Calculator,
  Globe,
  Palette,
  Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const areaIcons: Record<string, any> = {
  "CL": MessageCircle,
  "PD": Activity,
  "PSED": Heart,
  "L": FileText,
  "M": Calculator,
  "UW": Globe,
  "EAD": Palette,
};

const areaColors: Record<string, string> = {
  "CL": "bg-blue-500",
  "PD": "bg-orange-500",
  "PSED": "bg-pink-500",
  "L": "bg-purple-500",
  "M": "bg-indigo-500",
  "UW": "bg-teal-500",
  "EAD": "bg-rose-500",
};

const getLevelLabels = (isAr: boolean): Record<string, string>  => ({
  emerging: (isAr ? "ناشئ" : "Emerging"),
  developing: (isAr ? "يتطور" : "Developing"),
  secure: (isAr ? "مستقر" : "Stable"),
  exceeding: (isAr ? "متفوق" : "Superior"),
});

const levelColors: Record<string, string> = {
  emerging: "bg-red-100 text-red-700 border-red-200",
  developing: "bg-amber-100 text-amber-700 border-amber-200",
  secure: "bg-emerald-100 text-emerald-700 border-emerald-200",
  exceeding: "bg-blue-100 text-blue-700 border-blue-200",
};

const getContextLabels = (isAr: boolean): Record<string, string>  => ({
  free_play: (isAr ? "لعب حر" : "Free play"),
  guided_activity: (isAr ? "نشاط موجه" : "Guided Activity"),
  group_work: (isAr ? "عمل جماعي" : "Teamwork"),
  outdoor: (isAr ? "خارجي" : "External"),
  routine: (isAr ? "روتين يومي" : "Daily Routine"),
  assessment: (isAr ? "تقييم رسمي" : "Official Evaluation"),
  other: (isAr ? "أخرى" : "Other"),
});

interface Props {
  childId: number;
  childName?: string;
}

export default function DevelopmentTimeline({ childId, childName }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [selectedArea, setSelectedArea] = useState<string>("all");

  const { data: observations, isLoading } = trpc.development.listObservations.useQuery({
    childId,
    areaId: selectedArea !== "all" ? parseInt(selectedArea) : undefined,
  });

  const { data: areas } = trpc.development.getAreas.useQuery();

  // Group observations by month
  const groupedByMonth = useMemo(() => {
    if (!observations) return [];
    const groups: Record<string, any[]> = {};
    observations.forEach((obs: any) => {
      const date = new Date(obs.observedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(obs);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, items]) => ({
        month: key,
        label: new Date(key + "-01").toLocaleDateString("ar-SA", { year: "numeric", month: "long" }),
        observations: items,
      }));
  }, [observations]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{isAr ? "الخط الزمني للتطور" : "Development Timeline"}</h2>
            {childName && <p className="text-sm text-muted-foreground">{childName}</p>}
          </div>
        </div>
        <Select value={selectedArea} onValueChange={setSelectedArea}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={isAr ? "جميع المجالات" : "All Fields"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? "جميع المجالات" : "All Fields"}</SelectItem>
            {areas?.map((area: any) => (
              <SelectItem key={area.id} value={String(area.id)}>
                {area.nameAr || area.nameEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : groupedByMonth.length > 0 ? (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute right-5 top-0 bottom-0 w-0.5 bg-border" />

          {groupedByMonth.map((group) => (
            <div key={group.month} className="mb-8">
              {/* Month header */}
              <div className="relative flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center z-10">
                  <Calendar className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-base font-bold text-foreground">{group.label}</h3>
                <Badge variant="outline" className="mr-auto">{group.observations.length} ملاحظة</Badge>
              </div>

              {/* Observations */}
              <div className="mr-12 space-y-3">
                {group.observations.map((obs: any) => {
                  const Icon = areaIcons[obs.area?.code] || Brain;
                  const colorClass = areaColors[obs.area?.code] || "bg-gray-500";
                  return (
                    <Card key={obs.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-medium text-sm">{obs.area?.nameAr || obs.area?.nameEn}</span>
                              <Badge className={`text-[10px] ${levelColors[obs.level] || ""}`}>
                                {getLevelLabels(isAr)[obs.level] || obs.level}
                              </Badge>
                              {obs.context && (
                                <Badge variant="outline" className="text-[10px]">
                                  {getContextLabels(isAr)[obs.context] || obs.context}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {obs.observation}
                            </p>
                            {obs.nextSteps && (
                              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                الخطوات التالية: {obs.nextSteps}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-2">
                              {new Date(obs.observedAt).toLocaleDateString("ar-SA", { weekday: "long", day: "numeric", month: "short" })}
                              {obs.teacher && ` • ${obs.teacher.firstName} ${obs.teacher.lastName}`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{isAr ? "لا توجد ملاحظات مسجلة بعد" : "No notes recorded yet"}</p>
            <p className="text-sm mt-1">{isAr ? "ابدأ بتسجيل ملاحظات لبناء الخط الزمني للتطور" : "Start recording notes to build the development timeline"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
