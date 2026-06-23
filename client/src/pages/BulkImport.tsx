import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type EntityType = 'children' | 'parents' | 'teachers' | 'staff';

const entityLabels: Record<EntityType, string> = {
  children: 'الأطفال',
  parents: 'أولياء الأمور',
  teachers: 'المعلمات',
  staff: 'الموظفين',
};

export default function BulkImport() {
  const [entityType, setEntityType] = useState<EntityType>('children');
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string>('');
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateMutation = trpc.bulkImport.validateFile.useMutation();
  const importMutation = trpc.bulkImport.importData.useMutation();
  const templateMutation = trpc.bulkImport.getTemplate.useMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('يرجى اختيار ملف Excel (.xlsx أو .xls)');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('حجم الملف يجب أن لا يتجاوز 5 ميجابايت');
      return;
    }

    setFile(selectedFile);
    setValidationResult(null);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setFileData(base64);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleValidate = async () => {
    if (!fileData) return;
    setIsValidating(true);
    try {
      const result = await validateMutation.mutateAsync({
        fileData,
        entityType,
      });
      setValidationResult(result);
      if (result.errorCount === 0) {
        toast.success(`تم التحقق بنجاح: ${result.validCount} سجل صالح`);
      } else {
        toast.warning(`${result.validCount} سجل صالح، ${result.errorCount} خطأ`);
      }
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التحقق');
    }
    setIsValidating(false);
  };

  const handleImport = async () => {
    if (!fileData) return;
    setIsImporting(true);
    try {
      const result = await importMutation.mutateAsync({
        fileData,
        entityType,
      });
      setImportResult(result);
      toast.success(`تم استيراد ${result.imported} سجل بنجاح`);
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الاستيراد');
    }
    setIsImporting(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const result = await templateMutation.mutateAsync({ entityType });
      const byteCharacters = atob(result.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم تحميل القالب بنجاح');
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تحميل القالب');
    }
  };

  const resetForm = () => {
    setFile(null);
    setFileData('');
    setValidationResult(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6" dir="rtl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">الاستيراد الجماعي من Excel</h1>
        <p className="text-gray-600 mt-2">استيراد بيانات الأطفال وأولياء الأمور والمعلمات والموظفين من ملفات Excel</p>
      </div>

      {/* Step 1: Select entity type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            الخطوة 1: اختر نوع البيانات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={entityType} onValueChange={(v) => { setEntityType(v as EntityType); resetForm(); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="children">الأطفال</SelectItem>
              <SelectItem value="parents">أولياء الأمور</SelectItem>
              <SelectItem value="teachers">المعلمات</SelectItem>
              <SelectItem value="staff">الموظفين</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
            <Download className="w-4 h-4 ml-2" />
            تحميل قالب {entityLabels[entityType]}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Upload file */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-emerald-600" />
            الخطوة 2: رفع الملف
          </CardTitle>
          <CardDescription>
            ارفع ملف Excel يحتوي على بيانات {entityLabels[entityType]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="space-y-2">
                <FileSpreadsheet className="w-12 h-12 mx-auto text-emerald-600" />
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} كيلوبايت</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <p className="text-gray-600">اضغط هنا لاختيار ملف أو اسحب الملف</p>
                <p className="text-sm text-gray-400">الحد الأقصى: 5 ميجابايت | الصيغ المدعومة: .xlsx, .xls</p>
              </div>
            )}
          </div>

          {file && !validationResult && (
            <Button onClick={handleValidate} disabled={isValidating} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700">
              {isValidating ? 'جاري التحقق...' : 'التحقق من البيانات'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Validation results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.errorCount === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              نتائج التحقق
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold">{validationResult.totalRows}</p>
                <p className="text-sm text-gray-600">إجمالي السجلات</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">{validationResult.validCount}</p>
                <p className="text-sm text-green-600">سجلات صالحة</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-700">{validationResult.errorCount}</p>
                <p className="text-sm text-red-600">أخطاء</p>
              </div>
            </div>

            {validationResult.errors.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2 text-red-700">الأخطاء:</h4>
                <div className="max-h-40 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الصف</TableHead>
                        <TableHead className="text-right">الحقل</TableHead>
                        <TableHead className="text-right">الخطأ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.errors.map((err: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell>{err.field}</TableCell>
                          <TableCell className="text-red-600">{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {validationResult.preview.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">معاينة البيانات (أول 10 سجلات):</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {validationResult.headers.map((h: string) => (
                          <TableHead key={h} className="text-right whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.preview.map((row: any, idx: number) => (
                        <TableRow key={idx}>
                          {validationResult.headers.map((h: string) => (
                            <TableCell key={h} className="whitespace-nowrap">{row[h] || '-'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <Button onClick={handleImport} disabled={isImporting} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {isImporting ? 'جاري الاستيراد...' : `استيراد ${validationResult.validCount} سجل`}
              </Button>
              <Button variant="outline" onClick={resetForm} className="flex-1">
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Import results */}
      {importResult && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-5 h-5" />
              تم الاستيراد بنجاح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold">{importResult.totalRows}</p>
                <p className="text-sm text-gray-600">الإجمالي</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-700">{importResult.imported}</p>
                <p className="text-sm text-green-600">تم استيرادها</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-yellow-700">{importResult.skipped}</p>
                <p className="text-sm text-yellow-600">تم تخطيها (مكررة)</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-700">{importResult.errorCount}</p>
                <p className="text-sm text-red-600">أخطاء</p>
              </div>
            </div>

            <Button variant="outline" onClick={resetForm} className="w-full mt-4">
              استيراد ملف آخر
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
