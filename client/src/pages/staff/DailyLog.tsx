import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Utensils, Moon, Droplets, Baby, Sun, ThermometerSun, StickyNote,
  LogIn, LogOut, Coffee, Apple, Sandwich, Cookie, Smile, BookOpen, TreePine,
  Search, Clock, User
} from "lucide-react";
import { useTranslation } from "react-i18next";

const activityTypes = [
  { value: "arrival", label: "الوصول", icon: LogIn, options: [] },
  { value: "breakfast", label: "الإفطار", icon: Coffee, options: ["كاملة", "جزئية", "رفض"] },
  { value: "morning_snack", label: "وجبة صباحية", icon: Apple, options: ["كاملة", "جزئية", "رفض"] },
  { value: "lunch", label: "الغداء", icon: Sandwich, options: ["كاملة", "جزئية", "رفض"] },
  { value: "afternoon_snack", label: "وجبة مسائية", icon: Cookie, options: ["كاملة", "جزئية", "رفض"] },
  { value: "nap_start", label: "بداية قيلولة", icon: Moon, options: [] },
  { value: "nap_end", label: "نهاية قيلولة", icon: Moon, options: [] },
  { value: "diaper", label: "تغيير حفاض", icon: Baby, options: ["نظيف", "مبلل", "متسخ"] },
  { value: "toilet", label: "دورة مياه", icon: Droplets, options: ["نجح", "محاولة"] },
  { value: "medication", label: "دواء", icon: ThermometerSun, options: [] },
  { value: "mood", label: "المزاج", icon: Smile, options: ["سعيد", "هادئ", "متعب", "منزعج", "متحمس"] },
  { value: "learning_activity", label: "نشاط تعليمي", icon: BookOpen, options: [] },
  { value: "outdoor_play", label: "لعب خارجي", icon: TreePine, options: [] },
  { value: "departure", label: "المغادرة", icon: LogOut, options: [] },
];

type ActivityType = typeof activityTypes[number]["value"];

export default function StaffDailyLog() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { data: children, isLoading: childrenLoading } = trpc.children.list.useQuery();
  const utils = trpc.useUtils();
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [details, setDetails] = useState("");
  const [notes, setNotes] = useState("");
  const [childSearch, setChildSearch] = useState("");
  const [mode, setMode] = useState<"individual" | "bulk">("individual");
  const [activeTab, setActiveTab] = useState("activities");

  // Departure state
  const [departureChild, setDepartureChild] = useState<string>("");
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [relationship, setRelationship] = useState<string>("");
  const [departureNotes, setDepartureNotes] = useState("");
  const [departureSearch, setDepartureSearch] = useState("");
  const [showDepartureDialog, setShowDepartureDialog] = useState(false);
  const [selectedPickupPerson, setSelectedPickupPerson] = useState<string>("");
  const [customPickupName, setCustomPickupName] = useState("");

  // Fetch authorized pickup persons when a child is selected for departure
  const { data: authorizedPersons } = trpc.pickup.authorizedPersons.useQuery(
    { childId: parseInt(departureChild) },
    { enabled: !!departureChild && !isNaN(parseInt(departureChild)) }
  );

  const today = new Date().toISOString().split("T")[0];

  const { data: todayActivities } = trpc.dailyActivities.byChild.useQuery(
    { childId: parseInt(selectedChild), date: today },
    { enabled: !!selectedChild }
  );

  const { data: todayDepartures } = trpc.departures.byDate.useQuery({ date: today });

  const logActivity = trpc.dailyActivities.create.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تسجيل النشاط" : "Activity recorded");
      setDetails("");
      setNotes("");
      utils.dailyActivities.byChild.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const createDeparture = trpc.departures.create.useMutation({
    onSuccess: () => {
      toast.success(isAr ? "تم تسجيل المغادرة" : "Departure recorded");
      setPickedUpBy("");
      setRelationship("");
      setDepartureNotes("");
      setDepartureChild("");
      setSelectedPickupPerson("");
      setCustomPickupName("");
      setShowDepartureDialog(false);
      utils.departures.byDate.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Filter children by search
  const filteredChildren = useMemo(() => {
    if (!children) return [];
    if (!childSearch) return children;
    return children.filter((c: any) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      return fullName.includes(childSearch.toLowerCase());
    });
  }, [children, childSearch]);

  const filteredDepartureChildren = useMemo(() => {
    if (!children) return [];
    if (!departureSearch) return children;
    return children.filter((c: any) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      return fullName.includes(departureSearch.toLowerCase());
    });
  }, [children, departureSearch]);

  const handleLog = () => {
    if (!selectedChild || !selectedType) { toast.error(isAr ? "اختر الطفل ونوع النشاط" : "Select child and activity type"); return; }
    logActivity.mutate({
      childId: parseInt(selectedChild),
      type: selectedType as any,
      description: details || undefined,
      notes: notes || undefined,
    });
  };

  const handleBulkLog = () => {
    if (!selectedType) { toast.error(isAr ? "اختر نوع النشاط" : "Select activity type"); return; }
    if (!children || children.length === 0) return;
    // Log for all children
    children.forEach((c: any) => {
      logActivity.mutate({
        childId: c.id,
        type: selectedType as any,
        description: details || undefined,
        notes: notes || undefined,
      });
    });
  };

  const handlePickupPersonChange = (value: string) => {
    setSelectedPickupPerson(value);
    if (value === "other") {
      setPickedUpBy("");
      setRelationship("other");
      setCustomPickupName("");
    } else if (authorizedPersons) {
      const person = authorizedPersons.find((p: any) => p.id.toString() === value);
      if (person) {
        setPickedUpBy(person.name);
        // Map authorized_pickup_persons relationships to departure enum
        const relMap: Record<string, string> = {
          father: 'father', mother: 'mother', grandfather: 'grandparent',
          grandmother: 'grandparent', driver: 'driver', relative: 'guardian', other: 'other'
        };
        setRelationship(relMap[person.relationship] || 'other');
      }
    }
  };

  const handleDeparture = () => {
    const finalPickedUpBy = selectedPickupPerson === "other" ? customPickupName : pickedUpBy;
    if (!departureChild || !finalPickedUpBy || !relationship) {
      toast.error(isAr ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill all required fields");
      return;
    }
    createDeparture.mutate({
      childId: parseInt(departureChild),
      departureTime: new Date().toISOString(),
      pickedUpBy: finalPickedUpBy,
      relationship: relationship as "mother" | "father" | "driver" | "grandparent" | "guardian" | "other",
      notes: departureNotes || undefined,
    });
  };

  const selectedTypeInfo = activityTypes.find(t => t.value === selectedType);

  const getActivityIcon = (type: string) => {
    const found = activityTypes.find(t => t.value === type);
    return found ? found.icon : StickyNote;
  };

  const getActivityLabel = (type: string) => {
    const found = activityTypes.find(t => t.value === type);
    return found ? found.label : type;
  };

  const getChildName = (childId: number) => {
    const child = children?.find((c: any) => c.id === childId);
    return child ? `${child.firstName} ${child.lastName}` : `طفل #${childId}`;
  };

  const getChildPhoto = (childId: number) => {
    const child = children?.find((c: any) => c.id === childId);
    return child?.photo || null;
  };

  const ChildAvatar = ({ childId, size = "sm" }: { childId: number; size?: "sm" | "md" | "lg" }) => {
    const photo = getChildPhoto(childId);
    const name = getChildName(childId);
    const sizeClasses = size === "lg" ? "h-16 w-16" : size === "md" ? "h-10 w-10" : "h-7 w-7";
    const textSize = size === "lg" ? "text-lg" : size === "md" ? "text-sm" : "text-[10px]";
    if (photo) {
      return <img src={photo} alt={name} className={`${sizeClasses} rounded-full object-cover border border-primary/20`} />;
    }
    return (
      <div className={`${sizeClasses} rounded-full bg-primary/10 flex items-center justify-center ${textSize} font-bold text-primary`}>
        {name.charAt(0)}
      </div>
    );
  };

  const getRelationshipLabel = (rel: string) => {
    const labels: Record<string, string> = {
      mother: "الأم", father: "الأب", driver: "السائق",
      grandparent: "الجد/الجدة", grandfather: "الجد", grandmother: "الجدة",
      guardian: "ولي الأمر", parent: "ولي أمر", relative: "قريب", other: "آخر"
    };
    return labels[rel] || rel;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">سجل الرعاية اليومية</h1>
        <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('ar-SA')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activities">الأنشطة</TabsTrigger>
          <TabsTrigger value="departure">المغادرة</TabsTrigger>
          <TabsTrigger value="history">السجل</TabsTrigger>
        </TabsList>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === "individual" ? "default" : "outline"} size="sm" onClick={() => setMode("individual")}>فردي</Button>
            <Button variant={mode === "bulk" ? "default" : "outline"} size="sm" onClick={() => setMode("bulk")}>جماعي</Button>
          </div>

          <Card>
            <CardHeader><CardTitle>تسجيل نشاط جديد</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mode === "individual" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="بحث بالاسم..."
                        value={childSearch}
                        onChange={(e) => setChildSearch(e.target.value)}
                        className="pr-9 mb-2"
                      />
                    </div>
                    <Select value={selectedChild} onValueChange={setSelectedChild}>
                      <SelectTrigger><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
                      <SelectContent>
                        {childrenLoading ? (
                          <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                        ) : filteredChildren.length === 0 ? (
                          <SelectItem value="empty" disabled>لا يوجد نتائج</SelectItem>
                        ) : (
                          filteredChildren.map((c: any) => (
                            <SelectItem key={c.id} value={c.id.toString()}>
                              <span className="flex items-center gap-2">
                                {c.photo ? (
                                  <img src={c.photo} alt="" className="h-6 w-6 rounded-full object-cover" />
                                ) : (
                                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{c.firstName?.charAt(0)}</div>
                                )}
                                {c.firstName} {c.lastName}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue placeholder="نوع النشاط" /></SelectTrigger>
                  <SelectContent>
                    {activityTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <span className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          {t.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTypeInfo?.options && selectedTypeInfo.options.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedTypeInfo.options.map(opt => (
                    <Badge key={opt} variant={details === opt ? "default" : "outline"} className="cursor-pointer" onClick={() => setDetails(opt)}>{opt}</Badge>
                  ))}
                </div>
              )}

              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية (اختياري)" rows={2} />

              <Button
                onClick={mode === "individual" ? handleLog : handleBulkLog}
                disabled={logActivity.isPending}
                className="w-full md:w-auto"
              >
                {logActivity.isPending ? "جاري التسجيل..." : mode === "individual" ? "تسجيل النشاط" : "تسجيل للجميع"}
              </Button>
            </CardContent>
          </Card>

          {/* Activity type quick buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {activityTypes.map(type => (
              <Card
                key={type.value}
                className={`cursor-pointer hover:shadow-md transition-all ${selectedType === type.value ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                onClick={() => setSelectedType(type.value)}
              >
                <CardContent className="p-3 flex flex-col items-center gap-1.5">
                  <type.icon className={`h-5 w-5 ${selectedType === type.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="text-xs text-center font-medium">{type.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Today's activities for selected child */}
          {selectedChild && todayActivities && todayActivities.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">أنشطة اليوم - {getChildName(parseInt(selectedChild))}</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {todayActivities.map((activity: any) => {
                    const Icon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{getActivityLabel(activity.type)}</span>
                        {activity.notes && <span className="text-xs text-muted-foreground">{activity.notes}</span>}
                        <span className="text-xs text-muted-foreground mr-auto">
                          {new Date(activity.recordedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Departure Tab */}
        <TabsContent value="departure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                تسجيل مغادرة طفل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{isAr ? "الطفل" : "Child"}</Label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم..."
                    value={departureSearch}
                    onChange={(e) => setDepartureSearch(e.target.value)}
                    className="pr-9 mb-2"
                  />
                </div>
                <Select value={departureChild} onValueChange={setDepartureChild}>
                  <SelectTrigger><SelectValue placeholder="اختر الطفل" /></SelectTrigger>
                  <SelectContent>
                    {filteredDepartureChildren.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        <span className="flex items-center gap-2">
                          {c.photo ? (
                            <img src={c.photo} alt="" className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{c.firstName?.charAt(0)}</div>
                          )}
                          {c.firstName} {c.lastName}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pickup verification - show child photo prominently */}
              {departureChild && (
                <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <ChildAvatar childId={parseInt(departureChild)} size="lg" />
                  <div>
                    <p className="font-bold text-lg">{getChildName(parseInt(departureChild))}</p>
                    <p className="text-sm text-muted-foreground">تأكد من هوية الطفل قبل التسليم</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>المستلم</Label>
                  <Select value={selectedPickupPerson} onValueChange={handlePickupPersonChange}>
                    <SelectTrigger><SelectValue placeholder="اختر المستلم" /></SelectTrigger>
                    <SelectContent>
                      {authorizedPersons && authorizedPersons.length > 0 ? (
                        authorizedPersons.map((person: any) => (
                          <SelectItem key={person.id} value={person.id.toString()}>
                            <span className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {person.name} - {getRelationshipLabel(person.relationship)}
                              {person.phone && <span className="text-muted-foreground text-xs">({person.phone})</span>}
                            </span>
                          </SelectItem>
                        ))
                      ) : null}
                      <SelectItem value="other">
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          شخص آخر
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedPickupPerson === "other" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم المستلم</Label>
                      <Input
                        placeholder="أدخل اسم المستلم"
                        value={customPickupName}
                        onChange={(e) => setCustomPickupName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>صلة القرابة</Label>
                      <Select value={relationship} onValueChange={setRelationship}>
                        <SelectTrigger><SelectValue placeholder="اختر صلة القرابة" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mother">الأم</SelectItem>
                          <SelectItem value="father">الأب</SelectItem>
                          <SelectItem value="driver">السائق</SelectItem>
                          <SelectItem value="grandparent">الجد/الجدة</SelectItem>
                          <SelectItem value="guardian">{isAr ? "ولي الأمر" : "Parent"}</SelectItem>
                          <SelectItem value="other">أخرى</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {selectedPickupPerson && selectedPickupPerson !== "other" && pickedUpBy && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                    <User className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">{pickedUpBy}</p>
                      <p className="text-sm text-green-600 dark:text-green-400">{getRelationshipLabel(relationship)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>ملاحظات المغادرة (اختياري)</Label>
                <Textarea
                  value={departureNotes}
                  onChange={(e) => setDepartureNotes(e.target.value)}
                  placeholder="أي ملاحظات عن المغادرة..."
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">وقت المغادرة: {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <Button
                onClick={handleDeparture}
                disabled={createDeparture.isPending}
                className="w-full"
                variant="default"
              >
                {createDeparture.isPending ? "جاري التسجيل..." : "تسجيل المغادرة"}
              </Button>
            </CardContent>
          </Card>

          {/* Today's departures */}
          {todayDepartures && todayDepartures.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">مغادرات اليوم</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">{isAr ? "الطفل" : "Child"}</TableHead>
                      <TableHead className="text-right">الوقت</TableHead>
                      <TableHead className="text-right">المستلم</TableHead>
                      <TableHead className="text-right">صلة القرابة</TableHead>
                      <TableHead className="text-right">{isAr ? "الحالة" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayDepartures.map((dep: any) => (
                      <TableRow key={dep.id}>
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <ChildAvatar childId={dep.childId} size="sm" />
                            {getChildName(dep.childId)}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(dep.departureTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>{dep.pickedUpBy}</TableCell>
                        <TableCell>{getRelationshipLabel(dep.relationship)}</TableCell>
                        <TableCell>
                          <Badge variant={dep.status === 'completed' ? 'default' : dep.status === 'late' ? 'destructive' : 'secondary'}>
                            {dep.status === 'completed' ? 'مكتمل' : dep.status === 'late' ? 'متأخر' : 'معلق'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">سجل الأنشطة</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <Select value={selectedChild} onValueChange={setSelectedChild}>
                  <SelectTrigger><SelectValue placeholder="اختر طفل لعرض سجله" /></SelectTrigger>
                  <SelectContent>
                    {children?.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.firstName} {c.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedChild && todayActivities && todayActivities.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الوقت</TableHead>
                      <TableHead className="text-right">النشاط</TableHead>
                      <TableHead className="text-right">التفاصيل</TableHead>
                      <TableHead className="text-right">{isAr ? "ملاحظات" : "Notes"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {todayActivities.map((activity: any) => (
                      <TableRow key={activity.id}>
                        <TableCell>{new Date(activity.recordedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {(() => { const Icon = getActivityIcon(activity.type); return <Icon className="h-4 w-4" />; })()}
                            {getActivityLabel(activity.type)}
                          </div>
                        </TableCell>
                        <TableCell>{activity.details ? JSON.stringify(activity.details) : '-'}</TableCell>
                        <TableCell>{activity.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {selectedChild ? "لا توجد أنشطة مسجلة لهذا اليوم" : "اختر طفل لعرض سجله"}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
