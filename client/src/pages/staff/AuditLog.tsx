import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, User, FileText, CreditCard, Users, Calendar, Settings } from "lucide-react";

const ACTION_ICONS: Record<string, any> = {
  login: User,
  payment: CreditCard,
  invoice: FileText,
  child: Users,
  attendance: Calendar,
  settings: Settings,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-purple-100 text-purple-800",
  view: "bg-gray-100 text-gray-800",
};

export default function AuditLog() {
  const { data: logs, isLoading } = trpc.auditLog.list.useQuery({ limit: 100 });

  const getActionIcon = (action: string) => {
    const key = Object.keys(ACTION_ICONS).find(k => action.toLowerCase().includes(k));
    return key ? ACTION_ICONS[key] : Shield;
  };

  const getActionColor = (action: string) => {
    const key = Object.keys(ACTION_COLORS).find(k => action.toLowerCase().includes(k));
    return key ? ACTION_COLORS[key] : "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-green-700" />
          سجل المراجعة
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر العمليات</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log: any) => {
                const Icon = getActionIcon(log.action);
                return (
                  <div key={log.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{log.action}</span>
                        <Badge className={`text-xs ${getActionColor(log.action)}`}>
                          {log.resource}
                        </Badge>
                      </div>
                      {log.details && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <div className="text-left text-xs text-muted-foreground whitespace-nowrap">
                      <div>{new Date(log.createdAt).toLocaleDateString('ar-SA')}</div>
                      <div>{new Date(log.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">لا توجد عمليات مسجلة بعد</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
