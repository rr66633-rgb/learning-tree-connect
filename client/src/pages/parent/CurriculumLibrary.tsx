import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileText, Download, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const LEVEL_LABELS: Record<string, string> = {
  nursery: "حضانة",
  kg1: "تمهيدي أول",
  kg2: "تمهيدي ثاني",
  kg3: "تمهيدي ثالث",
  all: "جميع المستويات",
};

export default function CurriculumLibrary() {
  const { data: curricula, isLoading } = trpc.curriculum.listForParent.useQuery();

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <BookOpen className="h-7 w-7 text-emerald-600" />
        <h1 className="text-2xl font-bold text-gray-800">مكتبة المناهج</h1>
      </div>

      <p className="text-gray-600">
        تصفح المناهج الدراسية المتاحة لمستوى طفلك. يمكنك عرض وتحميل الملفات مباشرة.
      </p>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        </div>
      ) : !curricula || curricula.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">لا توجد مناهج متاحة حالياً</h3>
              <p className="text-sm">سيتم إضافة المناهج الدراسية قريباً</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {curricula.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="bg-red-50 p-2.5 rounded-lg shrink-0">
                    <FileText className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base leading-tight">{item.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium">
                        {LEVEL_LABELS[item.level] || item.level}
                      </span>
                      {item.category && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                )}
                {item.fileSize && (
                  <p className="text-xs text-gray-400 mb-3">
                    حجم الملف: {(item.fileSize / 1024 / 1024).toFixed(1)} ميجابايت
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <ExternalLink className="h-4 w-4" />
                      عرض الملف
                    </Button>
                  </a>
                  <a href={item.fileUrl} download={item.fileName}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      تحميل
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
