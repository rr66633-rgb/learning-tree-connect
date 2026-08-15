import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Mail, CheckCircle, XCircle, Clock, Search, Loader2, AlertCircle } from "lucide-react";

export default function EmailLogs() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  
  const { data: logs, isLoading, isError, error } = trpc.emailLogs.list.useQuery(
    { search, type: typeFilter },
    { retry: 1, retryDelay: 1000 }
  );

  const typeLabels: Record<string, string> = {
    invoice: "فاتورة",
    receipt: "إيصال دفع",
    welcome: "ترحيب",
    announcement: "إعلان",
    otp: "رمز تحقق",
    password_reset: "استعادة كلمة المرور",
    reminder: "تذكير",
    notification: "إشعار",
    general: "عام",
  };

  const statusIcon = (status: string) => {
    if (status === "sent") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-yellow-500" />;
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-6 h-6 text-blue-500" />
        <h1 className="text-2xl font-bold">سجل الإيميلات</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="بحث بالإيميل أو الموضوع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="all">كل الأنواع</option>
          <option value="invoice">فاتورة</option>
          <option value="receipt">إيصال دفع</option>
          <option value="welcome">ترحيب</option>
          <option value="announcement">إعلان</option>
          <option value="otp">رمز تحقق</option>
          <option value="password_reset">استعادة كلمة المرور</option>
          <option value="reminder">تذكير</option>
        </select>
      </div>

      {/* Error State */}
      {isError && (
        <div className="text-center py-10 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-600 font-medium">حدث خطأ في تحميل السجلات</p>
          <p className="text-red-500 text-sm mt-1">{error?.message || "يرجى المحاولة لاحقاً"}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-10">
          <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-2 animate-spin" />
          <p className="text-gray-500">جاري تحميل السجلات...</p>
        </div>
      )}

      {/* Stats */}
      {logs && !isError && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-green-600">{logs.stats?.sent || 0}</div>
            <div className="text-xs text-green-700">مُرسل</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-red-600">{logs.stats?.failed || 0}</div>
            <div className="text-xs text-red-700">فشل</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{logs.stats?.total || 0}</div>
            <div className="text-xs text-blue-700">الإجمالي</div>
          </div>
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && logs && (
        !logs.items?.length ? (
          <div className="text-center py-10 text-gray-500">لا توجد سجلات بريد إلكتروني بعد</div>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-right">الحالة</th>
                  <th className="px-3 py-2 text-right">المستلم</th>
                  <th className="px-3 py-2 text-right">الموضوع</th>
                  <th className="px-3 py-2 text-right">النوع</th>
                  <th className="px-3 py-2 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((log: any) => (
                  <tr key={log.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{statusIcon(log.status)}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-xs">{log.recipientName || "-"}</div>
                      <div className="text-xs text-gray-500">{log.recipientEmail}</div>
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate">{log.subject}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                        {typeLabels[log.type] || log.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleDateString("ar-SA")}
                      <br />
                      {new Date(log.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
