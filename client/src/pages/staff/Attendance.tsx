import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, LogIn, LogOut, Loader2, History, Edit, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function StaffAttendance() {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  const locale = isEn ? 'en-US' : 'ar-SA';

  const STATUS_LABELS: Record<string, string> = {
    present: t('staffAttendance.present'),
    absent: t('staffAttendance.absent'),
    late: t('staffAttendance.late'),
    excused: t('staffAttendance.excused'),
    checked_in: t('staffAttendance.checkedIn'),
    checked_out: t('staffAttendance.checkedOut'),
  };

  const STATUS_COLORS: Record<string, string> = {
    present: "bg-green-100 text-green-700",
    absent: "bg-red-100 text-red-700",
    late: "bg-amber-100 text-amber-700",
    excused: "bg-blue-100 text-blue-700",
    checked_in: "bg-emerald-100 text-emerald-700",
    checked_out: "bg-gray-100 text-gray-700",
  };

  const [selectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkInDialog, setCheckInDialog] = useState<{ childId: number; childName: string } | null>(null);
  const [checkOutDialog, setCheckOutDialog] = useState<{ id: number; childId: number; childName: string } | null>(null);
  const [statusChangeDialog, setStatusChangeDialog] = useState<{ id: number; childId: number; childName: string; currentStatus: string; newStatus: string } | null>(null);
  const [auditLogDialog, setAuditLogDialog] = useState<{ childId: number; childName: string; attendanceId?: number } | null>(null);
  const [statusChangeNotes, setStatusChangeNotes] = useState("");
  const [droppedOffBy, setDroppedOffBy] = useState("");
  const [droppedOffRelationship, setDroppedOffRelationship] = useState<string>("");
  const [checkInNotes, setCheckInNotes] = useState("");
  const [pickedUpBy, setPickedUpBy] = useState("");
  const [pickupRelationship, setPickupRelationship] = useState<string>("");
  const [checkOutNotes, setCheckOutNotes] = useState("");
  const [signatureData, setSignatureData] = useState("");
  const [markAbsentConfirm, setMarkAbsentConfirm] = useState<{ childId: number; childName: string } | null>(null);

  const { data: children, isLoading } = trpc.children.list.useQuery();
  const { data: records } = trpc.attendance.byDate.useQuery({ date: selectedDate });
  const { data: auditLogs } = trpc.attendance.auditLog.useQuery(
    { childId: auditLogDialog?.childId, attendanceId: auditLogDialog?.attendanceId },
    { enabled: !!auditLogDialog }
  );
  const utils = trpc.useUtils();

  const checkIn = trpc.attendance.checkIn.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success(t('staffAttendance.arrivalRecorded')); setCheckInDialog(null); resetCheckInForm(); },
    onError: () => toast.error(t('staffAttendance.error')),
  });
  const markAbsent = trpc.attendance.markAbsent.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success(t('staffAttendance.absenceRecorded')); },
    onError: () => toast.error(t('staffAttendance.error')),
  });
  const checkOut = trpc.attendance.checkOut.useMutation({
    onSuccess: () => { utils.attendance.byDate.invalidate(); toast.success(t('staffAttendance.departureRecorded')); setCheckOutDialog(null); resetCheckOutForm(); },
    onError: () => toast.error(t('staffAttendance.error')),
  });
  const updateStatus = trpc.attendance.updateStatus.useMutation({
    onSuccess: () => {
      utils.attendance.byDate.invalidate();
      toast.success(t('staffAttendance.statusChanged'));
      setStatusChangeDialog(null);
      setStatusChangeNotes("");
    },
    onError: () => toast.error(t('staffAttendance.statusChangeError')),
  });

  function resetCheckInForm() { setDroppedOffBy(""); setDroppedOffRelationship(""); setCheckInNotes(""); }
  function resetCheckOutForm() { setPickedUpBy(""); setPickupRelationship(""); setCheckOutNotes(""); setSignatureData(""); }

  const attendanceMap = useMemo(() => {
    const map = new Map<number, any>();
    records?.forEach((r: any) => map.set(r.childId, r));
    return map;
  }, [records]);

  // Filter children to only show those scheduled for the selected day
  const scheduledChildren = useMemo(() => {
    if (!children) return [];
    const dayOfWeek = new Date(selectedDate).getDay(); // 0=Sunday, 1=Monday, etc.
    return children.filter((child: any) => {
      if (!child.attendanceDays || !Array.isArray(child.attendanceDays)) return true; // default: show all days
      return child.attendanceDays.includes(dayOfWeek);
    });
  }, [children, selectedDate]);

  const currentlyInCenter = useMemo(() => {
    if (!records || !scheduledChildren) return [];
    return scheduledChildren.filter((child: any) => {
      const record = attendanceMap.get(child.id);
      return record && (record.status === 'present' || record.status === 'late' || record.status === 'checked_in') && !record.checkOutTime;
    });
  }, [scheduledChildren, records, attendanceMap]);

  function handleCheckInSubmit() {
    if (!checkInDialog) return;
    checkIn.mutate({
      childId: checkInDialog.childId,
      date: selectedDate,
      droppedOffBy: droppedOffBy || undefined,
      droppedOffRelationship: (droppedOffRelationship as any) || undefined,
      notes: checkInNotes || undefined,
    });
  }

  function handleCheckOutSubmit() {
    if (!checkOutDialog) return;
    checkOut.mutate({
      id: checkOutDialog.id,
      childId: checkOutDialog.childId,
      pickedUpBy: pickedUpBy || undefined,
      relationship: (pickupRelationship as any) || undefined,
      signatureData: signatureData || undefined,
      notes: checkOutNotes || undefined,
    });
  }

  function handleStatusChangeConfirm() {
    if (!statusChangeDialog) return;
    updateStatus.mutate({
      id: statusChangeDialog.id,
      childId: statusChangeDialog.childId,
      newStatus: statusChangeDialog.newStatus as any,
      notes: statusChangeNotes || undefined,
    });
  }

  function openStatusChange(record: any, childName: string, newStatus: string) {
    setStatusChangeDialog({
      id: record.id,
      childId: record.childId,
      childName,
      currentStatus: record.status,
      newStatus,
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('staffAttendance.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <Badge variant="outline" className="w-fit rounded-xl px-4 py-2 text-sm border-primary/20 text-primary bg-primary/5">
          {scheduledChildren?.length ?? 0} {t('staffAttendance.registeredChild')}
        </Badge>
      </div>

      {/* Currently in center */}
      {currentlyInCenter.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-l from-emerald-50/80 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              {t('staffAttendance.inCenter')} ({currentlyInCenter.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {currentlyInCenter.map((child: any) => (
                <Badge key={child.id} variant="secondary" className={`rounded-lg px-3 py-1 ${child.allergies ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-100/80 text-emerald-800'}`}>
                  {child.firstName} {child.lastName}
                  {child.allergies && <AlertTriangle className="h-3 w-3 mr-1 inline" />}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.child')}</TableHead>
                <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.status')}</TableHead>
                <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.arrival')}</TableHead>
                <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.departure')}</TableHead>
                <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.changeStatus')}</TableHead>
                <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.action')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              )) : scheduledChildren?.map((child: any) => {
                const record = attendanceMap.get(child.id);
                const childName = `${child.firstName} ${child.lastName}`;
                return (
                  <TableRow key={child.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {child.photo ? (
                          <img src={child.photo} alt="" className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            {(child.firstName?.[0] || "")}{(child.lastName?.[0] || "")}
                          </div>
                        )}
                        <span>{childName}</span>
                        {child.allergies && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 rounded-full px-1.5 py-0.5 text-[10px] font-medium">
                                  <AlertTriangle className="h-3 w-3" />
                                  {isEn ? "Allergy" : "حساسية"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px]">
                                <p className="text-xs font-medium">{child.allergies}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record ? (
                        <Badge className={STATUS_COLORS[record.status] || "bg-gray-100 text-gray-700"}>
                          {STATUS_LABELS[record.status] || record.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">{t('staffAttendance.notRecorded')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record?.checkInTime ? new Date(record.checkInTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record?.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : "-"}
                    </TableCell>
                    <TableCell>
                      {record ? (
                        <div className="flex flex-wrap gap-1">
                          {record.status !== 'present' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-green-600 hover:bg-green-50" onClick={() => openStatusChange(record, childName, 'present')}>
                              {t('staffAttendance.present')}
                            </Button>
                          )}
                          {record.status !== 'absent' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-red-600 hover:bg-red-50" onClick={() => openStatusChange(record, childName, 'absent')}>
                              {t('staffAttendance.absent')}
                            </Button>
                          )}
                          {record.status !== 'late' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-amber-600 hover:bg-amber-50" onClick={() => openStatusChange(record, childName, 'late')}>
                              {t('staffAttendance.late')}
                            </Button>
                          )}
                          {record.status !== 'excused' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-600 hover:bg-blue-50" onClick={() => openStatusChange(record, childName, 'excused')}>
                              {t('staffAttendance.excused')}
                            </Button>
                          )}
                          {record.status !== 'checked_in' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-emerald-600 hover:bg-emerald-50" onClick={() => openStatusChange(record, childName, 'checked_in')}>
                              {t('staffAttendance.register')}
                            </Button>
                          )}
                          {record.status !== 'checked_out' && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-gray-600 hover:bg-gray-50" onClick={() => openStatusChange(record, childName, 'checked_out')}>
                              {t('staffAttendance.departureBtn')}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-purple-600 hover:bg-purple-50" onClick={() => setAuditLogDialog({ childId: child.id, childName, attendanceId: record.id })}>
                            <History className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!record && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-600 gap-1" onClick={() => {
                              checkIn.mutate({ childId: child.id, date: selectedDate });
                            }} disabled={checkIn.isPending}>
                              <LogIn className="h-3 w-3" /> {t('staffAttendance.arrivalBtn')}
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => setMarkAbsentConfirm({ childId: child.id, childName })} disabled={markAbsent.isPending}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {record && (record.status === 'present' || record.status === 'late' || record.status === 'checked_in') && !record.checkOutTime && (
                          <Button size="sm" variant="outline" className="text-orange-600 gap-1" onClick={() => {
                            checkOut.mutate({ id: record.id, childId: child.id });
                          }} disabled={checkOut.isPending}>
                            <LogOut className="h-3 w-3" /> {t('staffAttendance.departureBtn')}
                          </Button>
                        )}
                        {record?.checkOutTime && (
                          <Badge variant="outline" className="text-muted-foreground">{t('staffAttendance.completed')}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mark Absent Confirmation Dialog */}
      <AlertDialog open={!!markAbsentConfirm} onOpenChange={(open) => { if (!open) setMarkAbsentConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staffAttendance.confirmAbsence')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('staffAttendance.confirmAbsenceMsg', { name: markAbsentConfirm?.childName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (markAbsentConfirm) {
                  markAbsent.mutate({ childId: markAbsentConfirm.childId, date: selectedDate, status: "absent" as const });
                  setMarkAbsentConfirm(null);
                }
              }}
            >
              {t('staffAttendance.confirmAbsenceBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Change Confirmation Dialog */}
      <AlertDialog open={!!statusChangeDialog} onOpenChange={(open) => { if (!open) { setStatusChangeDialog(null); setStatusChangeNotes(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staffAttendance.confirmStatusChange')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {t('staffAttendance.statusChangeMsg', { name: statusChangeDialog?.childName })}{" "}
                <Badge className={STATUS_COLORS[statusChangeDialog?.currentStatus || ""] || ""}>{STATUS_LABELS[statusChangeDialog?.currentStatus || ""] || statusChangeDialog?.currentStatus}</Badge>
                {" "}{t('staffAttendance.to')}{" "}
                <Badge className={STATUS_COLORS[statusChangeDialog?.newStatus || ""] || ""}>{STATUS_LABELS[statusChangeDialog?.newStatus || ""] || statusChangeDialog?.newStatus}</Badge>
                ?
              </p>
              <div className="pt-2">
                <Label className="text-sm">{t('staffAttendance.notesOptional')}</Label>
                <Textarea
                  value={statusChangeNotes}
                  onChange={e => setStatusChangeNotes(e.target.value)}
                  placeholder={t('staffAttendance.changeReason')}
                  className="mt-1"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChangeConfirm} disabled={updateStatus.isPending}>
              {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {t('staffAttendance.confirmChange')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Log Dialog */}
      <Dialog open={!!auditLogDialog} onOpenChange={(open) => { if (!open) setAuditLogDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('staffAttendance.auditLog')} - {auditLogDialog?.childName}</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {auditLogs && auditLogs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.auditTime')}</TableHead>
                    <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.auditFrom')}</TableHead>
                    <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.auditTo')}</TableHead>
                    <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.auditBy')}</TableHead>
                    <TableHead className={isEn ? "text-left" : "text-right"}>{t('staffAttendance.auditNotes')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.createdAt).toLocaleString(locale, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{STATUS_LABELS[log.previousStatus] || log.previousStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${STATUS_COLORS[log.newStatus] || ""}`}>{STATUS_LABELS[log.newStatus] || log.newStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{log.changedByName || "-"}</TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">{log.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">{t('staffAttendance.noChanges')}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAuditLogDialog(null)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-In Dialog */}
      <Dialog open={!!checkInDialog} onOpenChange={(open) => { if (!open) { setCheckInDialog(null); resetCheckInForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('staffAttendance.checkInTitle')} - {checkInDialog?.childName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('staffAttendance.whoDroppedOff')}</Label>
              <Input value={droppedOffBy} onChange={e => setDroppedOffBy(e.target.value)} placeholder={t('staffAttendance.personName')} />
            </div>
            <div>
              <Label>{t('staffAttendance.relationship')}</Label>
              <Select value={droppedOffRelationship} onValueChange={setDroppedOffRelationship}>
                <SelectTrigger><SelectValue placeholder={t('staffAttendance.choose')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">{t('staffAttendance.mother')}</SelectItem>
                  <SelectItem value="father">{t('staffAttendance.father')}</SelectItem>
                  <SelectItem value="driver">{t('staffAttendance.driver')}</SelectItem>
                  <SelectItem value="grandparent">{t('staffAttendance.grandparent')}</SelectItem>
                  <SelectItem value="other">{t('staffAttendance.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('staffAttendance.notes')}</Label>
              <Textarea value={checkInNotes} onChange={e => setCheckInNotes(e.target.value)} placeholder={t('staffAttendance.optionalNotes')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCheckInDialog(null); resetCheckInForm(); }}>{t('common.cancel')}</Button>
            <Button onClick={handleCheckInSubmit} disabled={checkIn.isPending}>
              {checkIn.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {t('staffAttendance.registerArrival')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-Out Dialog */}
      <Dialog open={!!checkOutDialog} onOpenChange={(open) => { if (!open) { setCheckOutDialog(null); resetCheckOutForm(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('staffAttendance.checkOutTitle')} - {checkOutDialog?.childName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('staffAttendance.whoPickedUp')} <span className="text-red-500">*</span></Label>
              <Input value={pickedUpBy} onChange={e => setPickedUpBy(e.target.value)} placeholder={t('staffAttendance.recipientName')} />
            </div>
            <div>
              <Label>{t('staffAttendance.relationship')} <span className="text-red-500">*</span></Label>
              <Select value={pickupRelationship} onValueChange={setPickupRelationship}>
                <SelectTrigger><SelectValue placeholder={t('staffAttendance.choose')} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mother">{t('staffAttendance.mother')}</SelectItem>
                  <SelectItem value="father">{t('staffAttendance.father')}</SelectItem>
                  <SelectItem value="driver">{t('staffAttendance.driver')}</SelectItem>
                  <SelectItem value="grandparent">{t('staffAttendance.grandparent')}</SelectItem>
                  <SelectItem value="guardian">{t('staffAttendance.guardian')}</SelectItem>
                  <SelectItem value="other">{t('staffAttendance.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('staffAttendance.notes')}</Label>
              <Textarea value={checkOutNotes} onChange={e => setCheckOutNotes(e.target.value)} placeholder={t('staffAttendance.optionalNotes')} />
            </div>
            <div>
              <Label>{t('staffAttendance.digitalSignature')}</Label>
              <SignaturePad value={signatureData} onChange={setSignatureData} clearLabel={t('staffAttendance.clear')} signedLabel={t('staffAttendance.signed')} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCheckOutDialog(null); resetCheckOutForm(); }}>{t('common.cancel')}</Button>
            <Button onClick={handleCheckOutSubmit} disabled={checkOut.isPending || !pickedUpBy || !pickupRelationship}>
              {checkOut.isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {t('staffAttendance.registerDeparture')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SignaturePad({ value, onChange, clearLabel, signedLabel }: { value: string; onChange: (data: string) => void; clearLabel: string; signedLabel: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function endDraw() {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL());
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={320}
        height={100}
        className="border rounded-md w-full cursor-crosshair bg-white touch-none"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="flex justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={clear}>{clearLabel}</Button>
        {value && <span className="text-xs text-green-600">✓ {signedLabel}</span>}
      </div>
    </div>
  );
}
