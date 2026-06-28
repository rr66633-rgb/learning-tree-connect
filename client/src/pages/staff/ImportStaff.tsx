import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, ArrowRight, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { getCsrfToken } from "@/lib/csrf";

type ParsedRow = {
  row: number;
  data: Record<string, any>;
  errors: string[];
};

type ImportResult = {
  success: boolean;
  imported: number;
  failed: number;
  errors: { row: number; error: string }[];
};

export default function ImportStaff() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }, []);

  const validateAndSetFile = (f: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (!validTypes.includes(f.type) && !f.name.endsWith(".xlsx") && !f.name.endsWith(".xls") && !f.name.endsWith(".csv")) {
      toast.error("نوع الملف غير مدعوم. يرجى رفع ملف Excel (.xlsx) أو CSV");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً (الحد الأقصى 20 ميجابايت)");
      return;
    }
    setFile(f);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const handlePreview = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch("/api/import-staff?mode=preview", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { 'x-csrf-token': csrfToken },
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "فشل تحليل الملف");
        return;
      }
      const data = await res.json();
      setParsedData(data.rows);
      setTotalRows(data.total);
      setStep("preview");
    } catch (e) {
      toast.error("فشل الاتصال بالخادم");
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStep("importing");
    setImportProgress(10);
    const formData = new FormData();
    formData.append("file", file);
    try {
      setImportProgress(30);
      const csrfToken2 = await getCsrfToken();
      const res = await fetch("/api/import-staff", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { 'x-csrf-token': csrfToken2 },
      });
      setImportProgress(80);
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "فشل الاستيراد");
        setStep("preview");
        return;
      }
      const result = await res.json();
      setImportProgress(100);
      setImportResult(result);
      setStep("done");
      if (result.imported > 0) {
        toast.success(`تم استيراد ${result.imported} موظف بنجاح`);
      }
    } catch (e) {
      toast.error("فشل الاتصال بالخادم");
      setStep("preview");
    }
  };

  const handleDownloadTemplate = () => {
    window.open("/api/download-template/staff", "_blank");
  };

  const validRows = parsedData.filter(r => r.errors.length === 0);
  const errorRows = parsedData.filter(r => r.errors.length > 0);

  return (
    <div className="container max-w-5xl py-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">استيراد الموظفين من Excel</h1>
          <p className="text-muted-foreground mt-1">رفع ملف Excel أو CSV لإضافة موظفين بشكل جماعي</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/staff/staff-management")}>
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة
        </Button>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={step === "upload" ? "default" : "secondary"} className="gap-1">
          <span>1</span> رفع الملف
        </Badge>
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        <Badge variant={step === "preview" ? "default" : "secondary"} className="gap-1">
          <span>2</span> معاينة
        </Badge>
        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        <Badge variant={step === "importing" || step === "done" ? "default" : "secondary"} className="gap-1">
          <span>3</span> استيراد
        </Badge>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                رفع ملف الموظفين
              </CardTitle>
              <CardDescription>
                ارفع ملف Excel (.xlsx) أو CSV يحتوي على بيانات الموظفين. يمكنك تحميل القالب الجاهز أدناه.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Download template */}
              <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                تحميل قالب Excel جاهز
              </Button>

              {/* Drag and drop area */}
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
                  dragActive ? "border-primary bg-primary/5" : file ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="font-medium text-green-700 dark:text-green-400">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} كيلوبايت
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 ml-1" />
                      إزالة
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                    <p className="font-medium">اسحب الملف هنا أو اضغط للاختيار</p>
                    <p className="text-sm text-muted-foreground">
                      يدعم: Excel (.xlsx, .xls) و CSV - الحد الأقصى 20 ميجابايت
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <div className="flex justify-end">
                  <Button onClick={handlePreview} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    معاينة البيانات
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">تعليمات الاستيراد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">1</Badge>
                <span>حمّل القالب الجاهز واملأه ببيانات الموظفين</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">2</Badge>
                <span>الحقول المطلوبة: الاسم الكامل، رقم الجوال، المسمى الوظيفي</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">3</Badge>
                <span>المسميات الوظيفية المدعومة: معلمة، مشرفة، مديرة، مساعدة، إدارية، أخصائية، محاسبة، استقبال، سائق</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">4</Badge>
                <span>أنواع العقود: دوام كامل، دوام جزئي، عقد، مؤقت</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="shrink-0">5</Badge>
                <span>التواريخ بصيغة: YYYY-MM-DD (مثال: 2024-01-15)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold">{totalRows}</p>
                <p className="text-sm text-muted-foreground">إجمالي الصفوف</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-green-600">{validRows.length}</p>
                <p className="text-sm text-muted-foreground">صالحة للاستيراد</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-3xl font-bold text-red-600">{errorRows.length}</p>
                <p className="text-sm text-muted-foreground">بها أخطاء</p>
              </CardContent>
            </Card>
          </div>

          {/* Error rows */}
          {errorRows.length > 0 && (
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-base text-red-600 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  صفوف بها أخطاء ({errorRows.length})
                </CardTitle>
                <CardDescription>هذه الصفوف لن يتم استيرادها - يرجى تصحيحها في الملف</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">الصف</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الأخطاء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorRows.slice(0, 20).map((row) => (
                        <TableRow key={row.row}>
                          <TableCell className="font-mono">{row.row}</TableCell>
                          <TableCell>{row.data.fullNameAr || row.data.fullNameEn || "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {row.errors.map((err, i) => (
                                <Badge key={i} variant="destructive" className="text-xs">{err}</Badge>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Valid rows preview */}
          {validRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  معاينة البيانات الصالحة ({validRows.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">الصف</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الجوال</TableHead>
                        <TableHead>الوظيفة</TableHead>
                        <TableHead>القسم</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.slice(0, 30).map((row) => (
                        <TableRow key={row.row}>
                          <TableCell className="font-mono">{row.row}</TableCell>
                          <TableCell className="font-medium">{row.data.fullNameAr || row.data.fullNameEn}</TableCell>
                          <TableCell dir="ltr" className="text-left">{row.data.mobile}</TableCell>
                          <TableCell>{row.data.jobTitle}</TableCell>
                          <TableCell>{row.data.department || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.data.status || "نشط"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {validRows.length > 30 && (
                    <p className="text-center text-sm text-muted-foreground mt-3">
                      ... و {validRows.length - 30} صف آخر
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => { setStep("upload"); setParsedData([]); }}>
              <ArrowRight className="ml-2 h-4 w-4" />
              رجوع
            </Button>
            <div className="flex gap-2">
              {validRows.length > 0 && (
                <Button onClick={handleImport} className="gap-2">
                  <Upload className="h-4 w-4" />
                  استيراد {validRows.length} موظف
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Importing */}
      {step === "importing" && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-lg font-medium">جاري استيراد البيانات...</p>
            <Progress value={importProgress} className="max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground">يرجى الانتظار وعدم إغلاق الصفحة</p>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Done */}
      {step === "done" && importResult && (
        <div className="space-y-4">
          <Card className="border-green-200 dark:border-green-900">
            <CardContent className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold">تم الاستيراد بنجاح</h2>
              <div className="flex justify-center gap-6">
                <div>
                  <p className="text-3xl font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-sm text-muted-foreground">تم استيرادهم</p>
                </div>
                {importResult.failed > 0 && (
                  <div>
                    <p className="text-3xl font-bold text-red-600">{importResult.failed}</p>
                    <p className="text-sm text-muted-foreground">فشل استيرادهم</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {importResult.errors.length > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-900">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  صفوف لم يتم استيرادها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">الصف</TableHead>
                        <TableHead>السبب</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.errors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono">{err.row}</TableCell>
                          <TableCell className="text-red-600">{err.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => { setStep("upload"); setFile(null); setParsedData([]); setImportResult(null); }}>
              استيراد ملف آخر
            </Button>
            <Button onClick={() => navigate("/staff/staff-management")}>
              الذهاب لدليل الموظفين
              <ArrowLeft className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
